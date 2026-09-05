import {describe, expect, it, jest} from '@jest/globals'

import {oauthAgentToSessionAccount, oauthResumeSession} from '../oauth-agent'
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

describe('oauthAgentToSessionAccount', () => {
  it('does not call PDS getSession (401 would delete the DPoP session)', async () => {
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
            getProfile: jest.fn(async () => ({
              data: {did: 'did:plc:alice', handle: 'jonathanwarden.com'},
            })),
          },
        },
      },
    }

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
    expect(agent.app.bsky.actor.getProfile).toHaveBeenCalled()
    expect(agent.configureProxy).toHaveBeenCalled()
  })

  it('falls back to the DID when getProfile fails', async () => {
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

    const account = await oauthAgentToSessionAccount(
      agent as never,
      oauthSession() as never,
    )

    expect(account.did).toBe('did:plc:alice')
    expect(account.handle).toBe('did:plc:alice')
    expect(account.isOauthSession).toBe(true)
    expect(agent.com.atproto.server.getSession).not.toHaveBeenCalled()
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
