#!/usr/bin/env node

import fetch from "node-fetch";
import cheerio from 'cheerio';

import player from 'play-sound'
const EMAIL = process.env.EMAIL
const PASSWORD = process.env.PASSWORD
const SCHEDULE_ID = process.env.SCHEDULE_ID
const FACILITY_ID = process.env.FACILITY_ID
const LOCALE = process.env.LOCALE
const REFRESH_DELAY = Number(process.env.REFRESH_DELAY || 3)

const BASE_URI = `https://ais.usvisa-info.com/${LOCALE}/niv`

async function main(currentBookedDate) {
  if (!currentBookedDate) {
    log(`Invalid current booked date: ${currentBookedDate}`)
    process.exit(1)
  }

  log(`Initializing with current date ${currentBookedDate}`)

  try {
    const sessionHeaders = await login()

    while(true) {
      // todo changes the return value of this, need to mock the API so I can continue development
      const date = await checkAvailableDate(sessionHeaders)

      console.log(date[0].business_day)

      return

      if (!date) {
        log("no dates available")
      } else if (date > currentBookedDate) {
        log(`nearest date is further than already booked (${currentBookedDate} vs ${date})`)
      } else {
        currentBookedDate = date
        const time = await checkAvailableTime(sessionHeaders, date)

        console.log(date, time)

        const d = new Date(date)

        const unixTime = d.getTime()

        console.log(d)

        // player().play('beep-01a.mp3', function(err){
        //   if (err) throw err
        // })

        console.log(date)

        return
      }

      await sleep(REFRESH_DELAY)
    }

  } catch(err) {
    console.error(err)
    log("Trying again")

    main(currentBookedDate)
  }
}

function isDateInRange(date, startDate, endDate) {
  // Convert the dates to milliseconds since the epoch
  const dateMs = date.getTime();
  const startDateMs = startDate.getTime();
  const endDateMs = endDate.getTime();

  // Check if the date is in range
  return dateMs >= startDateMs && dateMs <= endDateMs;
}

async function login() {
  log(`Logging in`)

  const anonymousHeaders = await fetch(`${BASE_URI}/users/sign_in`, {
    headers: {
      "User-Agent": "",
      "Accept": "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
    },
  })
    .then(response => extractHeaders(response))

  return fetch(`${BASE_URI}/users/sign_in`, {
    "headers": Object.assign({}, anonymousHeaders, {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    }),
    "method": "POST",
    "body": new URLSearchParams({
      'utf8': '✓',
      'user[email]': EMAIL,
      'user[password]': PASSWORD,
      'policy_confirmed': '1',
      'commit': 'Acessar'
    }),
  })
    .then(res => (
      Object.assign({}, anonymousHeaders, {
        'Cookie': extractRelevantCookies(res)
      })
    ))
}

/**
 * @param {Object} availableDate
 * @param {number} availableDate.date string
 * @param {string} availableDate.business_day boolean
 */

/**
 * Returns an array of available dates
 * @param headers
 * @return {PromiseLike<availableDate[] | null>}
 */
function checkAvailableDate(headers) {
  return fetch(`${BASE_URI}/schedule/${SCHEDULE_ID}/appointment/days/${FACILITY_ID}.json?appointments[expedite]=false`, {
    "headers": Object.assign({}, headers, {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    }),
    "cache": "no-store"
  })
    .then(r => r.json())
    .then(r => handleErrors(r))
    .then(d => d.length > 0 ? d : null)

}

function checkAvailableTime(headers, date) {
  return fetch(`${BASE_URI}/schedule/${SCHEDULE_ID}/appointment/times/${FACILITY_ID}.json?date=${date}&appointments[expedite]=false`, {
    "headers": Object.assign({}, headers, {
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    }),
    "cache": "no-store",
  })
    .then(r => r.json())
    .then(r => handleErrors(r))
    .then(d => d['business_times'][0] || d['available_times'][0])
}

function handleErrors(response) {
  const errorMessage = response['error']

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return response
}

async function book(headers, date, time) {
  const url = `${BASE_URI}/schedule/${SCHEDULE_ID}/appointment`

  const newHeaders = await fetch(url, { "headers": headers })
    .then(response => extractHeaders(response))

  return fetch(url, {
    "method": "POST",
    "redirect": "follow",
    "headers": Object.assign({}, newHeaders, {
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    "body": new URLSearchParams({
      'utf8': '✓',
      'authenticity_token': newHeaders['X-CSRF-Token'],
      'confirmed_limit_message': '1',
      'use_consulate_appointment_capacity': 'true',
      'appointments[consulate_appointment][facility_id]': FACILITY_ID,
      'appointments[consulate_appointment][date]': date,
      'appointments[consulate_appointment][time]': time,
      'appointments[asc_appointment][facility_id]': '',
      'appointments[asc_appointment][date]': '',
      'appointments[asc_appointment][time]': ''
    }),
  })
}

async function extractHeaders(res) {
  const cookies = extractRelevantCookies(res)

  const html = await res.text()
  const $ = cheerio.load(html);
  const csrfToken = $('meta[name="csrf-token"]').attr('content')

  return {
    "Cookie": cookies,
    "X-CSRF-Token": csrfToken,
    "Referer": BASE_URI,
    "Referrer-Policy": "strict-origin-when-cross-origin",
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive'
  }
}

function extractRelevantCookies(res) {
  const parsedCookies = parseCookies(res.headers.get('set-cookie'))
  return `_yatri_session=${parsedCookies['_yatri_session']}`
}

function parseCookies(cookies) {
  if (cookies) {
    const parsedCookies = {}

    cookies.split(';').map(c => c.trim()).forEach(c => {
      const [name, value] = c.split('=', 2)
      parsedCookies[name] = value
    })

    return parsedCookies
  }

  throw new Error('No cookies in response header')
}

function sleep(s) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
}

function log(message) {
  console.log(`[${new Date().toISOString()}]`, message)
}

const args = process.argv.slice(2);
const currentBookedDate = args[0]
main(currentBookedDate)
