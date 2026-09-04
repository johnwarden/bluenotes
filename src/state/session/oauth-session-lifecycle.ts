import {type AtpSessionEvent} from '@atproto/api'

import {revokeOAuthSession} from './oauth-client'
import {type SessionAccount} from './types'

/**
 * DIDs that should be revoked at the authorization server when logging out.
 * Password sessions only clear local JWTs; OAuth sessions need an AS revoke.
 */
export function oauthDidsToRevokeOnLogout(
  accounts: SessionAccount[],
  scope: 'current' | 'every',
  currentDid: string | undefined,
): string[] {
  const candidates =
    scope === 'current'
      ? accounts.filter(account => account.did === currentDid)
      : accounts
  return candidates
    .filter(account => account.isOauthSession)
    .map(account => account.did)
}

/**
 * Map a BrowserOAuthClient `deleted` cause to the password-path
 * persistSession event. `OAuthSession` itself has no event API; the client
 * emits `deleted` / `updated` (not `sessionadd`).
 *
 * TokenRevokedError from our own logout is filtered by the caller so we do
 * not toast "session expired" on an intentional sign-out. Other deleted
 * causes (refresh failure, invalid token, unexpected) map to `expired`.
 */
export function oauthDeletedCauseToSessionEvent(
  _cause: unknown,
): AtpSessionEvent {
  // TokenRefreshError, TokenInvalidError, TokenRevokedError, and unexpected
  // causes all mean the stored OAuth session is gone. Map to persistSession
  // `expired`. Callers skip dispatch when a local logout revoke is in flight.
  return 'expired'
}

export function isLocalOAuthRevokeCause(cause: unknown): boolean {
  return isNamedError(cause, 'TokenRevokedError')
}

/**
 * Best-effort revoke for OAuth accounts in the logout scope.
 * Does not throw; individual revoke errors are handled by revokeOAuthSession.
 */
export function revokeOAuthSessionsForLogout(
  accounts: SessionAccount[],
  scope: 'current' | 'every',
  currentDid: string | undefined,
  revoke: (did: string) => Promise<void> = revokeOAuthSession,
): void {
  for (const did of oauthDidsToRevokeOnLogout(accounts, scope, currentDid)) {
    revoke(did).catch(() => {})
  }
}

function isNamedError(cause: unknown, name: string): boolean {
  if (!cause || typeof cause !== 'object') {
    return false
  }
  const error = cause as {name?: string; constructor?: {name?: string}}
  return error.name === name || error.constructor?.name === name
}
