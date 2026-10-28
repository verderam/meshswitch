# MeshSwitch

Piccola app Total.js 5 con un interruttore al centro della pagina:

- **ON**  → esegue `CONF.cmd_on`  (default `pm2 start meshcentral`)
- **OFF** → esegue `CONF.cmd_off` (default `pm2 stop meshcentral`)

All'apertura della pagina lo stato dell'interruttore viene letto da `pm2 jlist`.

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
- Non c'è autenticazione: chiunque raggiunga la porta 6990 può avviare/fermare MeshCentral. Limita l'accesso (firewall, `options.ip = '127.0.0.1'` + reverse proxy con login, VPN).
