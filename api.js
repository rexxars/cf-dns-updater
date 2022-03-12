import cloudflare from 'cloudflare'
import publicIp from 'public-ip'

const required = ['zone', 'record']
const requiredForList = []

function resolveIP(options) {
  return options.ip ? Promise.resolve(options.ip) : publicIp.v4()
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
  const records = (await client.dnsRecords.browse(zone.id)).result
  return {
    id: zone.id,
    name: zone.name,
    records,
  }
}

function getClient(options) {
  return options.apiToken
    ? cloudflare({token: options.apiToken})
    : cloudflare({
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
    client.dnsRecords.read(options.zone, options.record).then((res) => res.result),
  ])

  if (ip === currentRecord.content) {
    // Record is still valid, falling back
    return currentRecord
  }

  // Record is outdated, update
  const newRecord = {...currentRecord, content: ip}
  await client.dnsRecords.edit(options.zone, options.record, newRecord)
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
  const allZones = (await client.zones.browse()).result
  const editableZones = allZones.filter(isEditable)
  const records = await Promise.all(editableZones.map((zone) => recordsForZone(zone, client)))
  return records.filter((zone) => zone.records.length > 0)
}
