import {describe, expect, it, jest} from '@jest/globals'

import {
  isOauthAppViewGetProfilePath,
  oauthAgentToSessionAccount,
  oauthResumeSession,
  protectOauthSessionFromAppViewGetProfile,
  publicAppViewGetProfileUrl,
  toPublicAppViewProfileUrl,
} from '../oauth-agent'
import {restoreOAuthSession} from '../oauth-client'
import {type SessionAccount} from '../types'

jest.mock('../oauth-client', () => ({
  restoreOAuthSession: jest.fn(),
  revokeOAuthSession: jest.fn(() => Promise.resolve()),
  isLocalOAuthRevokeInProgress: () => false,
  subscribeOAuthSessionDeleted: () => () => {},
}))

const storedAccount: SessionAccount = {
  service: 'https://bsky.social',
  did: 'did:plc:alice',
  handle: 'alice.test',
  isOauthSession: true,
}

function oauthSession(overrides?: {
  getTokenInfo?: () => Promise<{
    aud: string
    sub: string
    scope: string
    iss: string
  }>
}) {
  return {
    did: 'did:plc:alice',
    serverMetadata: {issuer: 'https://bsky.social'},
    getTokenInfo:
      overrides?.getTokenInfo ??
      (async () => ({
        aud: 'https://truffle.us-east.host.bsky.network',
        sub: 'did:plc:alice',
        scope: 'atproto transition:generic',
        iss: 'https://bsky.social',
      })),
  }
}

function mockPublicProfileFetch(handle: string | null, ok = true) {
  return jest.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    json: async () => (handle ? {handle} : {}),
  } as Response)
}

describe('oauthAgentToSessionAccount', () => {
  it('does not call PDS getSession or DPoP getProfile (401 would delete the session)', async () => {
    const fetchMock = mockPublicProfileFetch('jonathanwarden.com')
    const agent = {
      configureProxy: jest.fn(),
      com: {
        atproto: {
          server: {
            getSession: jest.fn(async () => {
              throw new Error('getSession must not run for OAuth')
            }),
          },
        },
      },
      app: {
        bsky: {
          actor: {
            getProfile: jest.fn(async () => {
              throw new Error('DPoP getProfile must not run for OAuth')
            }),
          },
        },
      },
    }

    try {
      const account = await oauthAgentToSessionAccount(
        agent as never,
        oauthSession() as never,
      )

      expect(account).toMatchObject({
        did: 'did:plc:alice',
        handle: 'jonathanwarden.com',
        isOauthSession: true,
        pdsUrl: 'https://truffle.us-east.host.bsky.network',
      })
      expect(agent.com.atproto.server.getSession).not.toHaveBeenCalled()
      expect(agent.app.bsky.actor.getProfile).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledWith(
        publicAppViewGetProfileUrl('did:plc:alice'),
        expect.objectContaining({method: 'GET'}),
      )
      expect(agent.configureProxy).toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })

  it('falls back to the DID when public getProfile fails', async () => {
    const fetchMock = mockPublicProfileFetch(null, false)
    const agent = {
      configureProxy: jest.fn(),
      com: {
        atproto: {
          server: {
            getSession: jest.fn(),
          },
        },
      },
      app: {
        bsky: {
          actor: {
            getProfile: jest.fn(async () => {
              throw new Error('Unavailable')
            }),
          },
        },
      },
    }

    try {
      const account = await oauthAgentToSessionAccount(
        agent as never,
        oauthSession() as never,
      )

      expect(account.did).toBe('did:plc:alice')
      expect(account.handle).toBe('did:plc:alice')
      expect(account.isOauthSession).toBe(true)
      expect(agent.com.atproto.server.getSession).not.toHaveBeenCalled()
      expect(agent.app.bsky.actor.getProfile).not.toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })
})

describe('protectOauthSessionFromAppViewGetProfile', () => {
  it('matches getProfile but not getProfiles', () => {
    expect(
      isOauthAppViewGetProfilePath(
        '/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
      ),
    ).toBe(true)
    expect(
      isOauthAppViewGetProfilePath(
        'https://pds.example/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
      ),
    ).toBe(true)
    expect(
      isOauthAppViewGetProfilePath('/xrpc/app.bsky.actor.getProfiles'),
    ).toBe(false)
  })

  it('rewrites PDS getProfile URLs onto public AppView', () => {
    expect(
      toPublicAppViewProfileUrl(
        'https://truffle.us-east.host.bsky.network/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
      ),
    ).toBe(
      'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
    )
  })

  it('routes getProfile through public AppView so DPoP 401 cannot delStored', async () => {
    const inner = jest.fn(async () => new Response('nope', {status: 401}))
    const session = {fetchHandler: inner}
    protectOauthSessionFromAppViewGetProfile(session)
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'))

    try {
      await session.fetchHandler(
        '/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
        {method: 'GET'},
      )
      expect(inner).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledWith(
        'https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=did:plc:alice',
        expect.objectContaining({method: 'GET'}),
      )

      await session.fetchHandler('/xrpc/com.atproto.server.getSession', {
        method: 'GET',
      })
      expect(inner).toHaveBeenCalled()
    } finally {
      fetchMock.mockRestore()
    }
  })
})

describe('oauthResumeSession', () => {
  it('dispatches create-failed when OAuth restore throws', async () => {
    const restore = restoreOAuthSession as jest.MockedFunction<
      typeof restoreOAuthSession
    >
    restore.mockRejectedValue(new Error('session gone'))
    const onSessionChange = jest.fn()

    await expect(
      oauthResumeSession(storedAccount, onSessionChange),
    ).rejects.toThrow('session gone')

    expect(onSessionChange).toHaveBeenCalledWith(
      expect.objectContaining({session: undefined}),
      'did:plc:alice',
      'create-failed',
    )
  })
})
