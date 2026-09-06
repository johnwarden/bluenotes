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

export type FetchWithAgentAuthOptions = {
  /**
   * `getProposals` is optional-auth on the notes service: a missing
   * `Authorization` header is soft-anonymous 200, but present-but-invalid
   * auth (empty Bearer, rejected DPoP) is a hard 401 that hides note
   * bodies.
   *
   * When true, skip `OAuthSession.fetchHandler`. That helper is bound to
   * the PDS audience and, against `api.bluenotes.social`, production
   * signed-in OAuth DPoP 401s (resource-server `htu` / `PUBLIC_URL`).
   * `fetchHandler` can also `delStored` the PDS session if the notes
   * service returns `WWW-Authenticate: DPoP error="invalid_token"`.
   * Password Bearer is still sent when present.
   */
  optionalAuth?: boolean
}

export function getOauthSessionFromAgent(
  agent: ServiceAuthAgent,
): Pick<OAuthSession, 'fetchHandler'> | undefined {
  const session = agent?.oauthSession
  if (session && typeof session.fetchHandler === 'function') {
    return session
  }
  return undefined
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
 * - Required-auth (propose / vote) + OAuth: `OAuthSession.fetchHandler`
 *   (library DPoP: `Authorization: DPoP <access_token>` plus a `DPoP`
 *   proof bound to method/URL/ath, with nonce retry and token refresh).
 * - Password: `Authorization: Bearer <accessJwt>` when the JWT is present.
 * - Optional-auth (getProposals) + OAuth, or no token: omit
 *   `Authorization` (soft-anon). Never send an empty Bearer header — the
 *   notes service treats that as a hard 401.
 */
export async function fetchWithAgentAuth(
  agent: ServiceAuthAgent,
  url: string,
  init: RequestInit = {},
  options?: FetchWithAgentAuthOptions,
): Promise<Response> {
  const optionalAuth = options?.optionalAuth === true
  const oauthSession = getOauthSessionFromAgent(agent)
  if (oauthSession && !optionalAuth) {
    return oauthSession.fetchHandler(url, init)
  }

  const headers = new Headers(init.headers)
  const accessJwt = getPasswordAccessJwt(agent)
  if (accessJwt) {
    headers.set('Authorization', `Bearer ${accessJwt}`)
  }
  const response = await fetch(url, {...init, headers})

  // Expired / rejected password JWT on an optional-auth read: retry
  // soft-anon so note bodies still render.
  if (optionalAuth && response.status === 401 && accessJwt) {
    return fetch(url, init)
  }
  return response
}
