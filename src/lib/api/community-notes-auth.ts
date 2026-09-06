import {type OAuthSession} from '@atproto/oauth-client-browser'

/**
 * Agent shape used for Community Notes (and similar non-PDS) fetches.
 *
 * Password sessions expose `session.accessJwt`. OAuth sessions keep the
 * real token on `oauthSession` (`OauthBskyAppAgent`); persisted
 * `accessJwt` is empty by design. Signed-in OAuth notes calls mint an
 * AT Protocol service-auth JWT at the user's PDS
 * (`com.atproto.server.getServiceAuth`) and send it to notes as
 * `Authorization: Bearer <jwt>`. They must not send empty-JWKS OAuth
 * DPoP to notes, and must not reuse a notes-request DPoP proof at the PDS.
 */
export type ServiceAuthParams = {
  aud: string
  lxm: string
  exp?: number
}

export type ServiceAuthAgent = {
  session?: {accessJwt?: string} | null
  oauthSession?: Pick<OAuthSession, 'fetchHandler'>
  com?: {
    atproto: {
      server: {
        getServiceAuth: (
          params: ServiceAuthParams,
        ) => Promise<{data: {token: string}}>
      }
    }
  }
} | null

export const NOTES_LXM = {
  getConfig: 'org.opencommunitynotes.getConfig',
  getProposals: 'org.opencommunitynotes.getProposals',
  propose: 'org.opencommunitynotes.propose',
  vote: 'org.opencommunitynotes.vote',
} as const

export type FetchNotesAuthOptions = {
  /**
   * Notes XRPC NSID used as `getServiceAuth.lxm`. Defaults to the
   * `/xrpc/{lxm}` path segment of `url`.
   */
  lxm?: string
  /**
   * `true` for propose/vote: OAuth must mint a service-auth JWT.
   * `false` for getProposals: mint when signed-in OAuth (viewer
   * context); if minting fails, omit Authorization (soft-anon).
   */
  requireAuth?: boolean
}

type CachedNotesAudience = {
  aud: string
  fetchedAt: number
}

const NOTES_CONFIG_TTL_MS = 60 * 60 * 1000
const notesAudienceCache = new Map<string, CachedNotesAudience>()

export function resetNotesConfigCache() {
  notesAudienceCache.clear()
}

export function getOauthSessionFromAgent(
  agent: ServiceAuthAgent,
): Pick<OAuthSession, 'fetchHandler'> | undefined {
  return agent?.oauthSession
}

export function isOauthNotesAgent(agent: ServiceAuthAgent): boolean {
  return Boolean(agent?.oauthSession)
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

/** `/xrpc/{nsid}` path segment, or `null` if the URL is not a notes XRPC call. */
export function lexiconMethodFromNotesUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname
    const match = /^\/xrpc\/([a-zA-Z][a-zA-Z0-9.-]*)/.exec(path)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function notesServiceOriginFromUrl(url: string): string {
  return new URL(url).origin
}

/**
 * Notes service DID used as `getServiceAuth.aud`.
 * `org.opencommunitynotes.getConfig.feedGeneratorDid` is a bare DID
 * (or `did#serviceId` if the service ever returns that form). Notes
 * accepts both.
 */
export async function getNotesServiceAudience(
  notesUrl: string,
): Promise<string> {
  const origin = notesServiceOriginFromUrl(notesUrl)
  const cached = notesAudienceCache.get(origin)
  if (cached && Date.now() - cached.fetchedAt < NOTES_CONFIG_TTL_MS) {
    return cached.aud
  }

  const res = await fetch(`${origin}/xrpc/${NOTES_LXM.getConfig}`)
  if (!res.ok) {
    throw new Error(
      `Failed to fetch Community Notes config: HTTP ${res.status}`,
    )
  }
  const data = (await res.json()) as {feedGeneratorDid?: unknown}
  const aud = data.feedGeneratorDid
  if (typeof aud !== 'string' || !aud.startsWith('did:')) {
    throw new Error('getConfig.feedGeneratorDid is not a DID')
  }

  notesAudienceCache.set(origin, {aud, fetchedAt: Date.now()})
  return aud
}

/**
 * Mint a notes-scoped service-auth JWT at the user's PDS.
 *
 * The Agent XRPC client uses the OAuth session's DPoP bound to the
 * **PDS** `getServiceAuth` URL. Do not pass a notes-request DPoP proof
 * into this call.
 */
export async function mintNotesServiceAuth(
  agent: ServiceAuthAgent,
  params: ServiceAuthParams,
): Promise<string> {
  const getServiceAuth = agent?.com?.atproto?.server?.getServiceAuth
  if (typeof getServiceAuth !== 'function') {
    throw new Error(
      'Agent cannot mint service-auth (com.atproto.server.getServiceAuth is missing)',
    )
  }
  const {data} = await getServiceAuth({
    aud: params.aud,
    lxm: params.lxm,
    ...(params.exp !== undefined ? {exp: params.exp} : {}),
  })
  if (!data?.token || typeof data.token !== 'string' || data.token.length === 0) {
    throw new Error('getServiceAuth returned no token')
  }
  return data.token
}

async function mintNotesServiceAuthForUrl(
  agent: ServiceAuthAgent,
  url: string,
  lxmOverride?: string,
): Promise<string> {
  const lxm = lxmOverride ?? lexiconMethodFromNotesUrl(url)
  if (!lxm) {
    throw new Error(
      'Cannot determine notes lexicon method (lxm) for service-auth',
    )
  }
  const aud = await getNotesServiceAudience(url)
  return mintNotesServiceAuth(agent, {aud, lxm})
}

function fetchWithBearer(
  url: string,
  init: RequestInit,
  token: string,
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  return fetch(url, {...init, headers})
}

function fetchOmittingAuthorization(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.delete('Authorization')
  return fetch(url, {...init, headers})
}

/**
 * Fetch a notes XRPC URL with the auth the notes service expects
 * (atproto-community-notes PR #9 / tip 6c7f08af):
 *
 * - OAuth (`OauthBskyAppAgent`): mint `com.atproto.server.getServiceAuth`
 *   at the PDS (`aud` = getConfig.feedGeneratorDid, `lxm` = this method)
 *   and send `Authorization: Bearer <service-auth jwt>`. Never send
 *   empty-JWKS OAuth DPoP to notes (`OAuthSession.fetchHandler` against
 *   the notes URL). Never replay a notes-bound DPoP proof to the PDS.
 * - Password: `Authorization: Bearer <accessJwt>` when the JWT is present.
 * - Soft-anon (no oauthSession, no password JWT): omit `Authorization`.
 *   Never send an empty Bearer header — the notes service treats that
 *   as a hard 401.
 *
 * Soft-gate for signed-in note bodies: service-auth. Interim: omit
 * Authorization on getProposals only (`requireAuth: false`) if minting
 * fails. propose/vote (`requireAuth: true`) must mint.
 */
export async function fetchWithAgentAuth(
  agent: ServiceAuthAgent,
  url: string,
  init: RequestInit = {},
  options: FetchNotesAuthOptions = {},
): Promise<Response> {
  const requireAuth = options.requireAuth === true

  // Signed-in OAuth: service-auth Bearer. Do not DPoP the notes URL
  // and do not fall through to leftover password `accessJwt`.
  if (isOauthNotesAgent(agent)) {
    try {
      const token = await mintNotesServiceAuthForUrl(agent, url, options.lxm)
      return fetchWithBearer(url, init, token)
    } catch (error) {
      if (requireAuth) {
        throw error
      }
      return fetchOmittingAuthorization(url, init)
    }
  }

  const accessJwt = getPasswordAccessJwt(agent)
  if (accessJwt) {
    return fetchWithBearer(url, init, accessJwt)
  }

  if (requireAuth) {
    throw new Error('Must be logged in to call this Community Notes method')
  }

  return fetchOmittingAuthorization(url, init)
}
