import {atprotoLoopbackClientMetadata} from '@atproto/oauth-types'

/**
 * AT Protocol OAuth client configuration for Blue Notes.
 *
 * Production client metadata is hosted at
 * https://bluenotes.social/oauth-client-metadata.json and must match this
 * object exactly (the `client_id` URL is fetched by authorization servers).
 *
 * Local web development uses the ATProto loopback client (no hosted metadata).
 * Loopback client_id query params must include getOauthScope() — the library
 * default is identity-only `atproto`. Set EXPO_PUBLIC_OAUTH=0 to force
 * password login. See docs/oauth.md.
 */

export const DEFAULT_OAUTH_CLIENT_ORIGIN = 'https://bluenotes.social'
export const DEFAULT_OAUTH_CLIENT_NAME = 'Blue Notes'
export const DEFAULT_OAUTH_SCOPE =
  'atproto transition:generic transition:email transition:chat.bsky'
export const DEFAULT_OAUTH_HANDLE_RESOLVER = 'https://bsky.social'
export const OAUTH_CALLBACK_PATH = '/auth/web/callback'

export type OauthClientMetadata = {
  client_id: string
  client_name: string
  client_uri: string
  redirect_uris: [string, ...string[]]
  scope: string
  token_endpoint_auth_method: 'none'
  response_types: string[]
  grant_types: string[]
  application_type: 'web' | 'native'
  dpop_bound_access_tokens: true
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

export function isOauthEnvDisabled(): boolean {
  const value = process.env.EXPO_PUBLIC_OAUTH
  return value === '0' || value === 'false'
}

export function isOauthEnvForced(): boolean {
  const value = process.env.EXPO_PUBLIC_OAUTH
  return value === '1' || value === 'true'
}

export function isOauthSignInAvailable(): boolean {
  return !isOauthEnvDisabled()
}

export function getOauthClientOrigin(): string {
  return trimSlash(
    process.env.EXPO_PUBLIC_OAUTH_CLIENT_ORIGIN || DEFAULT_OAUTH_CLIENT_ORIGIN,
  )
}

export function getOauthHandleResolver(): string {
  return (
    process.env.EXPO_PUBLIC_OAUTH_HANDLE_RESOLVER ||
    DEFAULT_OAUTH_HANDLE_RESOLVER
  )
}

export function getOauthScope(): string {
  return process.env.EXPO_PUBLIC_OAUTH_SCOPE || DEFAULT_OAUTH_SCOPE
}

export function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return (
      url.hostname === '127.0.0.1' ||
      url.hostname === 'localhost' ||
      url.hostname === '[::1]' ||
      url.hostname === '::1'
    )
  } catch {
    return false
  }
}

export function getWebRedirectUris(origin: string): [string, ...string[]] {
  const base = trimSlash(origin)
  const extra = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI
  const uris: [string, ...string[]] = [
    `${base}/`,
    `${base}${OAUTH_CALLBACK_PATH}`,
  ]
  if (extra && !uris.includes(extra)) {
    uris.push(extra)
  }
  return uris
}

export function buildWebClientMetadata(
  origin: string = getOauthClientOrigin(),
): OauthClientMetadata {
  const clientOrigin = trimSlash(origin)
  const clientId =
    process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID ||
    `${clientOrigin}/oauth-client-metadata.json`
  return {
    client_id: clientId,
    client_name:
      process.env.EXPO_PUBLIC_OAUTH_CLIENT_NAME || DEFAULT_OAUTH_CLIENT_NAME,
    client_uri: clientOrigin,
    redirect_uris: getWebRedirectUris(clientOrigin),
    scope: getOauthScope(),
    token_endpoint_auth_method: 'none',
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }
}

export function buildNativeClientMetadata(
  origin: string = getOauthClientOrigin(),
): OauthClientMetadata {
  const clientOrigin = trimSlash(origin)
  const clientId =
    process.env.EXPO_PUBLIC_OAUTH_NATIVE_CLIENT_ID ||
    `${clientOrigin}/oauth-client-metadata.native.json`
  const redirectUri =
    process.env.EXPO_PUBLIC_OAUTH_NATIVE_REDIRECT_URI ||
    'bluenotes://oauth/callback'
  return {
    client_id: clientId,
    client_name: `${
      process.env.EXPO_PUBLIC_OAUTH_CLIENT_NAME || DEFAULT_OAUTH_CLIENT_NAME
    } (native)`,
    client_uri: clientOrigin,
    redirect_uris: [redirectUri] as [string, ...string[]],
    scope: getOauthScope(),
    token_endpoint_auth_method: 'none',
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    application_type: 'native',
    dpop_bound_access_tokens: true,
  }
}

export function shouldUseLoopbackClient(currentOrigin?: string): boolean {
  if (process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID) {
    return false
  }
  if (!currentOrigin) {
    return false
  }
  return isLoopbackOrigin(currentOrigin)
}

/**
 * RFC 8252 forbids `localhost` in loopback redirect URIs. Authorization
 * servers also rewrite `localhost` → `127.0.0.1` for the loopback client.
 */
export function toLoopbackRedirectOrigin(origin: string): string {
  const url = new URL(origin)
  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1'
  }
  return trimSlash(url.origin)
}

function isLoopbackRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri)
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]' ||
        url.hostname === '::1')
    )
  } catch {
    return false
  }
}

export function getLoopbackRedirectUris(origin: string): [string, ...string[]] {
  const uris = getWebRedirectUris(toLoopbackRedirectOrigin(origin)).filter(
    isLoopbackRedirectUri,
  )
  if (!uris[0]) {
    throw new Error(
      `No valid loopback OAuth redirect URIs for origin ${origin}`,
    )
  }
  return [uris[0], ...uris.slice(1)]
}

/**
 * Loopback client_id. Built with encodeURIComponent (spaces as %20) so the
 * full scope survives both browser URLSearchParams and the React Native URL
 * polyfill used in Jest. `URLSearchParams#set` + `toString()` uses `+` for
 * spaces; some polyfills then treat `+` as a literal and drop the rest of
 * the scope list, leaving identity-only `atproto`.
 *
 * `@atproto/oauth-client-browser` treats `clientMetadata: undefined` as
 * `atprotoLoopbackClientMetadata(buildLoopbackClientId(location))`, which
 * only encodes `redirect_uri` and defaults to identity-only `atproto`.
 */
export function buildLoopbackClientId(origin: string): string {
  const scope = getOauthScope()
  const query = [
    `scope=${encodeURIComponent(scope)}`,
    ...getLoopbackRedirectUris(origin).map(
      uri => `redirect_uri=${encodeURIComponent(uri)}`,
    ),
  ].join('&')
  return `http://localhost?${query}`
}

export function buildLoopbackClientMetadata(
  origin: string,
): OauthClientMetadata {
  const loopbackOrigin = toLoopbackRedirectOrigin(origin)
  const metadata = atprotoLoopbackClientMetadata(buildLoopbackClientId(origin))
  return {
    client_id: metadata.client_id,
    client_name:
      process.env.EXPO_PUBLIC_OAUTH_CLIENT_NAME || DEFAULT_OAUTH_CLIENT_NAME,
    client_uri: loopbackOrigin,
    redirect_uris: metadata.redirect_uris,
    scope: metadata.scope,
    token_endpoint_auth_method: 'none',
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
    application_type: 'native',
    dpop_bound_access_tokens: true,
  }
}

export function resolveWebClientMetadata(origin?: string): OauthClientMetadata {
  if (origin && shouldUseLoopbackClient(origin)) {
    return buildLoopbackClientMetadata(origin)
  }
  return buildWebClientMetadata(origin)
}

/**
 * Always `fragment` so BrowserOAuthClient.init() reads `#code=` / `#state=`
 * on the callback load (PE: fragment responseMode consume-on-that-load).
 * `readOauthCallbackParams` still accepts query if an AS ignores
 * `response_mode` and returns `?code=`. Hosted production keeps fragment
 * so the code is not sent to the static-file / bskyweb access log.
 */
export function getWebOauthResponseMode(
  _origin?: string,
): 'query' | 'fragment' {
  return 'fragment'
}
