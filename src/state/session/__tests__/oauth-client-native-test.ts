import {describe, expect, it} from '@jest/globals'

import {
  hasLeftoverOauthGrantInUrl,
  hasPendingOauthCallback,
  initOAuthClient,
  isLocalOAuthRevokeInProgress,
  peekLastOauthInitError,
  reportOauthFailureDiagnosis,
  revokeOAuthSession,
  subscribeOAuthSessionDeleted,
} from '../oauth-client'

describe('native oauth-client stubs', () => {
  it('init and callback helpers are inert', async () => {
    await expect(initOAuthClient()).resolves.toBeUndefined()
    expect(hasPendingOauthCallback()).toBe(false)
    expect(hasLeftoverOauthGrantInUrl()).toBe(false)
    expect(peekLastOauthInitError()).toBeUndefined()
    expect(() => reportOauthFailureDiagnosis(new Error('x'))).not.toThrow()
  })

  it('revokeOAuthSession is a no-op that does not throw', async () => {
    await expect(revokeOAuthSession('did:plc:alice')).resolves.toBeUndefined()
  })

  it('session-deleted subscription is a no-op', () => {
    const unsubscribe = subscribeOAuthSessionDeleted(() => {
      throw new Error('should not fire on native')
    })
    expect(isLocalOAuthRevokeInProgress('did:plc:alice')).toBe(false)
    expect(() => unsubscribe()).not.toThrow()
  })
})
