import {Agent, type AtpSessionData} from '@atproto/api'
import {type OAuthSession} from '@atproto/oauth-client-browser'

import {BLUESKY_PROXY_HEADER, BSKY_SERVICE} from '#/lib/constants'
import {tryFetchGates} from '#/lib/statsig/statsig'
import {logger} from '#/logger'
import {sessionAccountToSession} from './agent'
import {configureModerationForAccount} from './moderation'
import {restoreOAuthSession} from './oauth-client'
import {type SessionAccount} from './types'

export async function oauthCreateAgent(session: OAuthSession) {
  const agent = new OauthBskyAppAgent(session)
  agent.configureProxy(BLUESKY_PROXY_HEADER.get())
  const account = await oauthAgentToSessionAccountOrThrow(agent, session)
  const gates = tryFetchGates(account.did, 'prefer-fresh-gates')
  const moderation = configureModerationForAccount(agent, account)
  return agent.prepare(account, gates, moderation)
}

export async function oauthResumeSession(account: SessionAccount) {
  const session = await restoreOAuthSession(account.did)
  return oauthCreateAgent(session)
}

export async function oauthAgentToSessionAccountOrThrow(
  agent: Agent,
  session: OAuthSession,
): Promise<SessionAccount> {
  const account = await oauthAgentToSessionAccount(agent, session)
  if (!account) {
    throw Error('Expected an active OAuth session')
  }
  return account
}

export async function oauthAgentToSessionAccount(
  agent: Agent,
  session: OAuthSession,
): Promise<SessionAccount | undefined> {
  try {
    const {data} = await agent.com.atproto.server.getSession()
    const tokenInfo = await session.getTokenInfo(false)
    const service = session.serverMetadata.issuer || BSKY_SERVICE
    return {
      service,
      did: session.did || data.did,
      handle: data.handle,
      email: data.email,
      emailConfirmed: data.emailConfirmed,
      emailAuthFactor: data.emailAuthFactor,
      active: data.active,
      status: data.status,
      pdsUrl: tokenInfo.aud,
      isSelfHosted: !service.startsWith(BSKY_SERVICE),
      isOauthSession: true,
    }
  } catch (e) {
    logger.error(`oauth: failed to load session profile`, {message: e})
    return undefined
  }
}

export class OauthBskyAppAgent extends Agent {
  session?: AtpSessionData
  readonly service: URL

  constructor(session: OAuthSession) {
    super(session)
    this.service = new URL(session.serverMetadata.issuer)
  }

  async prepare(
    account: SessionAccount,
    gates: Promise<void>,
    moderation: Promise<void>,
  ) {
    this.session = sessionAccountToSession(account)
    await Promise.all([gates, moderation])
    return {account, agent: this}
  }

  dispose() {
    this.session = undefined
  }
}
