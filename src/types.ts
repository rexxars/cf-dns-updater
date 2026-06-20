export interface AuthOptions {
  email?: string
  apiKey?: string
  apiToken?: string
}

export interface UpdateResult {
  record: DnsRecord | NewDnsRecord
  changed: boolean
}

export interface UpdateOptions extends AuthOptions {
  zone: string
  record: string
  /** Fixed IP to update the record with. Mutually exclusive with `interval`. */
  ip?: string
  /**
   * When set (in milliseconds), check repeatedly at this interval instead of
   * running once. Each check resolves the current public IP and updates the
   * record if it changed. Mutually exclusive with `ip`.
   */
  interval?: number
  /** Abort signal used to stop interval mode. */
  signal?: AbortSignal
  /** Invoked after every successful check in interval mode. */
  onUpdate?: (result: UpdateResult) => void
  /** Invoked when a check fails in interval mode. The loop keeps running. */
  onError?: (error: unknown) => void
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
