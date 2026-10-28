#!/usr/bin/env bash
# ===================================================
# MeshSwitch - aggiornamento dall'ultima release stabile
#
# Controlla version.json dell'ultima release e, se la versione è diversa
# da quella installata (package.json), scarica il pacchetto, ne verifica
# lo sha256, aggiorna i file e riavvia l'app con PM2.
#
# Uso:   ./update.sh            aggiorna se serve
#        ./update.sh --check    mostra solo le versioni
#        ./update.sh --force    reinstalla anche se la versione è uguale
#
# Variabili (opzionali):
#   APP_DIR      cartella dell'app   (default: cartella di questo script)
#   PM2_NAME     nome processo PM2   (default: meshswitch)
#   UPDATE_URL   URL di version.json (default: ultima release su GitHub)
#
# Il file "config" locale non viene mai sovrascritto: se quello della
# nuova versione è diverso viene salvato come "config.new".
# ===================================================

main() {
	set -euo pipefail

	local REPO="verderam/meshswitch"
	local SELF_DIR
	SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
	local APP_DIR="${APP_DIR:-$SELF_DIR}"
	local PM2_NAME="${PM2_NAME:-meshswitch}"
	local UPDATE_URL="${UPDATE_URL:-https://github.com/$REPO/releases/latest/download/version.json}"
	local MODE="${1:-}"

	log() { echo "[$(date '+%F %T')] $*"; }

	for cmd in curl tar node npm sha256sum; do
		command -v "$cmd" >/dev/null || { log "Comando mancante: $cmd"; exit 1; }
	done

	mkdir -p "$APP_DIR"

	# Un solo aggiornamento alla volta
	if command -v flock >/dev/null; then
		exec 9>"$APP_DIR/.update.lock"
		flock -n 9 || { log "Aggiornamento già in corso"; exit 0; }
	fi

	# Versione remota
	local remote
	remote="$(curl -fsSL "$UPDATE_URL")" || { log "Impossibile leggere $UPDATE_URL"; exit 1; }

	field() {
		printf '%s' "$remote" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s)[process.argv[1]];process.stdout.write(v==null?"":String(v))})' "$1"
	}

	local rversion rurl rsha
	rversion="$(field version)"
	rurl="$(field url)"
	rsha="$(field sha256)"

	[ -n "$rversion" ] && [ -n "$rurl" ] || { log "version.json non valido"; exit 1; }

	# Versione locale
	local lversion="nessuna"
	[ -f "$APP_DIR/package.json" ] && lversion="$(node -p "require('$APP_DIR/package.json').version" 2>/dev/null || echo nessuna)"

	log "Installata: $lversion - Ultima stabile: $rversion"

	[ "$MODE" = "--check" ] && exit 0

	if [ "$rversion" = "$lversion" ] && [ "$MODE" != "--force" ]; then
		log "Nessun aggiornamento necessario"
		exit 0
	fi

	# Download e verifica
	local tmp
	tmp="$(mktemp -d)"
	trap "rm -rf '$tmp'" EXIT

	log "Download $rurl"
	curl -fsSL -o "$tmp/meshswitch.tar.gz" "$rurl"

	if [ -n "$rsha" ]; then
		echo "$rsha  $tmp/meshswitch.tar.gz" | sha256sum -c --quiet - || { log "sha256 non corrispondente, aggiornamento annullato"; exit 1; }
	fi

	tar -xzf "$tmp/meshswitch.tar.gz" -C "$tmp"
	local src="$tmp/meshswitch"
	[ -f "$src/on.js" ] || { log "Pacchetto non valido"; exit 1; }

	# Config locale preservato
	if [ -f "$APP_DIR/config" ]; then
		if ! cmp -s "$src/config" "$APP_DIR/config"; then
			cp "$src/config" "$APP_DIR/config.new"
			log "Config locale mantenuto; quello della nuova versione è in config.new"
		fi
		rm -f "$src/config"
	fi

	# Aggiornamento file
	cp -a "$src/." "$APP_DIR/"
	chmod +x "$APP_DIR/update.sh" 2>/dev/null || true

	log "Installazione dipendenze"
	(cd "$APP_DIR" && npm install --omit=dev --no-audit --no-fund --loglevel=error)

	# Riavvio
	if command -v pm2 >/dev/null; then
		if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
			pm2 restart "$PM2_NAME" --update-env >/dev/null
			log "Riavviato $PM2_NAME"
		else
			(cd "$APP_DIR" && pm2 start on.js --name "$PM2_NAME" >/dev/null)
			pm2 save >/dev/null 2>&1 || true
			log "Avviato $PM2_NAME"
		fi
	else
		log "PM2 non trovato: riavvia l'app manualmente"
	fi

	log "Aggiornato a $rversion"
}

# Tutto è dentro main(): bash legge l'intera funzione prima di eseguirla,
# quindi lo script può sovrascrivere se stesso durante l'aggiornamento.
main "$@"
exit $?
