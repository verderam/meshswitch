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
├── config                 # comandi parametrizzati
├── package.json
├── controllers/default.js # route e esecuzione comandi
└── views/
    ├── layout.html
    └── index.html         # interruttore
```

## Avvio

```bash
npm install
node on.js            # debug
node on.js --release  # produzione
```

Poi apri `http://<server>:6990/`.

Per tenerla attiva con PM2:

```bash
pm2 start on.js --name meshswitch -- --release
```

## Note

- L'app va eseguita con lo stesso utente che gestisce il processo PM2 `meshcentral`, altrimenti `pm2` non vede il processo.
- Lo spegnimento automatico vale anche se MeshCentral è stato acceso fuori dall'app (il conteggio parte da quando MeshSwitch rileva l'accensione) e riparte se l'app viene riavviata.
- Non c'è autenticazione: chiunque raggiunga la porta 6990 può avviare/fermare MeshCentral. Limita l'accesso (firewall, `options.ip = '127.0.0.1'` + reverse proxy con login, VPN).
