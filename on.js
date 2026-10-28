// ===================================================
// MeshSwitch - Total.js v5
// Avvio: node on.js   (oppure: node on.js --release)
// ===================================================

require('total5');

const options = {};

options.port = 6990;
// options.ip = '127.0.0.1'; // decommenta per ascoltare solo in locale
options.release = process.argv.includes('--release');

Total.run(options);
