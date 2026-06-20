import {createRequester} from 'get-it'

import {CLOUDFLARE_API_BASE, PAGE_SIZE} from './constants.js'
import type {
  ClientCredentials,
  CloudflareClient,
  CloudflarePaginatedResponse,
  CloudflareResponse,
  DnsRecord,
  NewDnsRecord,
  Zone,
} from './types.js'

function getAuthHeaders(credentials: ClientCredentials): Record<string, string> {
  if (credentials.token) {
    return {Authorization: `Bearer ${credentials.token}`}
  }

  return {
    'X-Auth-Email': credentials.email ?? '',
    'X-Auth-Key': credentials.key ?? '',
  }
}

export function createClient(credentials: ClientCredentials): CloudflareClient {
  const request = createRequester({
    base: CLOUDFLARE_API_BASE,
    as: 'json',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders(credentials),
    },
  })

  async function paginate<T>(url: string): Promise<T[]> {
    const results: T[] = []
    let page = 0
    let hasMore = true

    do {
      page++
      // Pages must be fetched sequentially: each response tells us whether another page exists.
      // oxlint-disable-next-line no-await-in-loop
      const response = await request<CloudflarePaginatedResponse<T>>({
        url,
        query: {per_page: PAGE_SIZE, page},
        as: 'json',
      })

      results.push(...response.body.result)
      hasMore = response.body.result_info.count === PAGE_SIZE
    } while (hasMore)

    return results
  }

  async function getZones(): Promise<Zone[]> {
    return paginate<Zone>('/zones')
  }

  async function getDnsRecord(zoneId: string, recordId: string): Promise<DnsRecord> {
    const response = await request<CloudflareResponse<DnsRecord>>({
      url: `/zones/${zoneId}/dns_records/${recordId}`,
      as: 'json',
    })

    return response.body.result
  }

  async function getDnsRecords(zoneId: string): Promise<DnsRecord[]> {
    return paginate<DnsRecord>(`/zones/${zoneId}/dns_records`)
  }

  async function updateDnsRecord(
    zoneId: string,
    recordId: string,
    data: NewDnsRecord,
  ): Promise<void> {
    await request({
      url: `/zones/${zoneId}/dns_records/${recordId}`,
      method: 'PATCH',
      body: data,
      as: 'json',
    })
  }

  return {getZones, getDnsRecord, getDnsRecords, updateDnsRecord}
}
