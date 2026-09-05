import {
  Agent,
  type AtpSessionData,
  type AtpSessionEvent,
  type BskyAgent,
} from '@atproto/api'
import {type OAuthSession} from '@atproto/oauth-client-browser'

import {BLUESKY_PROXY_HEADER, BSKY_SERVICE} from '#/lib/constants'
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
  // getSession is optional for OAuth: Bluesky PDS returns 401 for DPoP
  // tokens (live loopback 2026-09-05). Token claims + getProfile are enough
  // to build SessionAccount. Do not let a 401 paint Sign in after a
  // successful code exchange.
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

type OauthSessionProfile = {
  handle?: string
  email?: string
  emailConfirmed?: boolean
  emailAuthFactor?: boolean
  active?: boolean
  status?: SessionAccount['status']
}

async function tryOauthGetSession(
  agent: Agent,
): Promise<OauthSessionProfile | undefined> {
  try {
    const {data} = await agent.com.atproto.server.getSession()
    return {
      handle: data.handle,
      email: data.email,
      emailConfirmed: data.emailConfirmed,
      emailAuthFactor: data.emailAuthFactor,
      active: data.active,
      status: data.status,
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    logger.warn(
      `oauth: getSession unavailable for OAuth token (using profile)`,
      {
        message: err.message,
        name: err.name,
      },
    )
    return undefined
  }
}

async function resolveOauthHandle(agent: Agent, did: string): Promise<string> {
  try {
    const {data} = await agent.app.bsky.actor.getProfile({actor: did})
    if (data.handle) {
      return data.handle
    }
  } catch (e) {
    logger.warn(`oauth: getProfile failed; using DID as handle`, {
      message: e instanceof Error ? e.message : e,
    })
  }
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
  const fromSession = await tryOauthGetSession(agent)
  // getProfile is an AppView call; proxy after the optional PDS getSession.
  if (!fromSession?.handle) {
    agent.configureProxy(BLUESKY_PROXY_HEADER.get())
  }
  const handle = fromSession?.handle || (await resolveOauthHandle(agent, did))
  const service = session.serverMetadata.issuer || BSKY_SERVICE
  return {
    service,
    did,
    handle,
    email: fromSession?.email,
    emailConfirmed: fromSession?.emailConfirmed,
    emailAuthFactor: fromSession?.emailAuthFactor,
    active: fromSession?.active ?? true,
    status: fromSession?.status,
    pdsUrl: tokenInfo.aud,
    isSelfHosted: !service.startsWith(BSKY_SERVICE),
    isOauthSession: true,
  }
}

export class OauthBskyAppAgent extends Agent {
  session?: AtpSessionData
  readonly service: URL
  /**
   * The live `@atproto/oauth-client` session. Community Notes and other
   * non-PDS fetches must use this (via `fetchWithAgentAuth`) so they send
   * the DPoP-bound access token instead of the empty persisted `accessJwt`.
   */
  readonly oauthSession: OAuthSession
  private unsubscribeSessionEvents?: () => void

  constructor(session: OAuthSession) {
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
