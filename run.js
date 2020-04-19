/*
 *  First few anon functions to just verify setup is correct.
 */
// check for prod or test mode.
const MODE = (function() {
  let mode = process.argv[2];
  if(mode != '--prod' && mode != '--test') {
    console.log("Please provide either --test or --prod flag into your command. ex. `node run.js --test {NOTIFY_SERVICE_SID}`");
    process.exit(1);
  }
  return mode;
})();

// check if notify service sid is provided.
const NOTIFY_SERVICE_SID = (function() {
  let sid = process.argv[3];
  if(!sid) {
    console.log("Please pass in the notify service SID. ex. `node run.js --test {NOTIFY_SERVICE_SID}`");
    process.exit(1);
  }
  return sid;
})();

// ensure all required config information is available
const ENV = (function() {
  let required = [
    "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
    "MAX_BATCH_SIZE", "MSG_BODY"
  ];
  let env = require('./config.js').Env;
  for(let key of required) {
    if(!env[key]) {
      console.log('Your config.js file is missing ', key);
      process.exit(1);
    }
  }
  return env;
})();
const MAX_BATCH_SIZE = Number(ENV.MAX_BATCH_SIZE) || 1;

/*
 * Loading the required libs.
 */
// load required libs
const fs            = require('fs')
const Papa          = require("papaparse");
const client = require('twilio')(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);

/*
 * Ensuring the necessary file(s) exist.
 */
// read/set up numbers files.
const failed_filepath = './failed.csv';
fs.writeFileSync(failed_filepath,'Numbers,Status',{encoding:'utf8',flag:'w'});
const success_filepath = './success.csv';
fs.writeFileSync(success_filepath,'Numbers',{encoding:'utf8',flag:'w'});
const prod_filepath = "./list.csv";
const test_filepath = "./list_test.csv";
const filepath = (MODE=="--prod" ? prod_filepath:test_filepath);
const file = fs.readFileSync(filepath, 'utf8')

/*
 * Few helper functions.
 */
// ensures at least 1 second has passed between startTime and endTime
function sleep(startTime, endTime) {
  let lapse = endTime - startTime;
  if(lapse > 1000) return;
  let ms = 1000 - lapse;
  var start = new Date().getTime(), expire = start + ms;
  while (new Date().getTime() < expire) { }
  return;
}

// ensures row has a data hash with Numbers key
// row={data:{Numbers:"<num>"}}
function confirmHeader(row) {
  if(!row.data.Numbers) {
    console.log(`ERROR:: ${filepath} does not have a Numbers header`);
    process.exit(1);
  }
}

/*
 * Main functions that step through the CSV and send out the message in batches.
 */
// callback function when a batch of numbers is available to send notifications to.
let batch_count = 0;
async function sendNotification(batch) {
  if(batch.length < 1) return;

  batch_count++;
  let bindings = [];
  for(let number of batch)
    bindings.push(JSON.stringify({ binding_type: "sms", address: number }));

  let confirmation = await client.notify.services(NOTIFY_SERVICE_SID).notifications.create({
    toBinding: bindings,
    body: ENV.MSG_BODY
  })
  .catch(function(err) {
    let lines = [];
    for(let item of bindings) {
      let binding = JSON.parse(item);
      fs.appendFileSync(failed_filepath, `\r\n${binding.address},Failed`);
      console.log('Batch failed: ', batch_count);
    }
  });

  if(confirmation) {
    for(let number of batch)
      fs.appendFileSync(success_filepath, `\r\n${number}`);
    console.log(`Batch ${batch_count} with ${batch.length} numbers sent.`);
    return true;
  }
}

(function init() {
  let headerConfirmed = false;
  let batch = [];
  let timeLapse = new Date().getTime();
  Papa.parse(file, { // read from file and start processing messages.
    header: true,
    worker: true,
    step: async function(row, parser) {
      parser.pause(); // don't go to next line until we've processed this line.
      // ensure header is correct on first line only.
      if(!headerConfirmed) {
        confirmHeader(row);
        headerConfirmed = true;
      }

      // validate number is correct
      if(!row.data.Numbers.match(/\++[0-9]+$/)) {
        fs.appendFileSync(failed_filepath, `\r\n${row.data.Numbers},Invalid`);
        return parser.resume();
      }

      batch.push(row.data.Numbers); // push number from line into batch.
      // if batch length has reached max batch size,
      // ensure at least 1 second has passed since sending previous batch
      // and then send message to this batch of numbers.
      if(batch.length == Number(ENV.MAX_BATCH_SIZE)) {
        sleep(timeLapse, new Date().getTime());
        await sendNotification(batch);
        batch = [];
        timeLapse = new Date().getTime();
      }
      // go to next line in csv.
      parser.resume();
    },
    complete: async function(row) {
      // if file has completed processing,
      // send message to remaining batch of numbers.
      if(batch.length < 1) return;
      sleep(timeLapse, new Date().getTime());
      await sendNotification(batch);
      console.log(`Finished sending notifications.`);
      process.exit(0);
    }
  });
})();
