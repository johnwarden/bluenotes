import {
  BrowserOAuthClient,
  type OAuthClientMetadataInput,
} from '@atproto/oauth-client-browser'

import {
  getOauthHandleResolver,
  getOauthScope,
  getWebOauthResponseMode,
  resolveWebClientMetadata,
} from '#/lib/oauth/config'
import {
  canonicalizeLoopbackHref,
  matchOauthRedirectUri,
  readOauthCallbackParams,
} from '#/lib/oauth/loopback-callback'
import {logger} from '#/logger'

let client: BrowserOAuthClient | undefined
let initPromise: Promise<OauthInitResult | undefined> | undefined

type OauthDeletedDetail = {sub: string; cause: unknown}
const deletedListeners = new Set<(detail: OauthDeletedDetail) => void>()

function emitOAuthSessionDeleted(sub: string, cause: unknown) {
  for (const listener of deletedListeners) {
    listener({sub, cause})
  }
}

export type OauthInitResult = {
  session: Awaited<ReturnType<BrowserOAuthClient['restore']>>
  state?: string
}

function currentOrigin(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.location.origin
}

export function createWebOAuthClient(): BrowserOAuthClient {
  const origin = currentOrigin()
  return new BrowserOAuthClient({
    handleResolver: getOauthHandleResolver(),
    // Loopback: encode getOauthScope() in client_id (library default is
    // identity-only `atproto`). Hosted metadata must match the JSON served
    // at client_id exactly.
    clientMetadata: resolveWebClientMetadata(
      origin,
    ) as OAuthClientMetadataInput,
    responseMode: getWebOauthResponseMode(origin),
    // @atproto/oauth-client 0.6.x: SessionHooks (not EventTarget).
    onDelete: (sub, cause) => {
      emitOAuthSessionDeleted(sub, cause)
    },
  })
}

export function getOAuthClient(): BrowserOAuthClient {
  if (!client) {
    client = createWebOAuthClient()
  }
  return client
}

function rewriteLocalhostOriginIfNeeded(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const next = canonicalizeLoopbackHref(window.location.href)
  if (!next) {
    return false
  }
  // Preserve path + search + hash. Library fixLocation() assigns only
  // the metadata redirect_uri href and drops the authorization response.
  window.location.replace(next)
  return true
}

/**
 * Snapshot callback params at first web-module evaluation, before any
 * later history.replaceState / hash-router can strip them. Recreated
 * after a localhost → 127.0.0.1 navigation (new document).
 */
const initialCallbackParams: URLSearchParams | null =
  typeof window === 'undefined'
    ? null
    : rewriteLocalhostOriginIfNeeded()
      ? null
      : readOauthCallbackParams(window.location.href)

type LibraryRedirectUri = Parameters<BrowserOAuthClient['initCallback']>[1]

function hasCallbackState(
  result: {session: unknown; state?: string | null} | undefined,
): result is {session: NonNullable<unknown>; state: string | null} {
  return Boolean(result && 'state' in result)
}

function wrapInitResult(
  result: Awaited<ReturnType<BrowserOAuthClient['init']>>,
): OauthInitResult | undefined {
  if (!result) {
    return undefined
  }
  if ('state' in result) {
    return {session: result.session, state: result.state ?? ''}
  }
  return {session: result.session}
}

/**
 * Must run once per page load. Handles the authorization redirect (if present)
 * and restores the last OAuth session from IndexedDB.
 */
export function initOAuthClient(): Promise<OauthInitResult | undefined> {
  if (!initPromise) {
    initPromise = (async () => {
      if (rewriteLocalhostOriginIfNeeded()) {
        // Navigating off localhost; do not open IndexedDB on the wrong origin.
        return undefined
      }
      const oauthClient = getOAuthClient()
      let result: Awaited<ReturnType<BrowserOAuthClient['init']>>
      try {
        result = await oauthClient.init()
      } catch (e) {
        logger.error(`oauth: client init failed`, {message: e})
        if (
          initialCallbackParams ||
          readOauthCallbackParams(window.location.href)
        ) {
          throw e
        }
        return undefined
      }

      if (!hasCallbackState(result)) {
        const params =
          initialCallbackParams ??
          oauthClient.readCallbackParams() ??
          readOauthCallbackParams(window.location.href)
        if (params) {
          const metadata = resolveWebClientMetadata(currentOrigin())
          const redirectUri =
            oauthClient.findRedirectUrl() ??
            matchOauthRedirectUri(window.location.href, metadata.redirect_uris)
          if (!redirectUri) {
            logger.error(`oauth: callback params present but no redirect_uri`, {
              origin: window.location.origin,
              pathname: window.location.pathname,
            })
            throw new Error(
              'OAuth callback could not be completed: redirect URI mismatch',
            )
          }
          logger.warn(
            `oauth: library init missed callback params; retrying initCallback`,
          )
          try {
            result = await oauthClient.initCallback(
              params,
              redirectUri as LibraryRedirectUri,
            )
          } catch (e) {
            logger.error(`oauth: client initCallback failed`, {message: e})
            throw e
          }
        }
      }

      return wrapInitResult(result)
    })()
  }
  return initPromise
}

export async function signInWithOAuth(identifier: string): Promise<void> {
  const oauthClient = getOAuthClient()
  const origin = currentOrigin()
  const metadata = resolveWebClientMetadata(origin)
  const redirectUri =
    typeof window === 'undefined'
      ? undefined
      : matchOauthRedirectUri(window.location.href, metadata.redirect_uris)
  // AS still validates this against scopes encoded in loopback client_id /
  // hosted metadata. Passing it here matches authorize's options.scope path.
  // redirect_uri pins the current page so findRedirectUrl() matches on return.
  await oauthClient.signIn(identifier, {
    scope: getOauthScope(),
    ...(redirectUri ? {redirect_uri: redirectUri as LibraryRedirectUri} : {}),
  })
}

export async function restoreOAuthSession(did: string) {
  return getOAuthClient().restore(did)
}

/**
 * Best-effort AS revoke + local IndexedDB delete. Errors are logged and do
 * not throw so logout UI is never blocked.
 */
export async function revokeOAuthSession(did: string): Promise<void> {
  localRevokesInProgress.add(did)
  try {
    await getOAuthClient().revoke(did)
  } catch (e) {
    logger.error(`oauth: failed to revoke session`, {message: e})
  } finally {
    localRevokesInProgress.delete(did)
  }
}

const localRevokesInProgress = new Set<string>()

export function isLocalOAuthRevokeInProgress(did: string): boolean {
  return localRevokesInProgress.has(did)
}

/**
 * Subscribe to OAuth session invalidation.
 * 0.6.x emits via constructor `onDelete`; older clients used EventTarget
 * `deleted`. OAuthSession itself has no event API.
 */
export function subscribeOAuthSessionDeleted(
  listener: (detail: OauthDeletedDetail) => void,
): () => void {
  deletedListeners.add(listener)
  const oauthClient = getOAuthClient() as BrowserOAuthClient & {
    addEventListener?: (
      type: 'deleted',
      listener: (event: CustomEvent<OauthDeletedDetail>) => void,
    ) => void
    removeEventListener?: (
      type: 'deleted',
      listener: (event: CustomEvent<OauthDeletedDetail>) => void,
    ) => void
  }
  let eventTargetHandler:
    | ((event: CustomEvent<OauthDeletedDetail>) => void)
    | undefined
  if (typeof oauthClient.addEventListener === 'function') {
    eventTargetHandler = (event: CustomEvent<OauthDeletedDetail>) => {
      listener(event.detail)
    }
    oauthClient.addEventListener('deleted', eventTargetHandler)
  }
  return () => {
    deletedListeners.delete(listener)
    if (eventTargetHandler) {
      oauthClient.removeEventListener?.('deleted', eventTargetHandler)
    }
  }
}

export function clearOauthCallbackUrl() {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  const isCallbackPath = url.pathname === '/auth/web/callback'
  if (!url.hash && !url.search && !isCallbackPath) {
    return
  }
  url.hash = ''
  url.search = ''
  window.history.replaceState(
    {},
    '',
    isCallbackPath ? '/' : `${url.pathname}${url.search}`,
  )
}
