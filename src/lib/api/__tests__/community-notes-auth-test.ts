import {type BskyAgent} from '@atproto/api'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'

import {getProposals, propose, vote} from '../community-notes'
import {
  fetchWithAgentAuth,
  getPasswordAccessJwt,
  type ServiceAuthAgent,
} from '../community-notes-auth'

const NOTES_POST_URI = 'at://did:plc:post/app.bsky.feed.post/1'
const NOTES_NOTE_URI = 'at://did:plc:note/org.opencommunitynotes.proposal/1'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

function passwordAgent(accessJwt: string): BskyAgent {
  return {
    service: {toString: () => 'https://bsky.social'},
    session: {accessJwt},
  } as unknown as BskyAgent
}

function oauthAgent(
  fetchHandler: (url: string, init?: RequestInit) => Promise<Response>,
): BskyAgent {
  return {
    service: {toString: () => 'https://bsky.social'},
    session: {accessJwt: ''},
    oauthSession: {fetchHandler},
  } as unknown as BskyAgent
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

describe('fetchWithAgentAuth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = jest.fn(async () => jsonResponse({ok: true}))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('omits Authorization when accessJwt is empty', async () => {
    await fetchWithAgentAuth(
      {session: {accessJwt: ''}},
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals',
      {method: 'GET'},
    )

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const headers = new Headers(init.headers)
    expect(headers.has('Authorization')).toBe(false)
    expect(headers.get('Authorization')).toBeNull()
  })

  it('sends Bearer when a password accessJwt is present', async () => {
    await fetchWithAgentAuth(
      {session: {accessJwt: 'password-jwt'}},
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.vote',
      {method: 'POST'},
    )

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer password-jwt',
    )
  })

  it('uses OAuthSession.fetchHandler (DPoP) and does not send Bearer accessJwt', async () => {
    const fetchHandler = jest.fn(async (url: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      headers.set('Authorization', 'DPoP oauth-access-token')
      headers.set('DPoP', 'mocked-dpop-proof')
      return globalThis.fetch(url, {...init, headers})
    })
    const agent: ServiceAuthAgent = {
      session: {accessJwt: ''},
      oauthSession: {fetchHandler},
    }

    globalThis.fetch = jest.fn(async (_input, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('Authorization')).toBe('DPoP oauth-access-token')
      expect(headers.get('DPoP')).toBe('mocked-dpop-proof')
      expect(headers.get('Authorization')?.startsWith('Bearer')).toBe(false)
      return jsonResponse({ok: true})
    }) as typeof fetch

    await fetchWithAgentAuth(
      agent,
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.vote',
      {method: 'POST'},
    )

    expect(fetchHandler).toHaveBeenCalledTimes(1)
    expect(fetchHandler).toHaveBeenCalledWith(
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.vote',
      {method: 'POST'},
    )
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('never sends Authorization: Bearer with an empty token', async () => {
    await fetchWithAgentAuth(
      {session: {accessJwt: ''}, oauthSession: undefined},
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals',
      {method: 'GET'},
      {optionalAuth: true},
    )

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const header = new Headers(init.headers).get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
  })

  it('optionalAuth + OAuth omits Authorization and does not call fetchHandler', async () => {
    const fetchHandler = jest.fn(async () => jsonResponse({ok: true}))
    const agent: ServiceAuthAgent = {
      session: {accessJwt: ''},
      oauthSession: {fetchHandler},
    }

    await fetchWithAgentAuth(
      agent,
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals',
      {method: 'GET'},
      {optionalAuth: true},
    )

    expect(fetchHandler).not.toHaveBeenCalled()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
  })

  it('optionalAuth retries without Authorization after a password 401', async () => {
    globalThis.fetch = jest.fn(async (_input, init?: RequestInit) => {
      const header = new Headers(init?.headers).get('Authorization')
      if (header === 'Bearer expired-jwt') {
        return jsonResponse({error: 'AuthenticationRequired'}, 401)
      }
      return jsonResponse({proposals: []})
    }) as typeof fetch

    const response = await fetchWithAgentAuth(
      {session: {accessJwt: 'expired-jwt'}},
      'https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals',
      {method: 'GET'},
      {optionalAuth: true},
    )

    expect(response.status).toBe(200)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
    const [, retryInit] = (globalThis.fetch as jest.Mock).mock.calls[1] as [
      string,
      RequestInit,
    ]
    expect(new Headers(retryInit.headers).has('Authorization')).toBe(false)
  })
})

describe('community notes API auth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('getProposals')) {
        return jsonResponse({proposals: []})
      }
      if (url.includes('propose')) {
        return jsonResponse({
          uri: NOTES_NOTE_URI,
          cid: 'bafy',
          proposal: {uri: NOTES_NOTE_URI},
        })
      }
      if (url.includes('vote')) {
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
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('getProposals omits Authorization when accessJwt is empty', async () => {
    await getProposals(passwordAgent(''), NOTES_POST_URI)

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(new Headers(init.headers).has('Authorization')).toBe(false)
  })

  it('getProposals sends Bearer for a password session', async () => {
    await getProposals(passwordAgent('password-jwt'), NOTES_POST_URI)

    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(url).toContain('org.opencommunitynotes.getProposals')
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer password-jwt',
    )
  })

  it('getProposals omits Authorization for an OAuth session (no empty Bearer, no DPoP)', async () => {
    const fetchHandler = jest.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({error: 'AuthenticationRequired'}, 401),
    )
    const result = await getProposals(oauthAgent(fetchHandler), NOTES_POST_URI)

    expect(result).toEqual({proposals: []})
    expect(fetchHandler).not.toHaveBeenCalled()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(url).toContain('org.opencommunitynotes.getProposals')
    const header = new Headers(init.headers).get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
  })

  it('propose uses DPoP fetchHandler for an OAuth session', async () => {
    const fetchHandler = jest.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        uri: NOTES_NOTE_URI,
        cid: 'bafy',
        proposal: {uri: NOTES_NOTE_URI},
      }),
    )
    await propose(oauthAgent(fetchHandler), NOTES_POST_URI, 'context', [])

    expect(fetchHandler).toHaveBeenCalledTimes(1)
    const [url, init] = fetchHandler.mock.calls[0]
    expect(url).toContain('org.opencommunitynotes.propose')
    expect(init?.method).toBe('POST')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('vote uses DPoP fetchHandler for an OAuth session', async () => {
    const fetchHandler = jest.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        success: true,
        rating: {
          uri: 'at://did:plc:note/org.opencommunitynotes.rating/1',
          targetUri: NOTES_NOTE_URI,
          cts: '2026-01-01T00:00:00.000Z',
          val: 1,
          reasons: [],
        },
      }),
    )
    await vote(oauthAgent(fetchHandler), NOTES_NOTE_URI, 'helpful', [])

    expect(fetchHandler).toHaveBeenCalledTimes(1)
    const [url, init] = fetchHandler.mock.calls[0]
    expect(url).toContain('org.opencommunitynotes.vote')
    expect(init?.method).toBe('POST')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('propose sends Bearer for a password session', async () => {
    await propose(passwordAgent('password-jwt'), NOTES_POST_URI, 'context', [])

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    expect(new Headers(init.headers).get('Authorization')).toBe(
      'Bearer password-jwt',
    )
  })
})
