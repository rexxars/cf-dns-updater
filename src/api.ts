// @env node
import {setTimeout as sleep} from 'node:timers/promises'

import {publicIpv4} from 'public-ip'

import {createClient} from './cloudflare.js'
import {DNS_EDIT_PERMISSION, DNS_READ_PERMISSION} from './constants.js'
import type {
  AuthOptions,
  CloudflareClient,
  DnsRecord,
  ListOptions,
  NewDnsRecord,
  UpdateOptions,
  UpdateResult,
  Zone,
  ZoneWithRecords,
} from './types.js'

export type {
  DnsRecord,
  ListOptions,
  NewDnsRecord,
  UpdateOptions,
  UpdateResult,
  ZoneWithRecords,
} from './types.js'

function resolveIp(options: UpdateOptions): Promise<string> {
  return options.ip ? Promise.resolve(options.ip) : publicIpv4()
}

function isEditable(zone: Zone): boolean {
  return (
    zone.permissions.includes(DNS_EDIT_PERMISSION) && zone.permissions.includes(DNS_READ_PERMISSION)
  )
}

function requireKeyOrToken(options: AuthOptions): void {
  if (options.apiToken && options.apiKey) {
    throw new Error('Cannot provide both `apiKey` AND `apiToken`')
  }

  if (options.apiToken) {
    return
  }

  if (options.apiKey && options.email) {
    return
  }

  throw new Error('Need to provide either `email` and `apiKey`, or `apiToken`')
}

function getClient(options: AuthOptions): CloudflareClient {
  return options.apiToken
    ? createClient({token: options.apiToken})
    : createClient({email: options.email, key: options.apiKey})
}

async function recordsForZone(zone: Zone, client: CloudflareClient): Promise<ZoneWithRecords> {
  const records = await client.getDnsRecords(zone.id)
  return {id: zone.id, name: zone.name, records}
}

async function performUpdate(
  client: CloudflareClient,
  options: UpdateOptions,
): Promise<UpdateResult> {
  const [ip, currentRecord] = await Promise.all([
    resolveIp(options),
    client.getDnsRecord(options.zone, options.record),
  ])

  if (ip === currentRecord.content) {
    // Record is still valid, no update needed
    return {record: currentRecord, changed: false}
  }

  const newRecord: NewDnsRecord = {
    name: currentRecord.name,
    type: currentRecord.type,
    content: ip,
  }
  await client.updateDnsRecord(options.zone, options.record, newRecord)
  return {record: newRecord, changed: true}
}

async function runInterval(options: UpdateOptions, interval: number): Promise<void> {
  const {signal} = options
  const client = getClient(options)

  // The loop is intentionally sequential — one check per interval, waiting in between —
  // and `signal.aborted` is mutated externally via the caller's AbortController.
  /* oxlint-disable no-await-in-loop, no-unmodified-loop-condition */
  while (!signal?.aborted) {
    try {
      const result = await performUpdate(client, options)
      options.onUpdate?.(result)
    } catch (error) {
      options.onError?.(error)
    }

    try {
      await sleep(interval, undefined, {signal})
    } catch {
      // The abort signal fired while waiting for the next check
      break
    }
  }
  /* oxlint-enable no-await-in-loop, no-unmodified-loop-condition */
}

function validateUpdateOptions(options: UpdateOptions): void {
  requireKeyOrToken(options)

  if (options.ip !== undefined && options.interval !== undefined) {
    throw new Error('Cannot provide both `ip` and `interval`')
  }

  if (
    options.interval !== undefined &&
    (!Number.isFinite(options.interval) || options.interval <= 0)
  ) {
    throw new Error('`interval` must be a positive number of milliseconds')
  }

  if (!options.zone) {
    throw new Error('Option "zone" must be specified')
  }

  if (!options.record) {
    throw new Error('Option "record" must be specified')
  }
}

export function update(options: UpdateOptions & {interval: number}): Promise<void>
export function update(options: UpdateOptions): Promise<DnsRecord | NewDnsRecord>
export async function update(options: UpdateOptions): Promise<DnsRecord | NewDnsRecord | void> {
  validateUpdateOptions(options)

  if (options.interval !== undefined) {
    return runInterval(options, options.interval)
  }

  const client = getClient(options)
  const {record} = await performUpdate(client, options)
  return record
}

export async function list(options: ListOptions): Promise<ZoneWithRecords[]> {
  requireKeyOrToken(options)

  const client = getClient(options)
  const allZones = await client.getZones()
  const editableZones = allZones.filter(isEditable)
  const records = await Promise.all(editableZones.map((zone) => recordsForZone(zone, client)))
  return records.filter((zone) => zone.records.length > 0)
}
