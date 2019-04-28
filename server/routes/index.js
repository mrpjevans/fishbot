require('dotenv').config();
const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const fs = require('fs');
const readline = require('readline');
const Push = require('pushover-notifications');

const push = new Push( {
  user: process.env['PUSHOVER_USER'],
  token: process.env['PUSHOVER_TOKEN'],
})

let lastHeard = moment();

// Heartbeat check
setInterval(function() {
  let diff = moment().diff(lastHeard, 'hours');
  if (diff > 0) {
    sendNotification(`No data from Fishbot since ${lastHeard.format('DD/MM/YY HH:mm')}`);
  }
}, 3600000);

/* GET home page. */
router.get('/', async function(req, res, next) {
  let chartData = await generateChart();
  if (!chartData) {
    res.render('index');
  } else {
    let latestTemp = parseFloat(chartData['series'][1][chartData['series'][1].length - 1]).toFixed(1);
    let latestTempTime = chartData['labels'][chartData['labels'].length - 1]
    res.render('index', { latestTemp, latestTempTime, chartData: JSON.stringify(chartData) });
  }
});

// Debug - Just return the value of lastHeard
router.get('/last', async function(req, res, next) {
  res.send(lastHeard.format('YYYY-MM-DD HH:mm:ss'));
});

router.post('/reading', function(req, res, next) {
  
  // Do we have the PSK?
  if (req.body.psk == undefined || req.body.psk != process.env.FISHBOT_PSK) {
    res.json(false);
    return;
  }

  // Make a note of the time
  lastHeard = moment();

  // Latest temp
  currentTemp = req.body.temp;

  // Should we alert?
  if (currentTemp > 27 || currentTemp < 21) {

    // Eek!
    sendNotification(`Temperature is ${currentTemp}ºC`);

  }

  // Calculate file
  let filePath = global.config.logdir + '/' + moment.utc().format('YYYYMMDD') + '.csv';

  //Write file
  let line = `"${moment.utc().format()}",${req.body.temp}
`;
  fs.appendFile(filePath, line, function (err) {
      if (err) {
        res.json({error: err});
      } else {
        res.json(true);
      }
    });
});

function generateChart() {

  return new Promise((resolve) => {

    let chartData = {
      'labels': [],
      'series': [[],[], []]
    };

    let todaysFile = __dirname + '/../logs/' +  moment.utc().format('YYYYMMDD') + '.csv';

    if (!fs.existsSync(todaysFile)) {
      resolve(false);
    } else {

      let rl = readline.createInterface({
        input: fs.createReadStream(todaysFile)
      });

      rl.on('line', function(line) {
        let parts = line.split(',');
        let parsedTimestamp = moment.tz(parts[0].replace(/"/g, ''), "UTC").tz(global.config.timezone).format('HH:mm');
        chartData.labels.push(parsedTimestamp);
        chartData.series[0].push(27);
        chartData.series[1].push(parts[1]);
        chartData.series[2].push(21);
      });

      // end
      rl.on('close', function(line) {
        resolve(chartData);
      });
    
    }

  });
  
}
module.exports = router;

function sendNotification(message) {

  return new Promise((resolve, reject) => {

    var msg = {
      message,
      title: 'Fishbot',
      priority: 1
    }
    
    push.send(msg, function(err, result) {
      if ( err ) {
        reject(err);
      }
      resolve();
    });

  });

}
