import {type OAuthSession} from '@atproto/oauth-client-browser'

/**
 * Agent shape used for Community Notes (and similar non-PDS) fetches.
 *
 * Password sessions expose `session.accessJwt`. OAuth sessions keep the
 * real token on `oauthSession` (`OauthBskyAppAgent`); persisted
 * `accessJwt` is empty by design.
 */
export type ServiceAuthAgent = {
  session?: {accessJwt?: string} | null
  oauthSession?: Pick<OAuthSession, 'fetchHandler'>
} | null

export function getOauthSessionFromAgent(
  agent: ServiceAuthAgent,
): Pick<OAuthSession, 'fetchHandler'> | undefined {
  return agent?.oauthSession
}

/**
 * Password / app-password access JWT, or `undefined` when missing/empty.
 * An empty string must not be sent as `Authorization: Bearer `.
 */
export function getPasswordAccessJwt(
  agent: ServiceAuthAgent,
): string | undefined {
  const token = agent?.session?.accessJwt
  if (typeof token === 'string' && token.length > 0) {
    return token
  }
  return undefined
}

/**
 * Fetch a URL with the same auth the notes service expects:
 *
 * - OAuth: `OAuthSession.fetchHandler` (library DPoP: `Authorization: DPoP
 *   <access_token>` plus a `DPoP` proof bound to method/URL/ath, with nonce
 *   retry and token refresh).
 * - Password: `Authorization: Bearer <accessJwt>` when the JWT is present.
 * - Otherwise: omit `Authorization` (soft-anon getProposals). Never send an
 *   empty Bearer header — the notes service treats that as a hard 401.
 */
export async function fetchWithAgentAuth(
  agent: ServiceAuthAgent,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const oauthSession = getOauthSessionFromAgent(agent)
  if (oauthSession) {
    return oauthSession.fetchHandler(url, init)
  }

  const headers = new Headers(init.headers)
  const accessJwt = getPasswordAccessJwt(agent)
  if (accessJwt) {
    headers.set('Authorization', `Bearer ${accessJwt}`)
  }
  return fetch(url, {...init, headers})
}
