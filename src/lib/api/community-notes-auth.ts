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
 * - OAuth (`OauthBskyAppAgent.oauthSession`): always
 *   `OAuthSession.fetchHandler` (library DPoP: `Authorization: DPoP
 *   <access_token>` plus a `DPoP` proof bound to method/URL/ath, with
 *   nonce retry and token refresh). Never the password-JWT path, even
 *   if persisted `accessJwt` is empty or leftover.
 * - Password: `Authorization: Bearer <accessJwt>` when the JWT is present.
 * - Soft-anon (no oauthSession, no password JWT): omit `Authorization`.
 *   Never send an empty Bearer header — the notes service treats that
 *   as a hard 401.
 */
export async function fetchWithAgentAuth(
  agent: ServiceAuthAgent,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  // Signed-in OAuth must DPoP. Do not fall through to Bearer / omit.
  if (agent?.oauthSession) {
    const oauthSession = getOauthSessionFromAgent(agent)
    if (!oauthSession) {
      throw new Error(
        'OAuth session is missing fetchHandler; cannot send DPoP',
      )
    }
    return oauthSession.fetchHandler(url, init)
  }

  const headers = new Headers(init.headers)
  const accessJwt = getPasswordAccessJwt(agent)
  if (accessJwt) {
    headers.set('Authorization', `Bearer ${accessJwt}`)
  }
  return fetch(url, {...init, headers})
}
