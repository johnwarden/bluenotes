import {
  BrowserOAuthClient,
  type OAuthClientMetadataInput,
} from '@atproto/oauth-client-browser'

import {
  buildWebClientMetadata,
  getOauthHandleResolver,
  shouldUseLoopbackClient,
} from '#/lib/oauth/config'
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
  const useLoopback = shouldUseLoopbackClient(origin)
  return new BrowserOAuthClient({
    handleResolver: getOauthHandleResolver(),
    // Loopback clients are hardcoded by ATProto auth servers. Hosted metadata
    // must match the JSON served at client_id exactly.
    clientMetadata: useLoopback
      ? undefined
      : (buildWebClientMetadata(
          origin || undefined,
        ) as OAuthClientMetadataInput),
    responseMode: 'fragment',
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

/**
 * Must run once per page load. Handles the authorization redirect (if present)
 * and restores the last OAuth session from IndexedDB.
 */
export function initOAuthClient(): Promise<OauthInitResult | undefined> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const result = await getOAuthClient().init()
        if (!result) {
          return undefined
        }
        if ('state' in result) {
          return {session: result.session, state: result.state ?? ''}
        }
        return {session: result.session}
      } catch (e) {
        logger.error(`oauth: client init failed`, {message: e})
        return undefined
      }
    })()
  }
  return initPromise
}

export async function signInWithOAuth(identifier: string): Promise<void> {
  const oauthClient = getOAuthClient()
  await oauthClient.signIn(identifier)
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
