import {type BskyAgent} from '@atproto/api'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'

import {getProposals, propose, vote} from '../community-notes'
import {
  fetchWithAgentAuth,
  getNotesServiceAudience,
  getOauthSessionFromAgent,
  getPasswordAccessJwt,
  lexiconMethodFromNotesUrl,
  mintNotesServiceAuth,
  NOTES_LXM,
  resetNotesConfigCache,
  type ServiceAuthAgent,
  type ServiceAuthParams,
} from '../community-notes-auth'

const NOTES_POST_URI = 'at://did:plc:post/app.bsky.feed.post/1'
const NOTES_NOTE_URI = 'at://did:plc:note/org.opencommunitynotes.proposal/1'
const NOTES_ORIGIN = 'https://api.bluenotes.social'
const NOTES_GET = `${NOTES_ORIGIN}/xrpc/${NOTES_LXM.getProposals}`
const NOTES_VOTE = `${NOTES_ORIGIN}/xrpc/${NOTES_LXM.vote}`
const NOTES_PROPOSE = `${NOTES_ORIGIN}/xrpc/${NOTES_LXM.propose}`
const NOTES_DID = 'did:plc:jqzvhkz7gxovq55fa7ibs6px'
const SERVICE_JWT = 'service-auth-jwt-for-notes'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

function notesConfigResponse() {
  return jsonResponse({
    version: '2026-09-06T00:00:00.000Z',
    labelerDid: 'did:plc:labeler',
    feedGeneratorDid: NOTES_DID,
  })
}

function passwordAgent(accessJwt: string): BskyAgent {
  return {
    service: {toString: () => 'https://bsky.social'},
    session: {accessJwt},
  } as unknown as BskyAgent
}

function oauthAgent(opts?: {
  getServiceAuth?: (
    params: ServiceAuthParams,
  ) => Promise<{data: {token: string}}>
  fetchHandler?: (url: string, init?: RequestInit) => Promise<Response>
  accessJwt?: string
}): BskyAgent {
  const fetchHandler =
    opts?.fetchHandler ??
    jest.fn(async () => {
      throw new Error(
        'OAuthSession.fetchHandler must not be used against the notes URL',
      )
    })
  const getServiceAuth =
    opts?.getServiceAuth ??
    jest.fn(async (params: ServiceAuthParams) => ({
      data: {token: `${SERVICE_JWT}:${params.aud}:${params.lxm}`},
    }))
  return {
    service: {toString: () => 'https://bsky.social'},
    session: {accessJwt: opts?.accessJwt ?? ''},
    oauthSession: {fetchHandler},
    com: {
      atproto: {
        server: {getServiceAuth},
      },
    },
  } as unknown as BskyAgent
}

function notesFetchMock() {
  return jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes(NOTES_LXM.getConfig)) {
      return notesConfigResponse()
    }
    if (url.includes(NOTES_LXM.getProposals)) {
      return jsonResponse({
        proposals: [{uri: NOTES_NOTE_URI, note: 'context from the service'}],
      })
    }
    if (url.includes(NOTES_LXM.propose)) {
      return jsonResponse({
        uri: NOTES_NOTE_URI,
        cid: 'bafy',
        proposal: {uri: NOTES_NOTE_URI},
      })
    }
    if (url.includes(NOTES_LXM.vote)) {
      return jsonResponse({
        success: true,
        rating: {
          uri: 'at://did:plc:note/org.opencommunitynotes.rating/1',
          targetUri: NOTES_NOTE_URI,
          cts: '2026-01-01T00:00:00.000Z',
          val: 1,
          reasons: [],
        },
      })
    }
    return jsonResponse({}, 404)
  })
}

function lastNotesXrpcCall(fetchMock: jest.Mock) {
  const calls = fetchMock.mock.calls as [string, RequestInit?][]
  const notesCalls = calls.filter(([url]) => {
    return (
      url.includes('/xrpc/') &&
      !url.includes(NOTES_LXM.getConfig) &&
      !url.includes('com.atproto.server.getServiceAuth')
    )
  })
  expect(notesCalls.length).toBeGreaterThan(0)
  const [url, init] = notesCalls[notesCalls.length - 1]
  return {url, init, headers: new Headers(init?.headers)}
}

describe('getPasswordAccessJwt', () => {
  it('returns undefined for a missing or empty access token', () => {
    expect(getPasswordAccessJwt(null)).toBeUndefined()
    expect(getPasswordAccessJwt({session: undefined})).toBeUndefined()
    expect(getPasswordAccessJwt({session: {accessJwt: ''}})).toBeUndefined()
    expect(
      getPasswordAccessJwt({session: {accessJwt: undefined}}),
    ).toBeUndefined()
  })

  it('returns the password JWT when present', () => {
    expect(getPasswordAccessJwt({session: {accessJwt: 'password-jwt'}})).toBe(
      'password-jwt',
    )
  })
})

describe('getOauthSessionFromAgent', () => {
  it('returns the session object when present', () => {
    const fetchHandler = async () => jsonResponse({})
    expect(getOauthSessionFromAgent({oauthSession: {fetchHandler}})).toEqual({
      fetchHandler,
    })
  })

  it('returns undefined when oauthSession is missing', () => {
    expect(getOauthSessionFromAgent({session: {accessJwt: ''}})).toBeUndefined()
    expect(getOauthSessionFromAgent(null)).toBeUndefined()
  })
})

describe('lexiconMethodFromNotesUrl', () => {
  it('extracts the notes NSID', () => {
    expect(lexiconMethodFromNotesUrl(NOTES_PROPOSE)).toBe(NOTES_LXM.propose)
    expect(
      lexiconMethodFromNotesUrl(
        `${NOTES_GET}?uris=at://did:plc:post/app.bsky.feed.post/1`,
      ),
    ).toBe(NOTES_LXM.getProposals)
  })

  it('returns null for a non-xrpc URL', () => {
    expect(
      lexiconMethodFromNotesUrl('https://api.bluenotes.social/health'),
    ).toBe(null)
  })
})

describe('getNotesServiceAudience', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = jest.fn(async () => notesConfigResponse())
  })

  afterEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = originalFetch
  })

  it('reads feedGeneratorDid from getConfig and caches it', async () => {
    const first = await getNotesServiceAudience(NOTES_PROPOSE)
    const second = await getNotesServiceAudience(NOTES_VOTE)

    expect(first).toBe(NOTES_DID)
    expect(second).toBe(NOTES_DID)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    expect(String((globalThis.fetch as jest.Mock).mock.calls[0][0])).toBe(
      `${NOTES_ORIGIN}/xrpc/${NOTES_LXM.getConfig}`,
    )
  })

  it('rejects a getConfig body without a DID', async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse({version: '1', labelerDid: 'did:plc:x'}),
    )
    await expect(getNotesServiceAudience(NOTES_GET)).rejects.toThrow(
      'getConfig.feedGeneratorDid is not a DID',
    )
  })
})

describe('mintNotesServiceAuth', () => {
  it('calls PDS getServiceAuth with aud and lxm', async () => {
    const getServiceAuth = jest.fn(async (params: ServiceAuthParams) => {
      expect(params.aud).toBe(NOTES_DID)
      expect(params.lxm).toBe(NOTES_LXM.propose)
      return {data: {token: SERVICE_JWT}}
    })
    const agent: ServiceAuthAgent = {
      oauthSession: {fetchHandler: async () => jsonResponse({})},
      com: {atproto: {server: {getServiceAuth}}},
    }

    await expect(
      mintNotesServiceAuth(agent, {aud: NOTES_DID, lxm: NOTES_LXM.propose}),
    ).resolves.toBe(SERVICE_JWT)
    expect(getServiceAuth).toHaveBeenCalledTimes(1)
  })

  it('throws when getServiceAuth is missing', async () => {
    await expect(
      mintNotesServiceAuth(
        {oauthSession: {fetchHandler: async () => jsonResponse({})}},
        {aud: NOTES_DID, lxm: NOTES_LXM.vote},
      ),
    ).rejects.toThrow('getServiceAuth is missing')
  })

  it('does not throw TypeError when OauthBskyAppAgent getServiceAuth needs this._client', async () => {
    // Mirrors @atproto/api XRPC namespace methods on OauthBskyAppAgent:
    // getServiceAuth() { return this._client.call('com.atproto.server.getServiceAuth', ...) }
    // An unbound extract (`const fn = server.getServiceAuth; await fn(...)`)
    // leaves `this` undefined → TypeError → signed-in soft-anon omit.
    let receivedThis: unknown
    const server = {
      _client: {
        call: async () => ({data: {token: SERVICE_JWT}}),
      },
      async getServiceAuth(
        this: {_client?: {call: () => Promise<{data: {token: string}}>}},
        _params: ServiceAuthParams,
      ) {
        receivedThis = this
        if (this == null || this._client == null) {
          throw new TypeError(
            "Cannot read properties of undefined (reading '_client')",
          )
        }
        return this._client.call()
      },
    }
    const agent: ServiceAuthAgent = {
      session: {accessJwt: ''},
      oauthSession: {fetchHandler: async () => jsonResponse({})},
      com: {atproto: {server}},
    }

    await expect(
      mintNotesServiceAuth(agent, {aud: NOTES_DID, lxm: NOTES_LXM.propose}),
    ).resolves.toBe(SERVICE_JWT)
    expect(receivedThis).toBe(server)
  })
})

describe('fetchWithAgentAuth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = notesFetchMock()
  })

  afterEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = originalFetch
  })

  it('omits Authorization for intentional soft-anon (empty accessJwt, no oauthSession)', async () => {
    await fetchWithAgentAuth({session: {accessJwt: ''}}, NOTES_GET, {
      method: 'GET',
    })

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.get('Authorization')).toBeNull()
    expect(headers.get('Authorization') === 'Bearer ').toBe(false)
  })

  it('never sends Authorization: Bearer with an empty token', async () => {
    await fetchWithAgentAuth(
      {session: {accessJwt: ''}, oauthSession: undefined},
      NOTES_GET,
      {method: 'GET'},
    )

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    const header = headers.get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
  })

  it('sends Bearer when a password accessJwt is present', async () => {
    await fetchWithAgentAuth(
      {session: {accessJwt: 'password-jwt'}},
      NOTES_VOTE,
      {
        method: 'POST',
      },
    )

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe('Bearer password-jwt')
  })

  it('OAuth mints service-auth and sends Bearer, not notes-URL DPoP', async () => {
    const fetchHandler = jest.fn(async () => {
      throw new Error('must not DPoP notes')
    })
    const getServiceAuth = jest.fn(async (_params: ServiceAuthParams) => ({
      data: {token: SERVICE_JWT},
    }))
    const agent: ServiceAuthAgent = {
      session: {accessJwt: ''},
      oauthSession: {fetchHandler},
      com: {atproto: {server: {getServiceAuth}}},
    }

    await fetchWithAgentAuth(
      agent,
      NOTES_GET,
      {method: 'GET'},
      {
        lxm: NOTES_LXM.getProposals,
      },
    )

    expect(getServiceAuth).toHaveBeenCalledTimes(1)
    expect(getServiceAuth).toHaveBeenCalledWith({
      aud: NOTES_DID,
      lxm: NOTES_LXM.getProposals,
    })
    expect(fetchHandler).not.toHaveBeenCalled()

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
    expect(headers.has('DPoP')).toBe(false)
    expect(headers.get('Authorization')?.startsWith('DPoP')).toBe(false)
  })

  it('never takes the password-JWT path when oauthSession is present', async () => {
    const getServiceAuth = jest.fn(async () => ({
      data: {token: SERVICE_JWT},
    }))
    await fetchWithAgentAuth(
      {
        session: {accessJwt: 'leftover-password-jwt'},
        oauthSession: {
          fetchHandler: jest.fn(async () => {
            throw new Error('must not DPoP notes')
          }),
        },
        com: {atproto: {server: {getServiceAuth}}},
      },
      NOTES_GET,
      {method: 'GET'},
      {lxm: NOTES_LXM.getProposals},
    )

    expect(getServiceAuth).toHaveBeenCalledTimes(1)
    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
    expect(headers.get('Authorization')).not.toBe(
      'Bearer leftover-password-jwt',
    )
  })

  it('OAuth still sends Bearer when getServiceAuth is this-bound (not TypeError soft-anon)', async () => {
    const server = {
      _client: {
        call: async () => ({data: {token: SERVICE_JWT}}),
      },
      async getServiceAuth(
        this: {_client?: {call: () => Promise<{data: {token: string}}>}},
        _params: ServiceAuthParams,
      ) {
        if (this == null || this._client == null) {
          throw new TypeError(
            "Cannot read properties of undefined (reading '_client')",
          )
        }
        return this._client.call()
      },
    }
    await fetchWithAgentAuth(
      {
        session: {accessJwt: ''},
        oauthSession: {fetchHandler: async () => jsonResponse({})},
        com: {atproto: {server}},
      },
      NOTES_GET,
      {method: 'GET'},
      {lxm: NOTES_LXM.getProposals, requireAuth: false},
    )

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
  })

  it('getProposals falls back to soft-anon when service-auth mint fails', async () => {
    const getServiceAuth = jest.fn(async () => {
      throw new Error('PDS getServiceAuth failed')
    })
    await fetchWithAgentAuth(
      {
        session: {accessJwt: ''},
        oauthSession: {fetchHandler: async () => jsonResponse({})},
        com: {atproto: {server: {getServiceAuth}}},
      },
      NOTES_GET,
      {method: 'GET'},
      {lxm: NOTES_LXM.getProposals, requireAuth: false},
    )

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.has('Authorization')).toBe(false)
  })

  it('throws when requireAuth mint fails (propose/vote)', async () => {
    const getServiceAuth = jest.fn(async () => {
      throw new Error('PDS getServiceAuth failed')
    })
    await expect(
      fetchWithAgentAuth(
        {
          session: {accessJwt: ''},
          oauthSession: {fetchHandler: async () => jsonResponse({})},
          com: {atproto: {server: {getServiceAuth}}},
        },
        NOTES_VOTE,
        {method: 'POST'},
        {lxm: NOTES_LXM.vote, requireAuth: true},
      ),
    ).rejects.toThrow('PDS getServiceAuth failed')
    const notesCalls = (globalThis.fetch as jest.Mock).mock.calls.filter(
      ([url]) => String(url).includes(NOTES_LXM.vote),
    )
    expect(notesCalls).toHaveLength(0)
  })
})

describe('community notes API auth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = notesFetchMock()
  })

  afterEach(() => {
    resetNotesConfigCache()
    globalThis.fetch = originalFetch
  })

  it('getProposals omits Authorization when accessJwt is empty (soft-anon)', async () => {
    await getProposals(passwordAgent(''), NOTES_POST_URI)

    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    const header = headers.get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
  })

  it('getProposals sends Bearer for a password session', async () => {
    await getProposals(passwordAgent('password-jwt'), NOTES_POST_URI)

    const {url, headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(url).toContain(NOTES_LXM.getProposals)
    expect(headers.get('Authorization')).toBe('Bearer password-jwt')
  })

  it('getProposals mints service-auth for an OAuth session (viewer context)', async () => {
    const getServiceAuth = jest.fn(async (_params: ServiceAuthParams) => ({
      data: {token: SERVICE_JWT},
    }))
    const fetchHandler = jest.fn(async () => {
      throw new Error('must not DPoP notes')
    })
    const result = await getProposals(
      oauthAgent({getServiceAuth, fetchHandler}),
      NOTES_POST_URI,
    )

    expect(result.proposals[0]?.note).toBe('context from the service')
    expect(getServiceAuth).toHaveBeenCalledWith({
      aud: NOTES_DID,
      lxm: NOTES_LXM.getProposals,
    })
    expect(fetchHandler).not.toHaveBeenCalled()
    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
    expect(headers.has('DPoP')).toBe(false)
  })

  it('propose mints service-auth for an OAuth session', async () => {
    const getServiceAuth = jest.fn(async (_params: ServiceAuthParams) => ({
      data: {token: SERVICE_JWT},
    }))
    const fetchHandler = jest.fn(async () => {
      throw new Error('must not DPoP notes')
    })
    await propose(
      oauthAgent({getServiceAuth, fetchHandler}),
      NOTES_POST_URI,
      'context',
      [],
    )

    expect(getServiceAuth).toHaveBeenCalledWith({
      aud: NOTES_DID,
      lxm: NOTES_LXM.propose,
    })
    expect(fetchHandler).not.toHaveBeenCalled()
    const {url, init, headers} = lastNotesXrpcCall(
      globalThis.fetch as jest.Mock,
    )
    expect(url).toContain(NOTES_LXM.propose)
    expect(init?.method).toBe('POST')
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
    expect(headers.has('DPoP')).toBe(false)
  })

  it('vote mints service-auth for an OAuth session', async () => {
    const getServiceAuth = jest.fn(async (_params: ServiceAuthParams) => ({
      data: {token: SERVICE_JWT},
    }))
    const fetchHandler = jest.fn(async () => {
      throw new Error('must not DPoP notes')
    })
    await vote(
      oauthAgent({getServiceAuth, fetchHandler}),
      NOTES_NOTE_URI,
      'helpful',
      [],
    )

    expect(getServiceAuth).toHaveBeenCalledWith({
      aud: NOTES_DID,
      lxm: NOTES_LXM.vote,
    })
    expect(fetchHandler).not.toHaveBeenCalled()
    const {url, init, headers} = lastNotesXrpcCall(
      globalThis.fetch as jest.Mock,
    )
    expect(url).toContain(NOTES_LXM.vote)
    expect(init?.method).toBe('POST')
    expect(headers.get('Authorization')).toBe(`Bearer ${SERVICE_JWT}`)
    expect(headers.has('DPoP')).toBe(false)
  })

  it('propose sends Bearer for a password session and does not mint service-auth', async () => {
    const getServiceAuth = jest.fn(async () => ({
      data: {token: SERVICE_JWT},
    }))
    const agent = {
      ...passwordAgent('password-jwt'),
      com: {atproto: {server: {getServiceAuth}}},
    } as unknown as BskyAgent

    await propose(agent, NOTES_POST_URI, 'context', [])

    expect(getServiceAuth).not.toHaveBeenCalled()
    const {headers} = lastNotesXrpcCall(globalThis.fetch as jest.Mock)
    expect(headers.get('Authorization')).toBe('Bearer password-jwt')
  })

  it('propose fails closed when OAuth service-auth mint fails', async () => {
    const getServiceAuth = jest.fn(async () => {
      throw new Error('PDS getServiceAuth failed')
    })
    await expect(
      propose(oauthAgent({getServiceAuth}), NOTES_POST_URI, 'context', []),
    ).rejects.toThrow('PDS getServiceAuth failed')
    const proposeCalls = (globalThis.fetch as jest.Mock).mock.calls.filter(
      ([url]) => String(url).includes(NOTES_LXM.propose),
    )
    expect(proposeCalls).toHaveLength(0)
  })

  it('accepts did#serviceId audience from getConfig as getServiceAuth aud', async () => {
    const aud = `${NOTES_DID}#atproto_pds`
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(NOTES_LXM.getConfig)) {
        return jsonResponse({
          version: '1',
          labelerDid: 'did:plc:labeler',
          feedGeneratorDid: aud,
        })
      }
      return jsonResponse({
        uri: NOTES_NOTE_URI,
        cid: 'bafy',
        proposal: {uri: NOTES_NOTE_URI},
      })
    })
    const getServiceAuth = jest.fn(async (_params: ServiceAuthParams) => ({
      data: {token: SERVICE_JWT},
    }))

    await propose(oauthAgent({getServiceAuth}), NOTES_POST_URI, 'context', [])

    expect(getServiceAuth).toHaveBeenCalledWith({
      aud,
      lxm: NOTES_LXM.propose,
    })
  })
})
