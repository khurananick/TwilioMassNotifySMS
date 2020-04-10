## Intro
Use this app to send mass SMS message to numbers from a csv. Before using this lib, ensure that you have:

**1**. Purchased at least one SMS capable phone number in your Twilio account.
(https://www.twilio.com/console/phone-numbers/incoming)

**2**. Set up a Messaging Service and assigned applicable phone number(s) to it.
(https://www.twilio.com/console/sms/services)

**3**. Set up a Notify Service and assigned the applicable Messaging Service to it.
(https://www.twilio.com/console/notify/services)

## Setup
**Step 1:** Clone this repo to your local.

**Step 2:** Copy `config.js.tmp` to `config.js` and add your Twilio account credentials.

**Step 3:** Run `npm install` to download required libs.

## How To Test

Update `list_test.txt` with the appropriate numbers. Then run: 

`node run.js --test {NOTIFY_SERVICE_SID}`

## How To Run

Update `list.txt` with the appropriate contacts and headers. Then run: 

`node run.js --prod {NOTIFY_SERVICE_SID}`
