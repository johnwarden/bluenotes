import {
  BrowserOAuthClient,
  type OAuthClientMetadataInput,
} from '@atproto/oauth-client-browser'

import {
  getSnapshottedOauthCallbackParams,
  oauthCallbackSnapshotHadParams,
  oauthCallbackSnapshotRanBeforeStrip,
} from '#/lib/oauth/callback-snapshot'
import {
  getOauthHandleResolver,
  getOauthScope,
  getWebOauthResponseMode,
  isLoopbackOrigin,
  resolveWebClientMetadata,
} from '#/lib/oauth/config'
import {
  canonicalizeLoopbackHref,
  hrefWithoutOauthCallback,
  matchOauthRedirectUri,
  readOauthCallbackParams,
} from '#/lib/oauth/loopback-callback'
import {
  classifyOauthExchangeError,
  createResettableSingleton,
  describeOauthCallbackParams,
  describeOauthDeletedCause,
  describeOauthFailureDiagnosis,
  describeOauthInitResult,
  describeSilentAnonymousDiagnosis,
  exchangeOrRestoreOauthSession,
  formatOauthCallbackDocumentBreadcrumb,
  isSilentAnonymousOauthFailure,
  leftoverGrantBlocksSoftGatePass,
  leftoverOauthGrantKeysFromHref,
  OAUTH_BREADCRUMB,
  oauthConsoleBreadcrumb,
  type OauthExchangeAttemptRecord,
  shouldStripOauthCallbackAfterDiagnosis,
} from '#/lib/oauth/oauth-init-policy'
import {logger} from '#/logger'

let client: BrowserOAuthClient | undefined

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
      // c8e3a12de: delStored after token 200 (DPoP getProfile 401) dropped
      // the session while login() still returned. Breadcrumb distinguishes
      // that from resumeSession abort / password overwrite.
      oauthConsoleBreadcrumb(
        OAUTH_BREADCRUMB.sessionDeleted,
        describeOauthDeletedCause(cause),
      )
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
 * Log the callback document *before* localhost rewrite or hash strip so a
 * live smoke can see hasCode/hasState even when the app logger has no
 * console transport (production EXPO_PUBLIC_ENV).
 */
function reportCallbackDocument(params: URLSearchParams | null): void {
  if (typeof window === 'undefined') {
    return
  }
  const report = {
    ...describeOauthCallbackParams(params),
    origin: window.location.origin,
    pathname: window.location.pathname,
    hashPresent: Boolean(window.location.hash),
    searchPresent: Boolean(window.location.search),
    willRewriteLocalhost: Boolean(
      canonicalizeLoopbackHref(window.location.href),
    ),
  }
  if (!report.present && !report.willRewriteLocalhost) {
    return
  }
  logger.warn(`oauth: callback document`, report)
  oauthConsoleBreadcrumb(formatOauthCallbackDocumentBreadcrumb(report))
}

/**
 * Snapshot callback params at first web-module evaluation, before any
 * later history.replaceState / hash-router can strip them. Recreated
 * after a localhost → 127.0.0.1 navigation (new document).
 */
const initialCallbackParams: URLSearchParams | null = (() => {
  const fromEntry = getSnapshottedOauthCallbackParams()
  if (typeof window === 'undefined') {
    return fromEntry
  }
  const params = fromEntry ?? readOauthCallbackParams(window.location.href)
  reportCallbackDocument(params)
  return rewriteLocalhostOriginIfNeeded() ? null : params
})()

type LibraryRedirectUri = Parameters<BrowserOAuthClient['initCallback']>[1]

let lastOauthInitError: unknown
let lastExchangeAttempt: OauthExchangeAttemptRecord = {
  outcome: 'never_ran',
  neverRanReason: 'unknown',
}

export function peekLastOauthInitError(): unknown {
  return lastOauthInitError
}

export function peekLastOauthExchangeAttempt(): OauthExchangeAttemptRecord {
  return lastExchangeAttempt
}

function recordOauthExchangeAttempt(attempt: OauthExchangeAttemptRecord): void {
  lastExchangeAttempt = attempt
}

/**
 * Console diagnosis when exchange fails or the session stays anonymous.
 * Leftover `#state=` always includes exchangeAttempt (never_ran vs
 * ran_and_failed). Shape only: no tokens, codes, or bodies.
 */
export function reportOauthFailureDiagnosis(error?: unknown): void {
  if (arguments.length > 0) {
    lastOauthInitError = error
  }
  const href = typeof window === 'undefined' ? '' : window.location.href
  const diagnosis = describeOauthFailureDiagnosis({
    href,
    error: error ?? lastOauthInitError,
    snapshotRanBeforeStrip: oauthCallbackSnapshotRanBeforeStrip(),
    snapshotHadCallbackParams: oauthCallbackSnapshotHadParams(),
    exchangeAttempt: lastExchangeAttempt.outcome,
    exchangeNeverRanReason: lastExchangeAttempt.neverRanReason,
  })
  oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.failureDiagnosis, diagnosis)
  logger.warn(OAUTH_BREADCRUMB.failureDiagnosis, diagnosis)
  if (leftoverGrantBlocksSoftGatePass(diagnosis.leftoverGrantKeys)) {
    oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.leftoverGrant, {
      exchangeAttempt: diagnosis.exchangeAttempt,
      exchangeNeverRanReason: diagnosis.exchangeNeverRanReason,
      leftoverGrantKeys: diagnosis.leftoverGrantKeys,
      exchangeErrorKind: diagnosis.exchangeErrorKind,
      tokenEndpointHttpStatus: diagnosis.tokenEndpointHttpStatus,
      tokenEndpointFailureClass: diagnosis.tokenEndpointFailureClass,
      snapshotRanBeforeStrip: diagnosis.snapshotRanBeforeStrip,
      snapshotHadCallbackParams: diagnosis.snapshotHadCallbackParams,
    })
    // After the leftover / classify-kind breadcrumbs: hosted strips so
    // #code=/#state= do not linger in history. Loopback keeps them.
    if (
      typeof window !== 'undefined' &&
      shouldStripOauthCallbackAfterDiagnosis(
        isLoopbackOrigin(window.location.origin),
      )
    ) {
      clearOauthCallbackUrl()
    }
  } else if (
    isSilentAnonymousOauthFailure({
      leftoverGrantKeys: diagnosis.leftoverGrantKeys,
      hashEmpty:
        typeof window === 'undefined'
          ? true
          : !window.location.hash || window.location.hash === '#',
      snapshotHadCallbackParams: diagnosis.snapshotHadCallbackParams,
      exchangeAttempt: diagnosis.exchangeAttempt,
    })
  ) {
    oauthConsoleBreadcrumb(
      OAUTH_BREADCRUMB.silentAnonymous,
      describeSilentAnonymousDiagnosis({
        pathname:
          typeof window === 'undefined' ? '/' : window.location.pathname,
        snapshotRanBeforeStrip: diagnosis.snapshotRanBeforeStrip,
        snapshotHadCallbackParams: diagnosis.snapshotHadCallbackParams,
        exchangeAttempt: diagnosis.exchangeAttempt,
        exchangeNeverRanReason: diagnosis.exchangeNeverRanReason,
        exchangeErrorKind: diagnosis.exchangeErrorKind,
      }),
    )
  }
}

/** Empty hash + no leftover grant after we saw/exchanged a callback. */
export function shouldReportSilentAnonymousPaint(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return isSilentAnonymousOauthFailure({
    leftoverGrantKeys: leftoverOauthGrantKeysFromHref(window.location.href),
    hashEmpty: !window.location.hash || window.location.hash === '#',
    snapshotHadCallbackParams: oauthCallbackSnapshotHadParams(),
    exchangeAttempt: lastExchangeAttempt.outcome,
  })
}

/** Peek leftover `#code=` / `#state=` *before* any replaceState strip. */
export function peekLeftoverOauthGrantKeys(): Array<'code' | 'state'> {
  if (typeof window === 'undefined') {
    return []
  }
  return leftoverOauthGrantKeysFromHref(window.location.href)
}

/** True when `#code=` / `#state=` (or query) are still on the address bar. */
export function hasLeftoverOauthGrantInUrl(): boolean {
  return peekLeftoverOauthGrantKeys().length > 0
}

/**
 * IndexedDB still has this DID's OAuth session (no refresh). Used so
 * `loginEstablished` cannot fire after `delStored` (c8e3a12de: established
 * then silent-anonymous / Sign in).
 */
export async function peekOauthSessionAlive(did: string): Promise<boolean> {
  try {
    const client = getOAuthClient() as BrowserOAuthClient & {
      sessionGetter?: {getStored?: (sub: string) => Promise<unknown>}
    }
    // Prefer a store read. restore() can delStored on
    // AuthMethodUnsatisfiableError, which would recreate the c8e3a12de wipe.
    if (typeof client.sessionGetter?.getStored === 'function') {
      const stored = await client.sessionGetter.getStored(did)
      return stored != null
    }
    const session = await client.restore(did, false)
    return session != null
  } catch {
    return false
  }
}

/**
 * True when this document loaded with an authorization response (or we
 * snapshotted one before a router / replaceState stripped the URL). Used by
 * App bootstrap so callback errors are not swallowed.
 */
export function hasPendingOauthCallback(): boolean {
  if (initialCallbackParams) {
    return true
  }
  if (typeof window === 'undefined') {
    return false
  }
  return readOauthCallbackParams(window.location.href) !== null
}

async function runOauthClientInit(): Promise<OauthInitResult | undefined> {
  if (rewriteLocalhostOriginIfNeeded()) {
    recordOauthExchangeAttempt({
      outcome: 'never_ran',
      neverRanReason: 'localhost_rewrite',
    })
    // Navigating off localhost; do not open IndexedDB on the wrong origin.
    return undefined
  }
  const oauthClient = getOAuthClient()
  const params =
    initialCallbackParams ??
    oauthClient.readCallbackParams() ??
    readOauthCallbackParams(window.location.href)
  const metadata = resolveWebClientMetadata(currentOrigin())
  const callbackShape = describeOauthCallbackParams(params)
  // warn on callback loads so a production-filtered info transport still
  // leaves a console breadcrumb for live loopback smoke.
  const startMeta = {
    ...callbackShape,
    origin: window.location.origin,
    pathname: window.location.pathname,
    hashPresent: Boolean(window.location.hash),
    searchPresent: Boolean(window.location.search),
  }
  oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.initStarting, startMeta)
  if (callbackShape.present) {
    logger.warn(OAUTH_BREADCRUMB.initStarting, startMeta)
  } else {
    logger.info(OAUTH_BREADCRUMB.initStarting, startMeta)
  }

  try {
    const result = await exchangeOrRestoreOauthSession({
      callbackParams: params,
      libraryInit: () => oauthClient.init(),
      libraryInitCallback: async (callbackParams, redirectUri) => {
        // Do not use initCallback(): it history.replaceState()s the hash
        // *before* exchangeCode. Live consent then landed on a clean URL
        // with no session. callback() uses the snapshotted params.
        const exchanged = await oauthClient.callback(callbackParams, {
          redirect_uri: redirectUri as LibraryRedirectUri,
        })
        try {
          await oauthClient.restore(exchanged.session.sub, false)
        } catch {
          // Session is already in IndexedDB; restore only pins last-sub.
        }
        return exchanged
      },
      resolveRedirectUri: () =>
        oauthClient.findRedirectUrl() ??
        matchOauthRedirectUri(window.location.href, metadata.redirect_uris),
      stripCallbackFromAddressBar: () => {
        // Snapshot already holds code/state. Strip *both* query and
        // fragment so a query-mode client still consumes a fragment
        // response on this load and a refresh cannot replay the code.
        window.history.replaceState(
          null,
          '',
          hrefWithoutOauthCallback(window.location.href),
        )
      },
      onForcedCallback: () => {
        logger.warn(
          `oauth: exchanging authorization response via callback() (hash still present)`,
        )
      },
      onExchangeAttempt: recordOauthExchangeAttempt,
    })
    const finishMeta = describeOauthInitResult(result)
    oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.initFinished, finishMeta)
    if (callbackShape.present) {
      logger.warn(OAUTH_BREADCRUMB.initFinished, finishMeta)
    } else {
      logger.info(OAUTH_BREADCRUMB.initFinished, finishMeta)
    }
    lastOauthInitError = undefined
    const leftoverAfterInit =
      typeof window === 'undefined'
        ? []
        : leftoverOauthGrantKeysFromHref(window.location.href)
    if (leftoverGrantBlocksSoftGatePass(leftoverAfterInit)) {
      reportOauthFailureDiagnosis()
    }
    return result
  } catch (e) {
    const classified = classifyOauthExchangeError(e)
    logger.error(
      params
        ? `oauth: client initCallback failed`
        : `oauth: client init failed`,
      {
        ...classified,
        ...describeOauthCallbackParams(params),
      },
    )
    reportOauthFailureDiagnosis(e)
    throw e
  }
}

const oauthInitSingleton = createResettableSingleton(runOauthClientInit)

/**
 * Must run once per page load. Handles the authorization redirect (if present)
 * and restores the last OAuth session from IndexedDB.
 *
 * Concurrent callers share one promise. A rejection resets the singleton so
 * InnerApp can retry after a swallowed bootstrap error.
 */
export function initOAuthClient(): Promise<OauthInitResult | undefined> {
  return oauthInitSingleton.run()
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
