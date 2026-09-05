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
  it('still establishes an account when PDS getSession returns 401', async () => {
    const agent = {
      configureProxy: jest.fn(),
      com: {
        atproto: {
          server: {
            getSession: jest.fn(async () => {
              const err = new Error('Unauthorized')
              ;(err as Error & {status: number}).status = 401
              throw err
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
    expect(agent.app.bsky.actor.getProfile).toHaveBeenCalled()
    expect(agent.configureProxy).toHaveBeenCalled()
  })

  it('uses getSession handle/email when the PDS allows it', async () => {
    const agent = {
      configureProxy: jest.fn(),
      com: {
        atproto: {
          server: {
            getSession: jest.fn(async () => ({
              data: {
                did: 'did:plc:alice',
                handle: 'alice.test',
                email: 'alice@example.com',
                emailConfirmed: true,
                active: true,
              },
            })),
          },
        },
      },
      app: {
        bsky: {
          actor: {
            getProfile: jest.fn(),
          },
        },
      },
    }

    const account = await oauthAgentToSessionAccount(
      agent as never,
      oauthSession() as never,
    )

    expect(account.handle).toBe('alice.test')
    expect(account.email).toBe('alice@example.com')
    expect(agent.app.bsky.actor.getProfile).not.toHaveBeenCalled()
    expect(agent.configureProxy).not.toHaveBeenCalled()
  })

  it('falls back to the DID when getSession and getProfile both fail', async () => {
    const agent = {
      configureProxy: jest.fn(),
      com: {
        atproto: {
          server: {
            getSession: jest.fn(async () => {
              throw new Error('Unauthorized')
            }),
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
