# MeshSwitch

Piccola app Total.js 5 con un interruttore al centro della pagina:

- **ON**  → esegue `CONF.cmd_on`  (default `pm2 start meshcentral`)
- **OFF** → esegue `CONF.cmd_off` (default `pm2 stop meshcentral`)

Funzioni:

- Lo stato del servizio viene controllato dal server ogni `status_interval` secondi (`pm2 jlist`) e inviato ai browser via **WebSocket**: l'interruttore si aggiorna da solo, anche se MeshCentral viene avviato/fermato da fuori.
- **Spegnimento automatico**: dopo `autooff` secondi dall'accensione (default 3600 = 60 min) il server viene fermato d'ufficio. Il conto alla rovescia è visibile sotto l'interruttore. `0` lo disattiva.
- **Apertura pagina**: dopo l'accensione, trascorsi `open_delay` secondi (default 20), si apre `open_url` in una nuova scheda (`_blank`). Sotto l'interruttore c'è inoltre un link a `open_url`, visibile solo quando il server è acceso.

## Struttura

```
meshswitch/
├── on.js                  # avvio (porta 6990)
├── update.sh              # aggiornamento dall'ultima release
├── config                 # comandi parametrizzati
├── package.json
├── controllers/default.js # route e esecuzione comandi
└── views/
    ├── layout.html
    └── index.html         # interruttore
```

## Installazione sul server

Prima installazione (scarica ed esegue lo script di aggiornamento dell'ultima release stabile):

```bash
curl -fsSL https://github.com/verderam/meshswitch/releases/latest/download/update.sh | APP_DIR=/opt/meshswitch bash
```

Lo script installa l'app in `APP_DIR`, esegue `npm install` e la avvia con PM2 (`meshswitch`).

Avvio manuale:

```bash
node on.js            # produzione (release, default)
node on.js --debug    # debug
```

Poi apri `http://<server>:6990/`.

## Aggiornamenti

Ogni release pubblicata su GitHub riceve, tramite GitHub Actions, tre allegati con nome fisso, sempre raggiungibili all'ultima release stabile:

| File | Link stabile |
|---|---|
| Versione | https://github.com/verderam/meshswitch/releases/latest/download/version.json |
| Pacchetto | https://github.com/verderam/meshswitch/releases/latest/download/meshswitch.tar.gz |
| Script | https://github.com/verderam/meshswitch/releases/latest/download/update.sh |

`version.json` contiene `version`, `tag`, `url` del pacchetto e `sha256`.

`update.sh` confronta `version` con quella di `package.json` locale e, se diversa, scarica il pacchetto, verifica lo sha256, aggiorna i file, esegue `npm install` e riavvia il processo PM2.

```bash
/opt/meshswitch/update.sh            # aggiorna se serve
/opt/meshswitch/update.sh --check    # mostra solo le versioni
/opt/meshswitch/update.sh --force    # reinstalla comunque
```

Il file `config` locale non viene mai sovrascritto: se quello nuovo è diverso viene salvato come `config.new`.

Controllo automatico ogni 15 minuti (crontab dell'utente che gestisce PM2):

```
*/15 * * * * PATH=/usr/local/bin:/usr/bin:/bin /opt/meshswitch/update.sh >> /var/log/meshswitch-update.log 2>&1
```

Se Node/PM2 sono installati con nvm, aggiungi al `PATH` la cartella `bin` di nvm.

### Pubblicare una nuova versione

Su GitHub: **Releases → Draft a new release**, tag `vX.Y.Z`, **Publish**. La versione nel pacchetto viene presa dal tag. Le pre-release e le bozze non vengono considerate "latest".

## Note

- L'app va eseguita con lo stesso utente che gestisce il processo PM2 `meshcentral`, altrimenti `pm2` non vede il processo.
- Lo spegnimento automatico vale anche se MeshCentral è stato acceso fuori dall'app (il conteggio parte da quando MeshSwitch rileva l'accensione) e riparte se l'app viene riavviata.
- Non c'è autenticazione: chiunque raggiunga la porta 6990 può avviare/fermare MeshCentral. Limita l'accesso (firewall, `options.ip = '127.0.0.1'` + reverse proxy con login, VPN).
