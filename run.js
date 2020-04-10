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
async function sendNotification(chunks) {
  if(chunks.length < 1) return;

  let bindings = [];
  for(let row of chunks)
    bindings.push(JSON.stringify({ binding_type: "sms", address: row.Numbers }));

  let confirmation = await client.notify.services(NOTIFY_SERVICE_SID).notifications.create({
    toBinding: bindings,
    body: "Here's a note for you!!"
  })
  .catch(function(err) {
    let lines = [];
    for(let item of bindings) {
      let binding = JSON.parse(item);
      fs.appendFileSync(failed_filepath, `\r\n${binding.address},Failed`);
    }
  });
}

// read from file and start processing messages.
let chunks = [];
Papa.parse(file, {
  header: true,
  worker: true,
  step: async function(row, parser) {
    parser.pause();
    chunks.push(row.data);
    if(chunks.length == Number(ENV.MAX_CHUNK_SIZE)) {
      await sendNotification(chunks);
      chunks = [];
    }
    parser.resume();
  },
  complete: async function(row) {
    await sendNotification(chunks);
    chunks = [];
  }
});
