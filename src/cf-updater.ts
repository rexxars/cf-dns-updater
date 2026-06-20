#!/usr/bin/env node
// @env node
import fs from 'node:fs'
import path from 'node:path'
import {parseArgs} from 'node:util'

import stringWidth from 'string-width'
import updateNotifier from 'update-notifier'

import {list, update} from './api.js'
import type {UpdateOptions, ZoneWithRecords} from './types.js'

const pkgPath = path.join(import.meta.dirname, '..', 'package.json')
const pkg: {name: string; version: string} = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const helpText = `
  Usage
    $ cf-dns-updater --zone <zoneId> --record <recordId> --api-token <apiToken>

  Options
    --ip <someIp> IP to update record with. Defaults to current external IP. Cannot be combined with \`--interval\`.
    --zone <zoneId> Zone ID the record belongs to
    --record <recordId> DNS record ID to update
    --api-token <apiToken> API token used for authentication
    --email <email> Email used for authentication (also requires \`--api-key\`)
    --api-key <apiKey> API key used for authentication (also requires \`--email\`)
    --interval <seconds> Keep running, re-checking the external IP every <seconds> and updating when it changes. Cannot be combined with \`--ip\`.
    --list Prints the zones and dns records available for the API key
    --version Shows the installed version
    --help Shows this help text

  Examples
    # Update a record with a specific IP address
    $ cf-dns-updater --zone zoneId --record recordId --ip newIp --api-token myApiToken

    # Update a record with your current external IP
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken

    # Keep running, checking every 5 minutes and updating when the IP changes
    $ cf-dns-updater --zone zoneId --record recordId --api-token myApiToken --interval 300

    # List records your API key has access to edit
    $ cf-dns-updater --list --api-token myApiToken

  Environment variables (fallbacks for missing flags)
    --zone = CF_ZONE_ID
    --record = CF_DNS_RECORD_ID
    --email = CF_AUTH_EMAIL
    --api-key = CF_API_KEY
    --api-token = CF_API_TOKEN
    --interval = CF_INTERVAL
`

function parseFlags() {
  try {
    return parseArgs({
      options: {
        ip: {type: 'string'},
        zone: {type: 'string'},
        record: {type: 'string'},
        email: {type: 'string'},
        'api-key': {type: 'string'},
        'api-token': {type: 'string'},
        interval: {type: 'string'},
        list: {type: 'boolean'},
        version: {type: 'boolean'},
        help: {type: 'boolean'},
      },
    }).values
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  }
}

const flags = parseFlags()

if (flags.help) {
  console.log(helpText)
  process.exit(0)
}

if (flags.version) {
  console.log(pkg.version)
  process.exit(0)
}

updateNotifier({pkg}).notify()

function trimEnv(value: string | undefined): string | undefined {
  return value === undefined || value === '' ? undefined : value.trim()
}

function parseIntervalSeconds(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }

  const seconds = Number(value)
  if (!Number.isInteger(seconds) || seconds <= 0) {
    console.error(
      `Error: invalid --interval "${value}" (expected a positive whole number of seconds)`,
    )
    process.exit(1)
  }

  return seconds
}

function logLine(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

const env = process.env
const options: UpdateOptions = {
  zone: flags.zone ?? trimEnv(env.CF_ZONE_ID) ?? '',
  record: flags.record ?? trimEnv(env.CF_DNS_RECORD_ID) ?? '',
  email: flags.email ?? trimEnv(env.CF_AUTH_EMAIL),
  apiKey: flags['api-key'] ?? trimEnv(env.CF_API_KEY),
  apiToken: flags['api-token'] ?? trimEnv(env.CF_API_TOKEN),
  ip: flags.ip,
}

const intervalSeconds = parseIntervalSeconds(flags.interval ?? trimEnv(env.CF_INTERVAL))

if (options.ip !== undefined && intervalSeconds !== undefined) {
  console.error('Error: `--ip` and `--interval` cannot be used together')
  process.exit(1)
}

function printList(zones: ZoneWithRecords[]): void {
  for (const zone of zones) {
    console.log(`${zone.name} (ID: ${zone.id})`)

    const rows = zone.records.map((record) => [
      '',
      `ID: ${record.id}`,
      record.name,
      record.ttl === 1 ? 'auto' : `${record.ttl}`,
      'IN',
      record.type,
      record.content,
    ])

    const columnWidths: number[] = []
    for (let i = 0; i < rows[0].length; i++) {
      columnWidths[i] = rows.reduce((max, row) => Math.max(max, stringWidth(row[i])), 1)
    }

    const printable = rows
      .map((columns) => columns.map((value, i) => value.padEnd(columnWidths[i])).join('  '))
      .join('\n')

    console.log(printable)
    console.log('')
  }
}

async function watch(seconds: number): Promise<void> {
  const controller = new AbortController()
  const stop = (): void => controller.abort()
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  logLine(`Watching ${options.zone}/${options.record}; checking every ${seconds}s`)

  await update({
    ...options,
    interval: seconds * 1000,
    signal: controller.signal,
    onUpdate: ({record, changed}) => {
      logLine(
        changed ? `Updated ${record.name} -> ${record.content}` : `No change (${record.content})`,
      )
    },
    onError: (error) => {
      logLine(`Error: ${error instanceof Error ? error.message : String(error)}`)
    },
  })
}

if (flags.list) {
  printList(await list(options))
} else if (intervalSeconds !== undefined) {
  await watch(intervalSeconds)
} else {
  await update(options)
}
