const connection = require('./shares/connection');
const moment = require('moment');
const lodash = require('lodash');
var cron = require('node-cron');

var userList = process.env.USER_LIST.split(',');
var secondRange = process.env.TIME_WAIT_RANGE.split(',');

console.log('crontab', process.env.TIMER);
console.log('user', userList);
console.log('remove time sleep in range ', secondRange);

cron.schedule(process.env.TIMER, () => {
  let second = +moment().get('seconds');
  console.log(moment().format('HH:mm:ss'));
  clearConnection();
  if (second == 0) {
    extractResult();
  }
});

async function clearConnection() {
  console.log("=".repeat(100));
  connection.query('SHOW processlist', (err, results, fields) => {
    var seq = 0;
    for (let row of results) {
      if (row['Command'] == "Sleep" && userList.indexOf(row['User']) >= 0 && row['Time'] >= +secondRange[0] && row['Time'] <= +secondRange[1]) {
        connection.query(`KILL ${row['Id']}`, (err, results, fields) => {
          seq += 1;
          console.log(seq, '.' + moment().format('HH:mm:ss'), ' user:' + row['User'], ' ID:' + row['Id'], ' time:' + row['Time'],
            " clear result: ", (results ? results.serverStatus : (err ? err.code : ' undefined')));
        });
      }
    }
  }
  );

}

async function extractResult() {
  console.log("=".repeat(100));
  var labCode = "'04730','04738'";
  
  var date1 = moment().subtract(1, 'days').format('YYYY-MM-DD HH:mm:ss');
  var date2 = moment().format('YYYY-MM-DD HH:mm:ss');

  // var date1 = '2019-10-01 00:00:00';
  // var date2 = '2020-01-01 23:59:59';

  var where = `lab_code in (${labCode})` +
    ` and date_result BETWEEN '${date1}' and '${date2}'`;
  var sql = `select * from hospdata.view_lab_result where ${where}`;
  connection.query(sql, (err, results, fields) => {
    var rows = results;
    console.log('Lab result: ', rows.length);
    for (let row of rows) {
      var sqlResult = `select result_ref from hospdata.lab_result_report where result_ref=${row.ref} limit 1`;
      connection.query(sqlResult, (err, results, fields) => {
        var existRows = results;
        if (!existRows || !existRows.length) {
          row.resultText = '';
          row.resultArray = row.result_text.split(/\r|\n|\r\n|\n\r/);
          const ind = lodash.findIndex(row.resultArray, function (o) {
            return o.search('RT-PCR for COVID-19 Result') >= 0 ||
              o.search('RT-PCR for COVID-19 2 genes  :') >= 0;
          });
          if (ind >= 0) {
            const rs = row.resultArray[ind].trim().split(':');
            row.resultText = rs[1] ? rs[1].trim() : '';
          }

          row.resultText = row.resultText.toLowerCase() == 'inconclusive result' ? 'Inconclusive' : row.resultText
          // console.log('resultText', row.ref, row.resultText);
          if (row.report_detail) {
            row.report_detail = JSON.parse(row.report_detail);
            // console.log('report_detail', row.report_detail);
          }
          if (!row.report_detail || !row.report_detail.ct_1 || !row.report_detail.gene_code_1) {
            getDetail(row);
          }
          // console.log('result ', row.ref, row);
          var sqlInsert = `INSERT INTO hospdata.lab_result_report (result_ref, result, detail) VALUES (${row.ref}, '${row.resultText}', '${JSON.stringify(row.report_detail)}')`;
          connection.query(sqlInsert, (err, results, fields) => {
            if (err){
              console.log(row.ref, 'save error:', err);
            } else {
              console.log(row.ref, 'save result: OK');
            }
          });
        }
      });

    }
  }
  );

}

async function getDetail(row) {
  // ค้นหา Objective, ct1-2, gene1-3 ============================================================

  var ctList = ['ct of orf-1ab gene', 'ct of e-gene', 'ct of n gene', 'ct of n2 gene', 'ct of rdrp gene'];
  var resultList = ['', 'not detected', 'detected', 'inconclusive', 'invalid', 'reject', 'negative', 'positive', 'b.1.525', 'b.1.526'];

  let objective = 6;
  let ct = [{ ct: '', gene: '' }, { ct: '', gene: '' }, { ct: '', gene: '' }];
  let nCt = -1;
  let reporter = row.name;
  let approver = row.name;
  let results_date = row.date_result;
  let approve_date = row.date_result;
  const resultLine = row.result_text.split(/\r|\n/);

  for (let line of resultLine) {
    if (line) {
      line = line.trim();
      const lineData = line ? line.split(':') : ['', '', '', ''];
      lineData[0] = lineData[0].trim();
      if (lineData[1]) lineData[1] = lineData[1].trim();
      let lineText = [lineData[0].toLowerCase(), lineData[1], lineData[2], lineData[3]];

      if (!lineText || lineText.length < 2) {
      } else if (lineText[0].substr(0, 13) == 'patient group') {
        const objtiveText = lineText[1].trim();
        if (objtiveText == 'acf' || objtiveText == 'active case finding') {
          objective = 5
        } else if (objtiveText == 'pui') {
          objective = 2
        } else if (objtiveText == 'hi' || objtiveText == 'ci') {
          objective = 4
        } else if (objtiveText == 'pre-op' || objtiveText == 'pre op') {
          objective = 7
        } else if (['', 'contact'].indexOf(objtiveText) > 0) {
          objective = 3
        }
      } else if (ctList.indexOf(lineText[0]) >= 0) {
        nCt += 1;
        ct[nCt] = { ct: '', gene: '' };
        ct[nCt]['ct'] = 'Ct=' + lineData[1];
        ct[nCt]['gene'] = lineData[0];
      } else if (lineText[0].substr(0, 3) == 'ct ' || lineText[0].substr(0, 3) == 'ct1') {
      } else if (lineText[0].substr(0, 4) == 'ct_2' || lineText[0].substr(0, 3) == 'ct2') {
      } else if (lineText[0].substr(0, 4) == 'ct_3' || lineText[0].substr(0, 3) == 'ct3') {
      } else if (lineText[0].substr(0, 11) == 'gene_code_1' || lineText[0].substr(0, 10) == 'gene_code1') {
      } else if (lineText[0].substr(0, 11) == 'gene_code_2' || lineText[0].substr(0, 10) == 'gene_code2') {
      } else if (lineText[0].substr(0, 11) == 'gene_code_3' || lineText[0].substr(0, 10) == 'gene_code3') {
      } else if (lineText[0].substr(0, 11) == 'reported by') {
        reporter = lineText[1];
      } else if (lineText[0].substr(0, 11) == 'approved by') {
        approver = lineText[1];
      } else if (lineText[0] == 'reported date/time') {
        const dateTimeSplt = lineText[1].split(' ');
        const dateSplt = dateTimeSplt[0].split('\/');
        const hour = dateTimeSplt[dateTimeSplt.length - 1];
        if (dateSplt && dateSplt.length == 3) {
          results_date = moment([dateSplt[2], +dateSplt[1] - 1, dateSplt[0], hour, lineText[2], lineText[3]]).format('YYYY-MM-DD HH:mm:ss');
        }
      } else if (lineText[0] == 'approved date/time') {
        const dateTimeSplt = lineText[1].split(' ');
        const dateSplt = dateTimeSplt[0].split('\/');
        const hour = dateTimeSplt[dateTimeSplt.length - 1];
        if (dateSplt && dateSplt.length == 3) {
          approve_date = moment([dateSplt[2], +dateSplt[1] - 1, dateSplt[0], hour, lineText[2], lineText[3]]).format('YYYY-MM-DD HH:mm:ss');
        }
      }
    }
  }

  // แปลงผลการตรวจ ============================================================
  row.resultText = row.resultText.toLowerCase() == 'inconclusive result' ? 'Inconclusive' : row.resultText
  row.resultCode = resultList.indexOf(row.resultText.toLowerCase());
  row.resultCode = row.resultCode ? row.resultCode : 0;

  row.report_detail = {
    co_lab_objective: objective,
    co_lab_result_code: row.resultCode,
    ct_1: ct[0]['ct'], //"Ct =23.01",
    ct_2: ct[1]['ct'], //"Ct =26.04",
    ct_3: ct[2]['ct'],
    gene_code_1: ct[0]['gene'], //"Ct ORF -1ab gene ",
    gene_code_2: ct[1]['gene'], //"Ct N-gene",
    gene_code_3: ct[2]['gene'],
    results_date: moment(results_date || row.date_result).format('YYYY-MM-DDTHH:mm:ss.SSS'),
    reporter: reporter || row.name,
    approve_date: moment(approve_date || row.date_result).format('YYYY-MM-DDTHH:mm:ss.SSS'),
    approver: approver || row.name
  }
}


module.exports = cron;