// ===================================================
// MeshSwitch - Total.js v5
// Avvio: node on.js   (release, default)
//        node on.js --debug   (debug)
// ===================================================

require('total5');

const options = {};

options.port = 6990;
// options.ip = '127.0.0.1'; // decommenta per ascoltare solo in locale
options.release = !process.argv.includes('--debug');

Total.run(options);
