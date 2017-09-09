const Cloudflare = require('cloudflare')
const ipify = require('ipify')

const required = ['email', 'apiKey', 'zone', 'record']
const requiredForList = ['email', 'apiKey']

function getResult(res) {
  return res.result
}

function resolveIP(options) {
  return options.ip ? Promise.resolve(options.ip) : ipify()
}

function onlyEditable(zones) {
  return zones.filter(
    zone =>
      zone.permissions.includes('#dns_records:edit') &&
      zone.permissions.includes('#dns_records:read')
  )
}

function recordsForZone(zone, client) {
  return client.dnsRecords
    .browse(zone.id)
    .then(getResult)
    .then(records => ({
      id: zone.id,
      name: zone.name,
      records: records
    }))
}

function getClient(options) {
  return new Cloudflare({
    email: options.email,
    key: options.apiKey
  })
}

function update(options) {
  let i = required.length
  while (--i) {
    const opt = required[i]
    if (!options[opt]) {
      return Promise.reject(new Error(`Option "${opt}" must be specified`))
    }
  }

  const client = getClient(options)

  return Promise.all([
    resolveIP(options),
    client.dnsRecords.read(options.zone, options.record).then(getResult)
  ]).then(results => {
    const [ip, currentRecord] = results

    if (ip === currentRecord.content) {
      // Record is still valid, falling back
      return currentRecord
    }

    // Record is outdated, update
    const newRecord = Object.assign({}, currentRecord, {content: ip})
    return client.dnsRecords
      .edit(options.zone, options.record, newRecord)
      .then(() => newRecord)
  })
}

function list(options) {
  let i = requiredForList.length
  while (--i) {
    const opt = requiredForList[i]
    if (!options[opt]) {
      return Promise.reject(new Error(`Option "${opt}" must be specified`))
    }
  }

  const client = getClient(options)
  return client.zones
    .browse()
    .then(getResult)
    .then(onlyEditable)
    .then(zones => Promise.all(zones.map(zone => recordsForZone(zone, client))))
    .then(zones => zones.filter(zone => zone.records.length > 0))
}

module.exports = {
  update,
  list
}
