#!/usr/bin/env node

const updateNotifier = require('update-notifier')
const width = require('string-width')
const meow = require('meow')
const pad = require('pad')
const api = require('./api')
const pkg = require('./package.json')
const trim = item => `${item || ''}`.trim()

updateNotifier({pkg}).notify()

const cli = meow(`
  Usage
    $ cf-dns-updater --zone <zoneId> --record <recordId> --api-key <apiKey>

  Options
    --ip <someIp> IP to update record with. Defaults to current external IP.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --email <email> Email used for authentication
    --api-key <apiKey> API key used for authentication
    --list Prints the zones and dns records available for the API key

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-key myApiKey --email me@gmail.com

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-key myApiKey --email me@gmail.com

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-key myApiKey --email me@gmail.com

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
`)

/* eslint-disable no-process-env */
const options = Object.assign(
  {
    zone: process.env.CF_ZONE_ID,
    record: process.env.CF_DNS_RECORD_ID,
    email: process.env.CF_AUTH_EMAIL,
    apiKey: process.env.CF_API_KEY
  },
  cli.flags
)
/* eslint-enable no-process-env */

/* eslint-disable no-console */
function printList(zones) {
  zones.forEach(zone => {
    console.log(`${zone.name} (ID: ${zone.id})`)

    const records = zone.records.map(record =>
      [''].concat(
        [
          `ID: ${record.id}`,
          record.name,
          record.ttl === 1 ? 'auto' : record.ttl,
          'IN',
          record.type,
          record.content
        ].map(trim)
      )
    )

    const columnWidths = []
    for (let i = 0; i < records[0].length; i++) {
      columnWidths[i] = records.reduce(
        (max, curr) => Math.max(max, width(curr[i])),
        1
      )
    }

    const printable = records
      .map(columns =>
        columns.map((val, i) => pad(val, columnWidths[i])).join('  ')
      )
      .join('\n')

    console.log(printable)
    console.log('')
  })
}
/* eslint-enable no-console */

if (options.list) {
  api.list(options).then(printList)
} else {
  api.update(options)
}
