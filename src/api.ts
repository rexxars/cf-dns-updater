// @env node
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
  Zone,
  ZoneWithRecords,
} from './types.js'

export type {DnsRecord, ListOptions, NewDnsRecord, UpdateOptions, ZoneWithRecords} from './types.js'

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

export async function update(options: UpdateOptions): Promise<DnsRecord | NewDnsRecord> {
  requireKeyOrToken(options)

  if (!options.zone) {
    throw new Error('Option "zone" must be specified')
  }

  if (!options.record) {
    throw new Error('Option "record" must be specified')
  }

  const client = getClient(options)
  const [ip, currentRecord] = await Promise.all([
    resolveIp(options),
    client.getDnsRecord(options.zone, options.record),
  ])

  if (ip === currentRecord.content) {
    // Record is still valid, no update needed
    return currentRecord
  }

  const newRecord: NewDnsRecord = {
    name: currentRecord.name,
    type: currentRecord.type,
    content: ip,
  }
  await client.updateDnsRecord(options.zone, options.record, newRecord)
  return newRecord
}

export async function list(options: ListOptions): Promise<ZoneWithRecords[]> {
  requireKeyOrToken(options)

  const client = getClient(options)
  const allZones = await client.getZones()
  const editableZones = allZones.filter(isEditable)
  const records = await Promise.all(editableZones.map((zone) => recordsForZone(zone, client)))
  return records.filter((zone) => zone.records.length > 0)
}
