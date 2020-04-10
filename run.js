// check for prod or test mode.
const MODE = process.argv[2];
if(MODE != '--prod' && MODE != '--test')
  return console.log("Please provide either --test or --prod flag into your command.");

// check if notify service sid is provided.
const NOTIFY_SERVICE_SID = process.argv[3];
if(!NOTIFY_SERVICE_SID)
  return console.log("Please pass in the notify service SID. ex. `node twilio-notify.js --test {NOTIFY_SERVICE_SID}`");

// ensure all required config information is available
const REQUIRED = [
  "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN",
  "MAX_CHUNK_SIZE", "MSG_BODY"
];
const ENV = require('./config.js').Env;
for(let KEY of REQUIRED)
  if(!ENV[KEY])
    return console.log('Your secret.js file is missing ', KEY);
const MAX_CHUNK_SIZE = Number(ENV.MAX_CHUNK_SIZE) || 1;

// load required libs
const fs            = require('fs')
const Papa          = require("papaparse");
const client = require('twilio')(ENV.TWILIO_ACCOUNT_SID, ENV.TWILIO_AUTH_TOKEN);

// set up files.
const failed_filepath = './failed.csv';
const prod_filepath = "./list.csv";
const test_filepath = "./list_test.csv";
fs.writeFileSync(failed_filepath,'Numbers,Status',{encoding:'utf8',flag:'w'});
const filepath = (MODE=="--prod" ? prod_filepath:test_filepath);
const file = fs.readFileSync(filepath, 'utf8')

// callback function when chunks are available to send notifications.
let batch_count = 0;
async function sendNotification(chunks) {
  if(chunks.length < 1) return;

  batch_count++;
  let bindings = [];
  for(let row of chunks)
    bindings.push(JSON.stringify({ binding_type: "sms", address: row.Numbers }));

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

  console.log('Batch sent: ', batch_count);
  return true;
}

// ensures at least 1 second has passed between startTime and endTime
function sleep(startTime, endTime) {
  let lapse = endTime - startTime;
  if(lapse > 1000) return;
  let ms = 1000 - lapse;
  var start = new Date().getTime(), expire = start + ms;
  while (new Date().getTime() < expire) { }
  return;
}

// read from file and start processing messages.
let chunks = [];
let timeLapse = new Date().getTime();
Papa.parse(file, {
  header: true,
  worker: true,
  step: async function(row, parser) {
    parser.pause();
    chunks.push(row.data);
    if(chunks.length == Number(ENV.MAX_CHUNK_SIZE)) {
      sleep(timeLapse, new Date().getTime());
      await sendNotification(chunks);
      chunks = [];
      timeLapse = new Date().getTime();
    }
    parser.resume();
  },
  complete: async function(row) {
    sleep(timeLapse, new Date().getTime());
    await sendNotification(chunks);
    chunks = [];
  }
});
