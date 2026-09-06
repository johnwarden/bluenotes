import {type BskyAgent} from '@atproto/api'
import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals'

import {getProposals, propose, vote} from '../community-notes'
import {
  fetchWithAgentAuth,
  getOauthSessionFromAgent,
  getPasswordAccessJwt,
  type ServiceAuthAgent,
} from '../community-notes-auth'

const NOTES_POST_URI = 'at://did:plc:post/app.bsky.feed.post/1'
const NOTES_NOTE_URI = 'at://did:plc:note/org.opencommunitynotes.proposal/1'
const NOTES_GET =
  'https://api.bluenotes.social/xrpc/org.opencommunitynotes.getProposals'
const NOTES_VOTE = 'https://api.bluenotes.social/xrpc/org.opencommunitynotes.vote'

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
  accessJwt = '',
): BskyAgent {
  return {
    service: {toString: () => 'https://bsky.social'},
    session: {accessJwt},
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

describe('getOauthSessionFromAgent', () => {
  it('returns the session when fetchHandler is present', () => {
    const fetchHandler = async () => jsonResponse({})
    expect(
      getOauthSessionFromAgent({oauthSession: {fetchHandler}}),
    ).toEqual({fetchHandler})
  })

  it('returns undefined when fetchHandler is missing', () => {
    expect(getOauthSessionFromAgent({oauthSession: {} as never})).toBeUndefined()
    expect(getOauthSessionFromAgent({session: {accessJwt: ''}})).toBeUndefined()
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

  it('omits Authorization for intentional soft-anon (empty accessJwt, no oauthSession)', async () => {
    await fetchWithAgentAuth({session: {accessJwt: ''}}, NOTES_GET, {
      method: 'GET',
    })

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const headers = new Headers(init.headers)
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

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const header = new Headers(init.headers).get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
  })

  it('sends Bearer when a password accessJwt is present', async () => {
    await fetchWithAgentAuth({session: {accessJwt: 'password-jwt'}}, NOTES_VOTE, {
      method: 'POST',
    })

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

    await fetchWithAgentAuth(agent, NOTES_GET, {method: 'GET'})

    expect(fetchHandler).toHaveBeenCalledTimes(1)
    expect(fetchHandler).toHaveBeenCalledWith(NOTES_GET, {method: 'GET'})
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('never takes the password-JWT path when oauthSession is present', async () => {
    const fetchHandler = jest.fn(async () => jsonResponse({ok: true}))
    await fetchWithAgentAuth(
      {
        session: {accessJwt: 'leftover-password-jwt'},
        oauthSession: {fetchHandler},
      },
      NOTES_GET,
      {method: 'GET'},
    )

    expect(fetchHandler).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('throws when oauthSession exists but fetchHandler is missing', async () => {
    await expect(
      fetchWithAgentAuth(
        {session: {accessJwt: 'leftover-jwt'}, oauthSession: {} as never},
        NOTES_GET,
        {method: 'GET'},
      ),
    ).rejects.toThrow('OAuth session is missing fetchHandler')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})

describe('community notes API auth', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('getProposals')) {
        return jsonResponse({
          proposals: [{uri: NOTES_NOTE_URI, note: 'context from the service'}],
        })
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

  it('getProposals omits Authorization when accessJwt is empty (soft-anon)', async () => {
    await getProposals(passwordAgent(''), NOTES_POST_URI)

    const [, init] = (globalThis.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ]
    const header = new Headers(init.headers).get('Authorization')
    expect(header).toBeNull()
    expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
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

  it('getProposals uses DPoP fetchHandler for an OAuth session', async () => {
    const fetchHandler = jest.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({
        proposals: [{uri: NOTES_NOTE_URI, note: 'context from the service'}],
      }),
    )
    const result = await getProposals(oauthAgent(fetchHandler), NOTES_POST_URI)

    expect(result.proposals[0]?.note).toBe('context from the service')
    expect(fetchHandler).toHaveBeenCalledTimes(1)
    const [url] = fetchHandler.mock.calls[0]
    expect(url).toContain('org.opencommunitynotes.getProposals')
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('getProposals DPoP path does not send empty Bearer', async () => {
    const fetchHandler = jest.fn(async (_url: string, init?: RequestInit) => {
      const header = new Headers(init?.headers).get('Authorization')
      expect(header === 'Bearer ' || header === 'Bearer').toBe(false)
      expect(Boolean(header?.startsWith('Bearer'))).toBe(false)
      return jsonResponse({proposals: []})
    })
    await getProposals(oauthAgent(fetchHandler, ''), NOTES_POST_URI)
    expect(fetchHandler).toHaveBeenCalledTimes(1)
    expect(globalThis.fetch).not.toHaveBeenCalled()
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
