import {describe, expect, it, jest} from '@jest/globals'

import {oauthResumeSession} from '../oauth-agent'
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
