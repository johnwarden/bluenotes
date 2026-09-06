import {
  Agent,
  type AtpSessionData,
  type AtpSessionEvent,
  type BskyAgent,
} from '@atproto/api'
import {type OAuthSession} from '@atproto/oauth-client-browser'

import {
  BLUESKY_PROXY_HEADER,
  BSKY_SERVICE,
  PUBLIC_BSKY_SERVICE,
} from '#/lib/constants'
import {tryFetchGates} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {sessionAccountToSession} from './agent'
import {addSessionErrorLog} from './logging'
import {configureModerationForAccount} from './moderation'
import {
  isLocalOAuthRevokeInProgress,
  restoreOAuthSession,
  subscribeOAuthSessionDeleted,
} from './oauth-client'
import {oauthDeletedCauseToSessionEvent} from './oauth-session-lifecycle'
import {type SessionAccount} from './types'

type OnAgentSessionChange = (
  agent: BskyAgent,
  did: string,
  event: AtpSessionEvent,
) => void

export async function oauthCreateAgent(
  session: OAuthSession,
  onSessionChange: OnAgentSessionChange,
) {
  const agent = new OauthBskyAppAgent(session)
  // Do not call PDS getSession *or* DPoP getProfile for OAuth. Bluesky
  // PDS returns 401 for DPoP tokens. `OAuthSession.fetchHandler` treats
  // `WWW-Authenticate: DPoP error="invalid_token"` as a dead token:
  // refresh, retry, then `delStored` — wiping the IndexedDB session
  // that `callback()` just wrote (live 9a58ce838 getSession; live
  // c8e3a12de getProfile 401 then loginEstablished + silent-anonymous).
  // Token claims + public AppView getProfile are enough.
  const account = await oauthAgentToSessionAccountOrThrow(agent, session)
  agent.configureProxy(BLUESKY_PROXY_HEADER.get())
  logger.warn(`oauth: OauthBskyAppAgent profile loaded`, {
    did: account.did,
    handle: account.handle,
  })
  const gates = tryFetchGates(account.did, 'prefer-fresh-gates')
  const moderation = configureModerationForAccount(agent, account)
  return agent.prepare(account, gates, moderation, onSessionChange)
}

export async function oauthResumeSession(
  account: SessionAccount,
  onSessionChange: OnAgentSessionChange,
) {
  try {
    const session = await restoreOAuthSession(account.did)
    return oauthCreateAgent(session, onSessionChange)
  } catch (e) {
    logger.error(`oauth: failed to restore session`, {message: e})
    // Mirror persistSession('create-failed') so the store drops the session
    // and the app emits the same "session expired" toast as password resume.
    onSessionChange(
      {session: undefined} as BskyAgent,
      account.did,
      'create-failed',
    )
    throw e
  }
}

export async function oauthAgentToSessionAccountOrThrow(
  agent: Agent,
  session: OAuthSession,
): Promise<SessionAccount> {
  return oauthAgentToSessionAccount(agent, session)
}

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
 * AppView `getProfile` via the OAuth/DPoP agent hits the PDS (`token.aud`)
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

export async function oauthAgentToSessionAccount(
  agent: Agent,
  session: OAuthSession,
): Promise<SessionAccount> {
  const tokenInfo = await session.getTokenInfo(false)
  const did = session.did || tokenInfo.sub
  if (!did) {
    throw new Error('OAuth session has no DID')
  }
  // Never PDS getSession or DPoP getProfile here — see oauthCreateAgent.
  agent.configureProxy(BLUESKY_PROXY_HEADER.get())
  const handle = await resolveOauthHandle(did)
  const service = session.serverMetadata.issuer || BSKY_SERVICE
  return {
    service,
    did,
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

export class OauthBskyAppAgent extends Agent {
  session?: AtpSessionData
  readonly service: URL
  /**
   * The live `@atproto/oauth-client` session. PDS XRPC (including
   * `com.atproto.server.getServiceAuth` for Community Notes) uses this
   * session's DPoP bound to the **PDS** URL. Notes itself gets a
   * service-auth Bearer JWT, not notes-URL DPoP — Bluesky issuer JWKS
   * is empty, so notes rejects OAuth DPoP.
   */
  readonly oauthSession: OAuthSession
  private unsubscribeSessionEvents?: () => void

  constructor(session: OAuthSession) {
    protectOauthSessionFromAppViewGetProfile(session)
    super(session)
    this.oauthSession = session
    this.service = new URL(session.serverMetadata.issuer)
  }

  async prepare(
    account: SessionAccount,
    gates: Promise<void>,
    moderation: Promise<void>,
    onSessionChange: OnAgentSessionChange,
  ) {
    this.session = sessionAccountToSession(account)
    this.unsubscribeSessionEvents = subscribeOAuthSessionDeleted(
      ({sub, cause}) => {
        if (sub !== account.did) {
          return
        }
        // Intentional logout already dispatched logged-out-*; skip the
        // expired toast. Other-tab / refresh failures still flow through.
        if (isLocalOAuthRevokeInProgress(sub)) {
          return
        }
        this.session = undefined
        const event = oauthDeletedCauseToSessionEvent(cause)
        onSessionChange(this as unknown as BskyAgent, account.did, event)
        if (event !== 'create' && event !== 'update') {
          addSessionErrorLog(account.did, event)
        }
      },
    )
    await Promise.all([gates, moderation])
    return {account, agent: this}
  }

  dispose() {
    this.unsubscribeSessionEvents?.()
    this.unsubscribeSessionEvents = undefined
    this.session = undefined
  }
}
