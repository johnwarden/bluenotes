import {com} from '#/lexicons'

/**
 * Notes service DID used as `com.atproto.server.getServiceAuth` aud.
 * `org.opencommunitynotes.getConfig.feedGeneratorDid` must match this pin
 * (bare DID, or `did#serviceId`). Drift is rejected so a compromised notes
 * host cannot mint a JWT for an attacker audience.
 *
 * Documented next to `COMMUNITY_NOTES_LABELER_DID` in
 * `#/lib/community-notes/labels`.
 */
export const COMMUNITY_NOTES_FEED_GENERATOR_DID = {
  PROD: 'did:plc:jqzvhkz7gxovq55fa7ibs6px',
  STAGING: 'did:plc:jqzvhkz7gxovq55fa7ibs6px',
  DEV: 'did:plc:jqzvhkz7gxovq55fa7ibs6px',
} as const

/**
 * Notes auth only needs fetchHandler. Avoid importing
 * `@atproto/oauth-client-browser` so this module can live on
 * community-notes-feature without that rebrand OAuth dependency.
 */
type NotesOauthFetchHandler = {
  fetchHandler: (url: string, init?: RequestInit) => Promise<Response>
}

/**
 * Agent shape used for Community Notes (and similar non-PDS) fetches.
 *
 * Password sessions expose `session.accessJwt`. OAuth sessions keep the
 * real token on `oauthSession` / IndexedDB; persisted `accessJwt` is
 * empty by design. Signed-in OAuth notes calls mint an AT Protocol
 * service-auth JWT at the user's PDS (`com.atproto.server.getServiceAuth`)
 * and send it to notes as `Authorization: Bearer <jwt>`. They must not
 * send empty-JWKS OAuth DPoP to notes, and must not reuse a notes-request
 * DPoP proof at the PDS.
 *
 * On 1.133, minting prefers `pdsClient.call(getServiceAuth)`. The
 * `com.atproto.server.getServiceAuth` namespace path is kept so #22+#23
 * tests (and the bind-`this` contract) still hold.
 */
export type ServiceAuthParams = {
  aud: string
  lxm: string
  exp?: number
}

export type ServiceAuthPdsClient = {
  call: (
    method: typeof com.atproto.server.getServiceAuth,
    params: ServiceAuthParams,
  ) => Promise<{token: string}>
}

export type ServiceAuthAgent = {
  session?: {accessJwt?: string} | null
  isOauthSession?: boolean
  service?: {toString(): string} | string
  oauthSession?: Pick<NotesOauthFetchHandler, 'fetchHandler'>
  pdsClient?: ServiceAuthPdsClient
  com?: {
    atproto: {
      server: {
        getServiceAuth: (
          params: ServiceAuthParams,
        ) => Promise<{data: {token: string}} | {token: string}>
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
   * `true` for propose/vote: a signed-in session must send a Bearer
   * (OAuth mints; password may use `accessJwt`). Mint failure throws.
   * `false` for getProposals: when a session is present, prefer minting
   * service-auth and sending `Authorization: Bearer <jwt>`. Omit the
   * header only when the session is truly unsigned, or on a documented
   * hard mint failure (public note text can still load). Never send an
   * empty Bearer.
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
): Pick<NotesOauthFetchHandler, 'fetchHandler'> | undefined {
  return agent?.oauthSession
}

export function isOauthNotesAgent(agent: ServiceAuthAgent): boolean {
  return Boolean(agent?.oauthSession || agent?.isOauthSession)
}

/**
 * True when the agent can mint `com.atproto.server.getServiceAuth`
 * (1.133 `pdsClient.call` or the Agent XRPC namespace).
 */
export function canMintNotesServiceAuth(agent: ServiceAuthAgent): boolean {
  if (agent?.pdsClient && typeof agent.pdsClient.call === 'function') {
    return true
  }
  return typeof agent?.com?.atproto?.server?.getServiceAuth === 'function'
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

const PINNED_NOTES_SERVICE_DIDS = new Set<string>(
  Object.values(COMMUNITY_NOTES_FEED_GENERATOR_DID),
)

/**
 * Bare DID from a getServiceAuth audience (`did` or `did#serviceId`).
 */
export function notesAudienceDid(aud: string): string {
  const hash = aud.indexOf('#')
  return hash === -1 ? aud : aud.slice(0, hash)
}

/**
 * True when `aud` is the pinned notes service DID, optionally with a
 * `#serviceId` fragment.
 */
export function isPinnedNotesServiceAudience(aud: string): boolean {
  return (
    typeof aud === 'string' &&
    aud.startsWith('did:') &&
    PINNED_NOTES_SERVICE_DIDS.has(notesAudienceDid(aud))
  )
}

/**
 * Notes service DID used as `getServiceAuth.aud`.
 * `org.opencommunitynotes.getConfig.feedGeneratorDid` is a bare DID
 * (or `did#serviceId` if the service ever returns that form). Notes
 * accepts both, but the DID must match `COMMUNITY_NOTES_FEED_GENERATOR_DID`.
 * A well-formed attacker DID is rejected (audience drift).
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
  if (!isPinnedNotesServiceAudience(aud)) {
    throw new Error(
      'getConfig.feedGeneratorDid does not match the pinned notes service DID',
    )
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
  if (!isPinnedNotesServiceAudience(params.aud)) {
    throw new Error(
      'getServiceAuth aud does not match the pinned notes service DID',
    )
  }

  const callParams = {
    aud: params.aud,
    lxm: params.lxm,
    ...(params.exp !== undefined ? {exp: params.exp} : {}),
  }

  // 1.133 SessionBundle: lex Client.call (no unbound `this`).
  if (agent?.pdsClient && typeof agent.pdsClient.call === 'function') {
    const result = await agent.pdsClient.call(
      com.atproto.server.getServiceAuth,
      callParams,
    )
    const token = result?.token
    if (!token || typeof token !== 'string' || token.length === 0) {
      throw new Error('getServiceAuth returned no token')
    }
    return token
  }

  const server = agent?.com?.atproto?.server
  if (!server || typeof server.getServiceAuth !== 'function') {
    throw new Error(
      'Agent cannot mint service-auth (com.atproto.server.getServiceAuth is missing)',
    )
  }
  // Call through the namespace so `this` stays the XRPC server object.
  // Extracting (`const fn = server.getServiceAuth; await fn(...)`) is
  // unbound: `@atproto/api` methods read `this._client` and throw
  // TypeError, which signed-in getProposals then soft-anons (#23).
  const result = await server.getServiceAuth(callParams)
  const token =
    result && 'data' in result && result.data
      ? result.data.token
      : (result as {token?: string}).token
  if (!token || typeof token !== 'string' || token.length === 0) {
    throw new Error('getServiceAuth returned no token')
  }
  return token
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
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Refusing to send empty Authorization Bearer')
  }
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
 *   at the PDS (`aud` = pinned notes DID confirmed by getConfig, `lxm` =
 *   this method)
 *   and send `Authorization: Bearer <service-auth jwt>`. Never send
 *   empty-JWKS OAuth DPoP to notes (`OAuthSession.fetchHandler` against
 *   the notes URL). Never replay a notes-bound DPoP proof to the PDS.
 * - Password: prefer service-auth mint on getProposals when `pdsClient`
 *   (or Agent `getServiceAuth`) is present; otherwise
 *   `Authorization: Bearer <accessJwt>`.
 * - Soft-anon (no session, no password JWT, no mint capability): omit
 *   `Authorization`. Never send an empty Bearer header - the notes
 *   service treats that as a hard 401.
 *
 * Soft-gate for signed-in note bodies: service-auth. getProposals
 * (`requireAuth: false`) prefers minting whenever a session can
 * (OAuth, 1.133 `pdsClient`, or Agent namespace). Hard mint failure
 * omits Authorization so public note text can still load - that
 * fallback is only for mint failure or a truly unsigned agent
 * (`null`, empty `accessJwt`, no oauth / pdsClient). propose/vote
 * (`requireAuth: true`) must send a Bearer; mint failure throws.
 */
export async function fetchWithAgentAuth(
  agent: ServiceAuthAgent,
  url: string,
  init: RequestInit = {},
  options: FetchNotesAuthOptions = {},
): Promise<Response> {
  const requireAuth = options.requireAuth === true
  const accessJwt = getPasswordAccessJwt(agent)
  const oauth = isOauthNotesAgent(agent)
  const canMint = canMintNotesServiceAuth(agent)

  /*
   * Prefer service-auth when a session is present and we can mint:
   * OAuth always; getProposals whenever pdsClient / getServiceAuth
   * exists; writes when there is no password JWT. Do not DPoP the
   * notes URL. Do not send leftover password `accessJwt` on OAuth.
   */
  const preferMint =
    oauth || (canMint && !requireAuth) || (canMint && !accessJwt)

  if (preferMint) {
    try {
      const token = await mintNotesServiceAuthForUrl(agent, url, options.lxm)
      return fetchWithBearer(url, init, token)
    } catch (error) {
      if (requireAuth) {
        throw error
      }
      // Documented hard mint failure (#41): omit, never empty Bearer.
      return fetchOmittingAuthorization(url, init)
    }
  }

  if (accessJwt) {
    return fetchWithBearer(url, init, accessJwt)
  }

  if (requireAuth) {
    throw new Error('Must be logged in to call this Community Notes method')
  }

  return fetchOmittingAuthorization(url, init)
}
