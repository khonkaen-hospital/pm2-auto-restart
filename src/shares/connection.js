const mysql = require('mysql2');

// const connection = mysql.createPool({
const connection = mysql.createConnection({
	host: process.env.HIS_DB_HOST,
	port: process.env.HIS_DB_PORT || 3306,
	user: process.env.HIS_DB_USER,
	password: process.env.HIS_DB_PASSWD,
	database: process.env.HIS_DB_DBNAME
});
module.exports=connection;