import {beforeEach, describe, expect, test, vi} from 'vitest'

const {requestMock, publicIpMock} = vi.hoisted(() => ({
  requestMock: vi.fn(),
  publicIpMock: vi.fn(),
}))

vi.mock('get-it', () => ({createRequester: () => requestMock}))
vi.mock('public-ip', () => ({publicIpv4: publicIpMock}))

const {list, update} = await import('../api.js')

function jsonResponse(body: unknown) {
  return Promise.resolve({status: 200, statusText: 'OK', headers: new Headers(), body})
}

const currentRecord = {
  id: 'rec1',
  type: 'A',
  name: 'home.example.com',
  content: '198.51.100.1',
  ttl: 1,
}

describe('update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('throws when neither token nor key/email is provided', async () => {
    await expect(update({zone: 'zone1', record: 'rec1'})).rejects.toThrow(
      'Need to provide either `email` and `apiKey`, or `apiToken`',
    )
  })

  test('throws when both apiKey and apiToken are provided', async () => {
    await expect(
      update({zone: 'zone1', record: 'rec1', apiToken: 't', apiKey: 'k', email: 'e@example.com'}),
    ).rejects.toThrow('Cannot provide both `apiKey` AND `apiToken`')
  })

  test('throws when zone is missing', async () => {
    await expect(update({zone: '', record: 'rec1', apiToken: 't'})).rejects.toThrow(
      'Option "zone" must be specified',
    )
  })

  test('returns the current record unchanged when the IP already matches', async () => {
    requestMock.mockImplementation(() => jsonResponse({result: currentRecord}))

    const result = await update({
      zone: 'zone1',
      record: 'rec1',
      apiToken: 't',
      ip: '198.51.100.1',
    })

    expect(result).toEqual(currentRecord)
    expect(requestMock).toHaveBeenCalledTimes(1)
  })

  test('patches the record when the IP differs', async () => {
    requestMock.mockImplementation((options: {method?: string}) =>
      options.method === 'PATCH'
        ? jsonResponse({result: {}})
        : jsonResponse({result: currentRecord}),
    )

    const result = await update({
      zone: 'zone1',
      record: 'rec1',
      apiToken: 't',
      ip: '203.0.113.10',
    })

    expect(result).toEqual({name: 'home.example.com', type: 'A', content: '203.0.113.10'})

    const patchCall = requestMock.mock.calls.find(([options]) => options.method === 'PATCH')
    if (!patchCall) throw new Error('expected a PATCH request')
    expect(patchCall[0]).toMatchObject({
      url: '/zones/zone1/dns_records/rec1',
      method: 'PATCH',
      body: {name: 'home.example.com', type: 'A', content: '203.0.113.10'},
    })
  })

  test('resolves the external IP when none is provided', async () => {
    publicIpMock.mockResolvedValue('203.0.113.55')
    requestMock.mockImplementation((options: {method?: string}) =>
      options.method === 'PATCH'
        ? jsonResponse({result: {}})
        : jsonResponse({result: currentRecord}),
    )

    const result = await update({zone: 'zone1', record: 'rec1', apiToken: 't'})

    expect(publicIpMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({name: 'home.example.com', type: 'A', content: '203.0.113.55'})
  })
})

describe('list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns only editable zones that have records', async () => {
    const editableRecord = {id: 'r1', type: 'A', name: 'a.editable.com', content: '1.2.3.4', ttl: 1}

    requestMock.mockImplementation((options: {url: string}) => {
      switch (options.url) {
        case '/zones':
          return jsonResponse({
            result: [
              {
                id: 'z1',
                name: 'editable.com',
                permissions: ['#dns_records:edit', '#dns_records:read'],
              },
              {id: 'z2', name: 'readonly.com', permissions: ['#dns_records:read']},
              {
                id: 'z3',
                name: 'empty.com',
                permissions: ['#dns_records:edit', '#dns_records:read'],
              },
            ],
            result_info: {count: 3, page: 1, per_page: 50, total_count: 3},
          })
        case '/zones/z1/dns_records':
          return jsonResponse({
            result: [editableRecord],
            result_info: {count: 1, page: 1, per_page: 50, total_count: 1},
          })
        case '/zones/z3/dns_records':
          return jsonResponse({
            result: [],
            result_info: {count: 0, page: 1, per_page: 50, total_count: 0},
          })
        default:
          throw new Error(`Unexpected request to ${options.url}`)
      }
    })

    const zones = await list({apiToken: 't'})

    expect(zones).toEqual([{id: 'z1', name: 'editable.com', records: [editableRecord]}])
  })
})
