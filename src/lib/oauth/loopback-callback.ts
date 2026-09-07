/**
 * Loopback / SPA OAuth callback helpers.
 *
 * `@atproto/oauth-client-browser` BrowserOAuthClient.init() does:
 *
 *   1. readCallbackParams() from *either* hash *or* search (not both),
 *      depending on constructor responseMode (default `fragment`)
 *   2. findRedirectUrl() — exact `location.origin + location.pathname`
 *      match against clientMetadata.redirect_uris
 *   3. If params exist but findRedirectUrl() is undefined, it **silently
 *      skips** the code exchange and falls through to initRestore()
 *   4. initRestore() → fixLocation() may then assign
 *      `window.location.href = redirect_uri` (no hash, no search),
 *      destroying the authorization response
 *
 * That combination is the anonymous-after-consent bug on local
 * `127.0.0.1:19006` / `localhost` static serves. #18 retried `initCallback`
 * only after `init()` *resolved* without `state`. If `init()` threw, the
 * retry never ran and App swallowed the error — still anonymous. See
 * `oauth-init-policy.ts`.
 *
 * Remaining failure modes on those origins:
 *
 *   - AS returns `response_mode=query` while the client only reads fragment
 *     (or a hash router / `history.replaceState` stripped the fragment)
 *   - AS or the user lands on `localhost` while metadata URIs are `127.0.0.1`
 *     (origins differ → findRedirectUrl misses → fixLocation drops params)
 *   - trailing-slash pathname mismatch (`/auth/web/callback/` vs
 *     `/auth/web/callback`)
 *
 * IndexedDB + PKCE state are origin-scoped, so localhost and 127.0.0.1
 * are different stores. Always canonicalize onto 127.0.0.1 *before*
 * creating the client, and copy hash + search through that navigation.
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

function isOauthCallbackParams(params: URLSearchParams): boolean {
  return params.has('state') && (params.has('code') || params.has('error'))
}

function paramsFromHash(hash: string): URLSearchParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  // Some client-side routers rewrite `#iss=…` to `#/iss=…`. Strip a
  // single leading slash so `state` / `code` still parse.
  return new URLSearchParams(raw.startsWith('/') ? raw.slice(1) : raw)
}

/**
 * Read authorization-response parameters from either the fragment or the
 * query string. Prefer fragment when both look like a callback so we do
 * not treat leftover `?iss=` (RFC 9207) as the response if the code is
 * in the hash.
 */
export function readOauthCallbackParams(href: string): URLSearchParams | null {
  const url = new URL(href)
  const fromHash = paramsFromHash(url.hash)
  if (isOauthCallbackParams(fromHash)) {
    return fromHash
  }
  if (isOauthCallbackParams(url.searchParams)) {
    return new URLSearchParams(url.searchParams)
  }
  return null
}

/**
 * If `href` is a localhost loopback URL, return the 127.0.0.1 equivalent
 * with path, query, and fragment preserved. Returns null when no rewrite
 * is needed (already an IP literal, or not loopback).
 */
/**
 * Path-only URL after the authorization response has been snapshotted.
 * Library initCallback() only strips the constructor responseMode
 * (query *or* fragment), so a loopback client on `query` would otherwise
 * leave `#code=&state=` in the address bar for a refresh to replay.
 */
export function hrefWithoutOauthCallback(href: string): string {
  const url = new URL(href)
  return `${url.pathname || '/'}`
}

export function canonicalizeLoopbackHref(href: string): string | null {
  const url = new URL(href)
  if (url.hostname !== 'localhost') {
    return null
  }
  url.hostname = '127.0.0.1'
  return url.href
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/'
  }
  return pathname.replace(/\/+$/, '') || '/'
}

function loopbackOriginsEquivalent(a: string, b: string): boolean {
  if (a === b) {
    return true
  }
  try {
    const left = new URL(a)
    const right = new URL(b)
    return (
      left.protocol === right.protocol &&
      left.port === right.port &&
      LOOPBACK_HOSTS.has(left.hostname) &&
      LOOPBACK_HOSTS.has(right.hostname)
    )
  } catch {
    return false
  }
}

/**
 * Pick the metadata redirect_uri that corresponds to the current page.
 * Returns the *metadata* string (exact authorize/token redirect_uri),
 * not a newly constructed URL, so the token request matches the
 * authorization request.
 *
 * Tolerates trailing-slash differences and localhost ↔ 127.0.0.1 ↔ [::1].
 */
export function matchOauthRedirectUri(
  href: string,
  allowed: readonly string[],
): string | undefined {
  const loc = new URL(href)
  const locPath = normalizePathname(loc.pathname)
  for (const uri of allowed) {
    try {
      const allowedUrl = new URL(uri)
      if (normalizePathname(allowedUrl.pathname) !== locPath) {
        continue
      }
      if (
        allowedUrl.origin === loc.origin ||
        loopbackOriginsEquivalent(allowedUrl.origin, loc.origin)
      ) {
        return uri
      }
    } catch {
      continue
    }
  }
  return undefined
}

export type OauthInitLike = {
  session?: unknown
  state?: string
}

/**
 * When to call app-level login() from BrowserOAuthClient.init()'s result.
 *
 * - Callback (`state` own-property): always. This is the authorization
 *   redirect; the app session store is still empty.
 * - Restore without a persisted account: also login. IndexedDB may hold
 *   a session that never made it into persisted storage (previous
 *   login() threw after a successful code exchange).
 * - Restore with a persisted account: leave it to resumeSession() so a
 *   later password login is not overwritten by a leftover OAuth IDB row.
 */
export function shouldEstablishAppSessionFromOauthInit<T extends OauthInitLike>(
  result: T | undefined | null,
  hasPersistedAccount: boolean,
): result is T & {session: NonNullable<T['session']>} {
  if (!result?.session) {
    return false
  }
  if (Object.prototype.hasOwnProperty.call(result, 'state')) {
    return true
  }
  return !hasPersistedAccount
}
