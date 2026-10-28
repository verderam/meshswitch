const Exec = require('child_process').exec;

// Stato condiviso del servizio
const STATE = {
	online: null,     // null = sconosciuto, true/false = ultimo stato letto
	offat: null,      // timestamp (ms) dello spegnimento automatico programmato
	error: null       // ultimo errore di lettura stato
};

var socket = null;    // istanza WebSocket di Total.js (null se nessun client)
var busy = false;     // evita controlli sovrapposti

exports.install = function() {
	ROUTE('GET /', index);
	ROUTE('GET /api/status/', status);
	ROUTE('POST /api/on/', turnon);
	ROUTE('POST /api/off/', turnoff);
	ROUTE('SOCKET /', realtime);

	// Controllo periodico dello stato
	const interval = Math.max(1, +CONF.status_interval || 5) * 1000;
	setInterval(refresh, interval);
	setTimeout(refresh, 500);
};

// ---------------------------------------------------
// Utility
// ---------------------------------------------------

function autooff() {
	// secondi; 0 = disattivato
	return CONF.autooff == null ? 3600 : (+CONF.autooff || 0);
}

function run(command, callback) {
	Exec(command, { timeout: 30000 }, function(err, stdout, stderr) {
		callback(err, (stdout || '').toString(), (stderr || '').toString());
	});
}

function payload() {
	return {
		type: 'status',
		online: STATE.online === true,
		known: STATE.online !== null,
		error: STATE.error,
		remaining: STATE.offat ? Math.max(0, Math.round((STATE.offat - Date.now()) / 1000)) : null
	};
}

function broadcast() {
	socket && socket.send(payload());
}

function schedule() {
	const sec = autooff();
	STATE.offat = sec > 0 ? Date.now() + sec * 1000 : null;
}

// Imposta il nuovo stato e gestisce lo spegnimento automatico
function setstate(online, error) {

	const changed = STATE.online !== online || STATE.error !== error;

	if (online && STATE.online !== true && !STATE.offat)
		schedule();       // passaggio a ON (anche se acceso fuori dall'app)

	if (!online)
		STATE.offat = null;

	STATE.online = online;
	STATE.error = error;

	changed && broadcast();
}

// Legge lo stato da PM2
function check(callback) {
	run(CONF.cmd_status, function(err, stdout) {

		if (err) {
			callback(err.message);
			return;
		}

		try {
			const list = JSON.parse(stdout);
			const proc = list.find(item => item.name === CONF.pm2_process);
			callback(null, !!(proc && proc.pm2_env && proc.pm2_env.status === 'online'));
		} catch (e) {
			callback('Output di stato non valido');
		}
	});
}

function refresh(callback) {

	if (busy) {
		callback && callback();
		return;
	}

	busy = true;

	check(function(err, online) {

		busy = false;

		if (err)
			setstate(STATE.online === true, err);
		else
			setstate(online, null);

		// Spegnimento automatico scaduto
		if (STATE.online && STATE.offat && Date.now() >= STATE.offat) {
			STATE.offat = null;
			console.log('[MeshSwitch] Spegnimento automatico dopo', autooff(), 'secondi');
			run(CONF.cmd_off, function(err, stdout, stderr) {
				err && console.error('[MeshSwitch] Errore spegnimento automatico:', stderr.trim() || err.message);
				refresh();
			});
		}

		callback && callback();
	});
}

// ---------------------------------------------------
// Azioni
// ---------------------------------------------------

function index($) {
	$.view('index');
}

function execute($, command, on) {
	run(command, function(err, stdout, stderr) {

		if (err) {
			$.json({ success: false, command: command, error: stderr.trim() || err.message });
			refresh();
			return;
		}

		// Accensione manuale: il conteggio riparte da adesso
		if (on)
			schedule();
		else
			STATE.offat = null;

		refresh(function() {
			broadcast();
			$.json({ success: true, command: command, output: stdout.trim(), status: payload() });
		});
	});
}

function turnon($) {
	execute($, CONF.cmd_on, true);
}

function turnoff($) {
	execute($, CONF.cmd_off, false);
}

function status($) {
	$.json(payload());
}

function realtime($) {

	socket = $;

	$.autodestroy(function() {
		socket = null;
	});

	// Ogni nuovo client riceve subito lo stato attuale
	$.on('open', function(client) {
		client.send(payload());
	});
}
