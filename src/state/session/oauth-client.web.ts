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

type OauthDeletedDetail = {sub: string; cause: unknown}

/**
 * Subscribe to BrowserOAuthClient `deleted` events (EventTarget).
 * OAuthSession has no addEventListener in @atproto/oauth-client 0.5.x.
 */
export function subscribeOAuthSessionDeleted(
  listener: (detail: OauthDeletedDetail) => void,
): () => void {
  const client = getOAuthClient() as BrowserOAuthClient & {
    addEventListener?: (
      type: 'deleted',
      listener: (event: CustomEvent<OauthDeletedDetail>) => void,
    ) => void
    removeEventListener?: (
      type: 'deleted',
      listener: (event: CustomEvent<OauthDeletedDetail>) => void,
    ) => void
  }
  if (typeof client.addEventListener !== 'function') {
    return () => {}
  }
  const handler = (event: CustomEvent<OauthDeletedDetail>) => {
    listener(event.detail)
  }
  client.addEventListener('deleted', handler)
  return () => {
    client.removeEventListener?.('deleted', handler)
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
