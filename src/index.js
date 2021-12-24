const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config') });

const fs = require('fs');
const shell = require("shelljs");
const chalk = require('chalk');
const cmdType = process.argv[2];

if (cmdType){
	console.log('Start: ', new Date().toString());
	console.log('Service: ' + cmdType);
}

switch (cmdType) {
	case 'pm2-restart-all':
		reload_all();
		break;
	case 'pm2-restart':
		var pm2Names = process.argv.slice(3);
		for (let pm2Name of pm2Names) {
			checkupdate_and_restart_pm2(pm2Name);
		}
		break;
	case 'pm2-list':
		var pm2Name = process.argv[3] ? process.argv[3] : '';
		listPM2(pm2Name);
		break;
	default:
		console.log('Start crontab: ', new Date().toString());
		const cron = require('./crontab');
		break;
}

//
// Function Zone =========================================================================
//
function reload_all() {
	let processList = getPM2Process('');
	let lastPm2Name = '';
	for (let row of processList) {
		if (lastPm2Name != row['name']) {
			lastPm2Name = row['name'];
			var fileName = row['pm2_env']['pm_cwd'] + '/auto_reload';
			if (row['pm2_env']['status'] != 'online') {
				console.log(row['name'], ':', chalk.yellow.bold.underline(row['pm2_env']['status']));
			} else if ((fs.existsSync(fileName))) {
				checkupdate_and_restart_pm2(row['name'], 'auto_reload');
			} else {
				fileName = row['pm2_env']['pm_cwd'] + '/auto-reload';
				if ((fs.existsSync(fileName))) {
					checkupdate_and_restart_pm2(row['name'], 'auto-reload');
				}
			}
		}
	}
}

function checkupdate_and_restart_pm2(pm2Name, fileCheck = 'auto_reload') {
	let processList = getPM2Process(pm2Name);
	var fileName = processList[0]['pm2_env']['pm_cwd'] + '/' + fileCheck;

	if (!(fs.existsSync(fileName))) {
		console.log(pm2Name, ':', chalk.red.bold(`Error: not found '${fileName}'.`));
		return;
	}

	try {
		const data = fs.readFileSync(fileName, 'utf8')
		if (data && data.trim() == '1') {
			restart_pm2(pm2Name);

			fs.writeFile(fileName, '0', err => {
				if (err) {
					console.error(err)
				}
			})
		} else {
			console.log(pm2Name, ':', chalk.green.bold('AutoLoad=0, File auto-load was restarted.'));
		}
	} catch (err) {
		console.log(pm2Name, ':', chalk.red.bold('File auto-load not found.'));
		console.error(err)
	}
}

function restart_pm2(pm2Name) {
	console.log("Restart PM2 '" + pm2Name + "' " + (new Date().toString()));
	let processList = getPM2Process(pm2Name);
	for (let row of processList) {
		console.log('  -> restarting process ' + row['pm_id']);
		var jlist = shell.exec('pm2 restart ' + row['pm_id'] + ' >null', {
			silent: true
		});
	}
	listPM2(pm2Name)
}

function listPM2(pm2Name) {
	let processList = getPM2Process(pm2Name);
	console.log('='.repeat(100));
	console.log('File: ', processList[0]['pm2_env']['pm_exec_path']);
	console.log('Command: ', processList[0]['pm2_env']['SUDO_COMMAND']);
	console.log('Node version: ', processList[0]['pm2_env']['node_version']);
	console.log('User: ', processList[0]['pm2_env']['USER']);
	console.log('='.repeat(100));

	let mem = 0;
	let cpu = 0;
	for (let row of processList) {
		mem += +row['monit']['memory'];
		cpu += +row['monit']['cpu'];
		console.log(
			row['pm2_env']['status'], row['pid'], row['name'], row['pm_id'], new Date(row['pm2_env']['pm_uptime']).toString(), 'MEM:' + (row['monit']['memory'] / 1024 / 1024).toFixed(2) + 'MB', 'CPU:' + (row['monit']['cpu']) + '%'
		);
	}
	console.log('='.repeat(100));
	console.log('Total ' +
		'MEM:' + (mem / 1024 / 1024).toFixed(2) + 'MB', 'CPU:' + cpu.toFixed(2) + '%'
	);
}

function getPM2Process(pm2Name) {
	var shell = require("shelljs");
	var jlist = shell.exec('sudo pm2 jlist', {
		silent: true
	});

	// Save for other API
	fs.writeFile('/app_data/public/api/hospdata/pm2_list', jlist, err => {
		if (err) {
			console.error(err)
		}
	})

	var pm2Process = jlist && jlist !== '' ? JSON.parse(jlist) : [];

	if (pm2Name) {
		let processList = [];
		for (let row of pm2Process) {
			if (row.name == pm2Name) {
				processList.push(row);
			}
		}

		return processList;
	} else {
		return pm2Process;
	}
}