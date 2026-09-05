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
  // Do not call PDS getSession for OAuth. Bluesky PDS returns 401 for
  // DPoP tokens. `OAuthSession.fetchHandler` treats
  // `WWW-Authenticate: DPoP error="invalid_token"` as a dead token:
  // refresh, retry, then `delStored` — wiping the IndexedDB session
  // that `callback()` just wrote (live 9a58ce838: token 200, then
  // getSession 401, then Sign in). Token claims + getProfile are enough.
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
  // Never PDS getSession here — see oauthCreateAgent. AppView getProfile
  // is proxied and accepts the DPoP access token.
  agent.configureProxy(BLUESKY_PROXY_HEADER.get())
  const handle = await resolveOauthHandle(agent, did)
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
