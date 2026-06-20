export interface AuthOptions {
  email?: string
  apiKey?: string
  apiToken?: string
}

export interface UpdateOptions extends AuthOptions {
  zone: string
  record: string
  ip?: string
}

export type ListOptions = AuthOptions

export interface DnsRecord {
  id: string
  type: string
  name: string
  content: string
  ttl: number
}

export interface NewDnsRecord {
  name: string
  type: string
  content: string
}

export interface Zone {
  id: string
  name: string
  permissions: string[]
}

export interface ZoneWithRecords {
  id: string
  name: string
  records: DnsRecord[]
}

export interface ClientCredentials {
  token?: string
  email?: string
  key?: string
}

export interface CloudflareClient {
  getZones(): Promise<Zone[]>
  getDnsRecord(zoneId: string, recordId: string): Promise<DnsRecord>
  getDnsRecords(zoneId: string): Promise<DnsRecord[]>
  updateDnsRecord(zoneId: string, recordId: string, data: NewDnsRecord): Promise<void>
}

export interface CloudflareResponse<T> {
  result: T
}

export interface CloudflarePaginatedResponse<T> {
  result: T[]
  result_info: {
    count: number
    page: number
    per_page: number
    total_count: number
  }
}
