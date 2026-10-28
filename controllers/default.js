const Exec = require('child_process').exec;

exports.install = function() {
	ROUTE('GET /', index);
	ROUTE('GET /api/status/', status);
	ROUTE('POST /api/on/', turnon);
	ROUTE('POST /api/off/', turnoff);
};

function index($) {
	$.view('index');
}

function run(command, callback) {
	Exec(command, { timeout: 30000 }, function(err, stdout, stderr) {
		callback(err, (stdout || '').toString(), (stderr || '').toString());
	});
}

function execute($, command) {
	run(command, function(err, stdout, stderr) {
		if (err)
			$.json({ success: false, command: command, error: stderr.trim() || err.message });
		else
			$.json({ success: true, command: command, output: stdout.trim() });
	});
}

function turnon($) {
	execute($, CONF.cmd_on);
}

function turnoff($) {
	execute($, CONF.cmd_off);
}

function status($) {
	run(CONF.cmd_status, function(err, stdout) {

		if (err) {
			$.json({ success: false, online: false, error: err.message });
			return;
		}

		let online = false;

		try {
			const list = JSON.parse(stdout);
			const proc = list.find(item => item.name === CONF.pm2_process);
			online = !!(proc && proc.pm2_env && proc.pm2_env.status === 'online');
		} catch (e) {
			$.json({ success: false, online: false, error: 'Output di stato non valido' });
			return;
		}

		$.json({ success: true, online: online });
	});
}
