import {describe, expect, it, jest} from '@jest/globals'

import {
  isLocalOAuthRevokeCause,
  oauthDeletedCauseToSessionEvent,
  oauthDidsToRevokeOnLogout,
  revokeOAuthSessionsForLogout,
} from '../oauth-session-lifecycle'
import {type SessionAccount} from '../types'

function account(
  overrides: Partial<SessionAccount> & Pick<SessionAccount, 'did'>,
): SessionAccount {
  return {
    service: 'https://bsky.social',
    handle: `${overrides.did}.test`,
    ...overrides,
  }
}

const oauthAlice = account({
  did: 'did:plc:alice',
  isOauthSession: true,
})
const oauthBob = account({
  did: 'did:plc:bob',
  isOauthSession: true,
})
const passwordCarla = account({
  did: 'did:plc:carla',
  accessJwt: 'carla-access',
  refreshJwt: 'carla-refresh',
})

describe('oauthDidsToRevokeOnLogout', () => {
  it('revokes only the current OAuth account on current-scope logout', () => {
    expect(
      oauthDidsToRevokeOnLogout(
        [oauthAlice, oauthBob, passwordCarla],
        'current',
        oauthAlice.did,
      ),
    ).toEqual(['did:plc:alice'])
  })

  it('does not revoke a password session on current-scope logout', () => {
    expect(
      oauthDidsToRevokeOnLogout(
        [passwordCarla, oauthAlice],
        'current',
        passwordCarla.did,
      ),
    ).toEqual([])
  })

  it('revokes every OAuth account on every-scope logout', () => {
    expect(
      oauthDidsToRevokeOnLogout(
        [oauthAlice, passwordCarla, oauthBob],
        'every',
        oauthAlice.did,
      ),
    ).toEqual(['did:plc:alice', 'did:plc:bob'])
  })

  it('returns no DIDs when there is no current account', () => {
    expect(
      oauthDidsToRevokeOnLogout([oauthAlice], 'current', undefined),
    ).toEqual([])
  })
})

describe('revokeOAuthSessionsForLogout', () => {
  it('calls revoke for each OAuth DID on logout', () => {
    const revoke = jest.fn(() => Promise.resolve())

    revokeOAuthSessionsForLogout(
      [oauthAlice, passwordCarla, oauthBob],
      'every',
      oauthAlice.did,
      revoke,
    )

    expect(revoke).toHaveBeenCalledTimes(2)
    expect(revoke).toHaveBeenCalledWith('did:plc:alice')
    expect(revoke).toHaveBeenCalledWith('did:plc:bob')
  })

  it('does not call revoke for password-only current logout', () => {
    const revoke = jest.fn(() => Promise.resolve())

    revokeOAuthSessionsForLogout(
      [passwordCarla],
      'current',
      passwordCarla.did,
      revoke,
    )

    expect(revoke).not.toHaveBeenCalled()
  })
})

describe('oauthDeletedCauseToSessionEvent', () => {
  it('maps refresh / invalid / revoked / unknown deleted causes to expired', () => {
    expect(oauthDeletedCauseToSessionEvent({name: 'TokenRefreshError'})).toBe(
      'expired',
    )
    expect(oauthDeletedCauseToSessionEvent({name: 'TokenInvalidError'})).toBe(
      'expired',
    )
    expect(oauthDeletedCauseToSessionEvent({name: 'TokenRevokedError'})).toBe(
      'expired',
    )
    expect(oauthDeletedCauseToSessionEvent(new Error('nope'))).toBe('expired')
  })

  it('identifies TokenRevokedError as a user-initiated revoke cause', () => {
    expect(isLocalOAuthRevokeCause({name: 'TokenRevokedError'})).toBe(true)
    expect(isLocalOAuthRevokeCause({name: 'TokenRefreshError'})).toBe(false)
  })
})
