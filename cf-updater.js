#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import updateNotifier from 'update-notifier'
import width from 'string-width'
import meow from 'meow'
import {list, update} from './api.js'

const pkgPath = path.join(new URL('.', import.meta.url).pathname, 'package.json')

// eslint-disable-next-line no-sync
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const trim = (item) => `${item || ''}`.trim()

updateNotifier({pkg}).notify()

const cli = meow(
  `
  Usage
    $ cf-dns-updater --zone <zoneId> --record <recordId> --api-token <apiToken>

  Options
    --ip <someIp> IP to update record with. Defaults to current external IP.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --api-token <apiToken> API token used for authentication
    --email <email> Email used for authentication (also requires \`--api-key\`)
    --api-key <apiKey> API key used for authentication (also requires \`--email\`)
    --list Prints the zones and dns records available for the API key
    --help Shows this help text

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-token myApiToken

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-token myApiToken

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
    --api-token = CF_API_TOKEN
`,
  {
    importMeta: import.meta,
    flags: {
      ip: {
        type: 'string',
      },
      zone: {
        type: 'string',
      },
      record: {
        type: 'string',
      },
      email: {
        type: 'string',
      },
      apiKey: {
        type: 'string',
      },
      apiToken: {
        type: 'string',
      },
      list: {
        type: 'boolean',
      },
    },
  },
)

/* eslint-disable no-process-env */
const options = {
  zone: process.env.CF_ZONE_ID,
  record: process.env.CF_DNS_RECORD_ID,
  email: process.env.CF_AUTH_EMAIL,
  apiKey: process.env.CF_API_KEY,
  apiToken: process.env.CF_API_TOKEN,
  ...cli.flags,
}
/* eslint-enable no-process-env */

/* eslint-disable no-console */
function printList(zones) {
  zones.forEach((zone) => {
    console.log(`${zone.name} (ID: ${zone.id})`)

    const records = zone.records.map((record) =>
      [''].concat(
        [
          `ID: ${record.id}`,
          record.name,
          record.ttl === 1 ? 'auto' : record.ttl,
          'IN',
          record.type,
          record.content,
        ].map(trim),
      ),
    )

    const columnWidths = []
    for (let i = 0; i < records[0].length; i++) {
      columnWidths[i] = records.reduce((max, curr) => Math.max(max, width(curr[i])), 1)
    }

    const printable = records
      .map((columns) => columns.map((val, i) => val.padEnd(columnWidths[i])).join('  '))
      .join('\n')

    console.log(printable)
    console.log('')
  })
}
/* eslint-enable no-console */

if (cli.flags.help) {
  cli.showHelp()
}

if (options.list) {
  list(options).then(printList)
} else {
  update(options).then(console.log)
}
