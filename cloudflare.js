/* eslint-disable camelcase */
import {getIt} from 'get-it'
import {promise, jsonRequest, jsonResponse, base, httpErrors} from 'get-it/middleware'

const baseUrl = 'https://api.cloudflare.com/client/v4'
const request = getIt([
  promise({onlyBody: true}),
  jsonRequest(),
  jsonResponse(),
  httpErrors(),
  base(baseUrl),
])

export function createClient(options) {
  const authHeaders = getAuthHeaders(options)
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...authHeaders,
  }

  function getZones() {
    return paginateAll({url: '/zones', headers})
  }

  function getDnsRecord(zoneId, recordId) {
    return request({url: `/zones/${zoneId}/dns_records/${recordId}`, headers}).then(
      (res) => res.result,
    )
  }

  function getDnsRecords(zoneId) {
    return paginateAll({url: `/zones/${zoneId}/dns_records`, headers})
  }

  function updateDnsRecord(zoneId, recordId, data) {
    return request({
      url: `/zones/${zoneId}/dns_records/${recordId}`,
      method: 'PATCH',
      headers,
      body: data,
    })
  }

  return {
    getZones,
    getDnsRecord,
    getDnsRecords,
    updateDnsRecord,
  }
}

function getAuthHeaders(opts) {
  if (opts.token) {
    return {
      Authorization: `Bearer ${opts.token}`,
    }
  }

  return {
    'X-Auth-Email': opts.email,
    'X-Auth-Key': opts.key,
  }
}

async function paginateAll(options) {
  let results = []
  let hasMore = true
  let page = 0
  do {
    const response = await request({
      ...options,
      method: options.method || 'GET',
      query: {...options.query, per_page: '50', page: ++page},
    })

    results = results.concat(response.result)
    hasMore = response.result_info.count === 50
  } while (hasMore)

  return results
}
