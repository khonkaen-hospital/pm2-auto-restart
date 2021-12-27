const connection = require('./shares/connection');
const moment = require('moment');
var cron = require('node-cron');

var userList = process.env.USER_LIST.split(',');
var secondRange = process.env.TIME_WAIT_RANGE.split(',');

console.log('crontab', process.env.TIMER);
console.log('user', userList);
console.log('remove time sleep in range ', secondRange);

cron.schedule(process.env.TIMER, () => {
  clearConnection();
});

async function clearConnection(){
  console.log("=".repeat(100));
	connection.query('SHOW processlist', (err, results, fields) => {
			var seq = 0;
			for (let row of results){
				if (row['Command'] == "Sleep" && userList.indexOf(row['User'])>=0 && row['Time']>=+secondRange[0] && row['Time']<=+secondRange[1]) {
					connection.query(`KILL ${row['Id']}`, (err, results, fields) => {
						seq += 1;
						console.log(seq, '.'+moment().format('HH:mm:ss'), ' user:'+row['User'], ' ID:'+row['Id'],' time:'+row['Time'],
								" clear result: ", (results? results.serverStatus : (err? err.code:' undefined')));
					});
				}
			}
		}
	);

}

module.exports=cron;