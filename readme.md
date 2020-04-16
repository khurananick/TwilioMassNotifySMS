## Intro
Use this app to send mass SMS message to numbers from a csv. Before using this app, ensure that you have:

**1**. Purchased at least one SMS capable phone number in your Twilio account.

(https://www.twilio.com/console/phone-numbers/incoming)

**2**. Set up a Messaging Service and assigned applicable phone number(s) to it. **Note**: *For status callbacks, make sure you set up your status callback on the messaging service, not the phone number.*

(https://www.twilio.com/console/sms/services)

**3**. Set up a Notify Service and assigned the applicable Messaging Service to it.

(https://www.twilio.com/console/notify/services)

## Setup
**Step 1:** Clone this repo to your local.

**Step 2:** Copy `config.js.tmp` to `config.js`

**Step 3:** Add your Twilio account credentials and the mesage to send in `config.js`.

**Step 4:** Run `npm install` to download required libs.

## Throttling
In `config.js` you can set `MAX_BATCH_SIZE`, which is the number of receipients to message per batch. Each batch takes at least 1 second.

**For Example**: If you want to send 150 messages per second, set `MAX_BATCH_SIZE` to 150. This does not guarantee that 150 messages will be sent per second, it just sets 150 as max to be sent per second.

## How To Test

Update `list_test.txt` with the appropriate numbers. Then run: 

`node run.js --test {NOTIFY_SERVICE_SID}`

This method will send your SMS to all the numbers in `list_test.txt`

## How To Run

Update `list.txt` with the appropriate contacts and headers. Then run: 

`node run.js --prod {NOTIFY_SERVICE_SID}`

This method will send your SMS to all the numbers in `test.txt`

