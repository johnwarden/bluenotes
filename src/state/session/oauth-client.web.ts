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
