import {type Agent} from '@atproto/lex'
import {
  type PasswordSession,
  type SessionData,
} from '@atproto/lex-password-session'
import {type OAuthSession} from '@atproto/oauth-client-browser'
import {type DidString, type HandleString} from '@atproto/syntax'

import {BSKY_SERVICE, PUBLIC_BSKY_SERVICE} from '#/lib/constants'
import {logger} from '#/logger'
import {prefetchAgeAssuranceServerData} from '#/ageAssurance/data'
import {features} from '#/analytics'
import {buildAppviewClient, buildChatClient, buildPdsClient} from './clients'
import {addSessionErrorLog} from './logging'
import {configureModerationForAccount} from './moderation'
import {
  isLocalOAuthRevokeInProgress,
  restoreOAuthSession,
  subscribeOAuthSessionDeleted,
} from './oauth-client'
import {oauthDeletedCauseToSessionEvent} from './oauth-session-lifecycle'
import {
  type OnSessionChange,
  registerBundleKillSwitch,
  type SessionBundle,
} from './session-core'
import {type SessionAccount} from './types'

/** True for `getProfile`, not `getProfiles`. */
export function isOauthAppViewGetProfilePath(pathname: string): boolean {
  return /app\.bsky\.actor\.getProfile(?:\?|$|\/|&)/.test(pathname)
}

export function publicAppViewGetProfileUrl(did: string): string {
  return `${PUBLIC_BSKY_SERVICE}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
}

export function toPublicAppViewProfileUrl(pathname: string): string {
  try {
    if (/^https?:\/\//i.test(pathname)) {
      const u = new URL(pathname)
      return `${PUBLIC_BSKY_SERVICE}${u.pathname}${u.search}`
    }
  } catch {
    // fall through
  }
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`
  const withXrpc = path.includes('/xrpc/') ? path : `/xrpc${path}`
  return `${PUBLIC_BSKY_SERVICE}${withXrpc}`
}

/**
 * AppView `getProfile` via the OAuth/DPoP session hits the PDS (`token.aud`)
 * and a 401 `invalid_token` deletes the just-exchanged session. Route
 * those reads through public AppView (no DPoP).
 */
export function protectOauthSessionFromAppViewGetProfile(session: {
  fetchHandler: (pathname: string, init?: RequestInit) => Promise<Response>
}): void {
  const inner = session.fetchHandler.bind(session)
  session.fetchHandler = async (pathname, init) => {
    if (isOauthAppViewGetProfilePath(pathname)) {
      return globalThis.fetch(toPublicAppViewProfileUrl(pathname), {
        method: init?.method ?? 'GET',
        headers: {accept: 'application/json'},
      })
    }
    return inner(pathname, init)
  }
}

export async function resolveHandleViaPublicAppView(
  did: string,
): Promise<string | undefined> {
  try {
    const res = await globalThis.fetch(publicAppViewGetProfileUrl(did), {
      method: 'GET',
      headers: {accept: 'application/json'},
    })
    if (!res.ok) {
      return undefined
    }
    const json = (await res.json()) as {handle?: unknown}
    return typeof json.handle === 'string' && json.handle.length > 0
      ? json.handle
      : undefined
  } catch {
    return undefined
  }
}

async function resolveOauthHandle(did: string): Promise<string> {
  const handle = await resolveHandleViaPublicAppView(did)
  if (handle) {
    return handle
  }
  logger.warn(`oauth: public getProfile failed; using DID as handle`)
  return did
}

export async function oauthSessionToAccount(
  session: OAuthSession,
): Promise<SessionAccount> {
  const tokenInfo = await session.getTokenInfo(false)
  const did = session.did || tokenInfo.sub
  if (!did) {
    throw new Error('OAuth session has no DID')
  }
  // Never PDS getSession or DPoP getProfile here — see createOauthSessionBundle.
  const handle = await resolveOauthHandle(did)
  const service = session.serverMetadata.issuer || BSKY_SERVICE
  return {
    service,
    did: did,
    handle,
    email: undefined,
    emailConfirmed: undefined,
    emailAuthFactor: undefined,
    active: true,
    status: undefined,
    pdsUrl: tokenInfo.aud,
    isSelfHosted: !service.startsWith(BSKY_SERVICE),
    isOauthSession: true,
  }
}

/**
 * Back-compat name used by restore tests. The 1.133 port does not need an
 * Agent; token claims + public AppView getProfile are enough.
 */
export async function oauthAgentToSessionAccount(
  _agent: unknown,
  session: OAuthSession,
): Promise<SessionAccount> {
  return oauthSessionToAccount(session)
}

export async function oauthAgentToSessionAccountOrThrow(
  _agent: unknown,
  session: OAuthSession,
): Promise<SessionAccount> {
  return oauthSessionToAccount(session)
}

function accountToSessionData(account: SessionAccount): SessionData {
  return {
    accessJwt: account.accessJwt ?? '',
    refreshJwt: account.refreshJwt ?? '',
    did: account.did,
    handle: account.handle as HandleString,
    email: account.email,
    emailAuthFactor: account.emailAuthFactor,
    emailConfirmed: account.emailConfirmed,
    active: account.active ?? true,
    status: account.status,
    service: account.service,
  }
}

function oauthAgentFromSession(session: OAuthSession): Agent {
  return {
    get did() {
      return session.did as DidString
    },
    fetchHandler(path, init) {
      return session.fetchHandler(path, init)
    },
  }
}

/**
 * Build a 1.133 {@link SessionBundle} over an OAuth DPoP session.
 *
 * Do not call PDS getSession *or* DPoP getProfile. Bluesky PDS returns 401
 * for DPoP tokens; `OAuthSession.fetchHandler` treats
 * `WWW-Authenticate: DPoP error="invalid_token"` as a dead token and
 * `delStored`s the IndexedDB session (loginEstablished then silent-anonymous).
 */
export async function createOauthSessionBundle(
  session: OAuthSession,
  onSessionChange: OnSessionChange,
): Promise<{account: SessionAccount; bundle: SessionBundle}> {
  protectOauthSessionFromAppViewGetProfile(session)
  const account = await oauthSessionToAccount(session)
  const agent = oauthAgentFromSession(session)
  const snapshot = accountToSessionData(account)

  let destroyed = false
  let unsubscribeSessionEvents: (() => void) | undefined

  const adapter = {
    get destroyed() {
      return destroyed
    },
    get session() {
      if (destroyed) {
        throw new Error('Logged out')
      }
      return snapshot
    },
    get did() {
      return account.did
    },
    fetchHandler(path: string, init?: RequestInit) {
      if (destroyed) {
        throw new Error('session disposed')
      }
      return session.fetchHandler(path, init)
    },
    refresh() {
      // Token rotation lives inside OAuthSession.fetchHandler / IndexedDB.
      // Return the same object so refreshSession() treats this as a no-op.
      return snapshot
    },
  }

  const bundle: SessionBundle = {
    session: adapter as unknown as PasswordSession,
    appviewClient: buildAppviewClient(agent),
    pdsClient: buildPdsClient(agent),
    chatClient: buildChatClient(agent),
    get service() {
      return new URL(account.service)
    },
  }

  unsubscribeSessionEvents = subscribeOAuthSessionDeleted(({sub, cause}) => {
    if (sub !== account.did) {
      return
    }
    if (isLocalOAuthRevokeInProgress(sub)) {
      return
    }
    destroyed = true
    const event = oauthDeletedCauseToSessionEvent(cause)
    onSessionChange(bundle, account.did, event)
    if (event !== 'update') {
      addSessionErrorLog(account.did, event)
    }
  })

  registerBundleKillSwitch(bundle, () => {
    destroyed = true
    unsubscribeSessionEvents?.()
    unsubscribeSessionEvents = undefined
  })

  logger.warn(`oauth: SessionBundle profile loaded`, {
    did: account.did,
    handle: account.handle,
  })

  configureModerationForAccount(bundle, account)
  const gates = features.refresh({strategy: 'prefer-fresh-gates'})
  // Age-assurance prefetch talks to appview + PDS. Wrap so a DPoP 401
  // cannot take down a just-exchanged OAuth session.
  const aa = prefetchAgeAssuranceServerData({
    appviewClient: bundle.appviewClient,
    accountClient: bundle.pdsClient,
  }).catch(error => {
    logger.warn(`oauth: age-assurance prefetch skipped`, {message: error})
  })
  await Promise.all([gates, aa])
  return {account, bundle}
}

export async function resumeOauthSessionBundle(
  account: SessionAccount,
  onSessionChange: OnSessionChange,
): Promise<{account: SessionAccount; bundle: SessionBundle}> {
  try {
    const session = await restoreOAuthSession(account.did)
    return createOauthSessionBundle(session, onSessionChange)
  } catch (e) {
    logger.error(`oauth: failed to restore session`, {message: e})
    throw e
  }
}

/** Test/legacy alias for {@link resumeOauthSessionBundle}. */
export async function oauthResumeSession(
  account: SessionAccount,
  onSessionChange: OnSessionChange,
): Promise<{account: SessionAccount; bundle: SessionBundle}> {
  try {
    return await resumeOauthSessionBundle(account, onSessionChange)
  } catch (e) {
    onSessionChange(
      {session: null} as unknown as SessionBundle,
      account.did,
      'expired',
    )
    throw e
  }
}
