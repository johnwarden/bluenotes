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

describe('oauthAgentToSessionAccount', () => {
  it('rethrows getSession failures instead of returning undefined', async () => {
    const agent = {
      com: {
        atproto: {
          server: {
            getSession: jest.fn(async () => {
              throw new Error('AppView rejected getSession')
            }),
          },
        },
      },
    }
    const session = {
      did: 'did:plc:alice',
      serverMetadata: {issuer: 'https://bsky.social'},
      getTokenInfo: jest.fn(),
    }

    await expect(
      oauthAgentToSessionAccount(agent as never, session as never),
    ).rejects.toThrow('AppView rejected getSession')
    expect(session.getTokenInfo).not.toHaveBeenCalled()
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
