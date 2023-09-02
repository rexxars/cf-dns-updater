import {publicIpv4} from 'public-ip'
import {createClient} from './cloudflare.js'

const required = ['zone', 'record']
const requiredForList = []

function resolveIP(options) {
  return options.ip ? Promise.resolve(options.ip) : publicIpv4()
}

function isEditable(zone) {
  return (
    zone.permissions.includes('#dns_records:edit') && zone.permissions.includes('#dns_records:read')
  )
}

function requireKeyOrToken(options) {
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

async function recordsForZone(zone, client) {
  const records = await client.getDnsRecords(zone.id)
  return {
    id: zone.id,
    name: zone.name,
    records,
  }
}

function getClient(options) {
  return options.apiToken
    ? createClient({token: options.apiToken})
    : createClient({
        email: options.email,
        key: options.apiKey,
      })
}

export async function update(options) {
  requireKeyOrToken(options)

  required.forEach((opt) => {
    if (!options[opt]) {
      throw new Error(`Option "${opt}" must be specified`)
    }
  })

  const client = getClient(options)

  const [ip, currentRecord] = await Promise.all([
    resolveIP(options),
    client.getDnsRecord(options.zone, options.record),
  ])

  if (ip === currentRecord.content) {
    // Record is still valid, falling back
    return currentRecord
  }

  // Record is outdated, update
  const newRecord = {name: currentRecord.name, type: currentRecord.type, content: ip}
  await client.updateDnsRecord(options.zone, options.record, newRecord)
  return newRecord
}

export async function list(options) {
  requireKeyOrToken(options)

  requiredForList.forEach((opt) => {
    if (!options[opt]) {
      throw new Error(`Option "${opt}" must be specified`)
    }
  })

  const client = getClient(options)
  const allZones = await client.getZones()
  const editableZones = allZones.filter(isEditable)
  const records = await Promise.all(editableZones.map((zone) => recordsForZone(zone, client)))
  return records.filter((zone) => zone.records.length > 0)
}
