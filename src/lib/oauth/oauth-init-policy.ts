/**
 * OAuth bootstrap policy for the web app.
 *
 * #18 retried `initCallback` only when `BrowserOAuthClient.init()` *resolved*
 * without a `state` own-property. If `init()` threw — leftover
 * `@@atproto/oauth-client-browser(sub)` restore, or `initCallback` after a
 * silent strip — the retry never ran. `App` then did
 * `initOAuthClient().catch(() => undefined)`, locking InnerApp onto the same
 * rejected singleton and painting signed-out chrome (Sign in visible).
 *
 * Rules:
 * 1. When an authorization response was snapshotted, call `initCallback`
 *    first. Do not call `init()` (it may throw before the #18 retry).
 * 2. Do not swallow init errors while callback params are present.
 * 3. A rejected singleton must reset so InnerApp can retry.
 * 4. Do not paint signed-out chrome until login() has been attempted
 *    (and retried once) against that authorization response.
 */

export type OauthLibraryInitResult<TSession> =
  | {session: TSession; state?: never}
  | {session: TSession; state: string | null}
  | undefined

export type OauthExchangeResult<TSession> = {
  session: TSession
  state?: string
}

/** Safe to log: never includes `code` or `state` values. */
export function describeOauthCallbackParams(params: URLSearchParams | null): {
  present: boolean
  hasCode: boolean
  hasState: boolean
  hasError: boolean
  error?: string
} {
  if (!params) {
    return {present: false, hasCode: false, hasState: false, hasError: false}
  }
  return {
    present: true,
    hasCode: params.has('code'),
    hasState: params.has('state'),
    hasError: params.has('error'),
    ...(params.get('error') ? {error: params.get('error') ?? undefined} : {}),
  }
}

export type OauthCallbackDocumentReport = ReturnType<
  typeof describeOauthCallbackParams
> & {
  origin: string
  pathname: string
  hashPresent: boolean
  searchPresent: boolean
  willRewriteLocalhost: boolean
}

/** One-line breadcrumb for DevTools when the app logger has no console transport. */
export function formatOauthCallbackDocumentBreadcrumb(
  report: OauthCallbackDocumentReport,
): string {
  return `oauth: callback document ${JSON.stringify(report)}`
}

/** Exact strings the loopback smoke gate greps for. */
export const OAUTH_BREADCRUMB = {
  initStarting: 'oauth: init starting',
  initFinished: 'oauth: init finished',
  loginStarting: 'oauth: login() starting OauthBskyAppAgent',
  loginEstablished: 'oauth: login() established OauthBskyAppAgent',
  failureDiagnosis: 'oauth: failure diagnosis',
} as const

export function oauthConsoleBreadcrumb(
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') {
    return
  }
  if (meta && Object.keys(meta).length > 0) {
    console.info(message, meta)
  } else {
    console.info(message)
  }
}

export type OauthExchangeErrorKind =
  | 'cors'
  | 'dpop'
  | 'redirect_uri'
  | 'pkce_state'
  | 'token'
  | 'other'

/** Classify token-exchange failures without logging secrets. */
export function classifyOauthExchangeError(error: unknown): {
  kind: OauthExchangeErrorKind
  name: string
  message: string
} {
  const err = error instanceof Error ? error : new Error(String(error))
  const text = `${err.name} ${err.message}`.toLowerCase()
  let kind: OauthExchangeErrorKind = 'other'
  if (
    /cors|failed to fetch|networkerror|access-control-allow-origin|load failed/.test(
      text,
    )
  ) {
    kind = 'cors'
  } else if (/dpop|use_dpop_nonce|invalid_dpop/.test(text)) {
    kind = 'dpop'
  } else if (/redirect[_ ]?uri/.test(text)) {
    kind = 'redirect_uri'
  } else if (
    /unknown authorization session|missing "state"|pkce|verifier/.test(text)
  ) {
    kind = 'pkce_state'
  } else if (
    /invalid_grant|invalid_client|unauthorized_client|token/.test(text)
  ) {
    kind = 'token'
  }
  return {kind, name: err.name, message: err.message}
}

export type OauthTokenFailureClass = 'http' | 'network' | 'none'

/**
 * Leftover `#code=` / `#state=` (or query equivalents) after a failed or
 * skipped exchange. Expected on failed exchange for loopback diagnosis;
 * forbidden after a successful login.
 */
export function leftoverOauthGrantKeysFromHref(
  href: string,
): Array<'code' | 'state'> {
  let parsed: URL
  try {
    parsed = new URL(href)
  } catch {
    return []
  }
  const rawHash = parsed.hash.startsWith('#')
    ? parsed.hash.slice(1)
    : parsed.hash
  const fromHash = new URLSearchParams(
    rawHash.startsWith('/') ? rawHash.slice(1) : rawHash,
  )
  const fromQuery = parsed.searchParams
  const keys: Array<'code' | 'state'> = []
  if (fromQuery.has('code') || fromHash.has('code')) {
    keys.push('code')
  }
  if (fromQuery.has('state') || fromHash.has('state')) {
    keys.push('state')
  }
  return keys
}

/**
 * HTTP status on `OAuthResponseError` (`@atproto/oauth-client` `exchangeCode`).
 * Walks `.cause` once or twice. Does not read tokens, codes, or bodies.
 */
export function oauthErrorHttpStatus(error: unknown): number | null {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current; depth++) {
    if (!current || typeof current !== 'object') {
      break
    }
    const rec = current as Record<string, unknown>
    if (typeof rec.status === 'number' && Number.isFinite(rec.status)) {
      return rec.status
    }
    const response = rec.response
    if (response && typeof response === 'object') {
      const status = (response as {status?: unknown}).status
      if (typeof status === 'number' && Number.isFinite(status)) {
        return status
      }
    }
    current = rec.cause
  }
  return null
}

export type OauthFailureDiagnosis = {
  leftoverGrantInUrl: boolean
  leftoverGrantKeys: Array<'code' | 'state'>
  exchangeErrorKind: OauthExchangeErrorKind | 'none'
  tokenEndpointHttpStatus: number | null
  tokenEndpointFailureClass: OauthTokenFailureClass
  snapshotRanBeforeStrip: boolean
  snapshotHadCallbackParams: boolean
}

/**
 * Non-secret diagnosis for a failed token exchange or anonymous-after-callback.
 * Never includes `code`, `state`, tokens, or response bodies.
 */
export function describeOauthFailureDiagnosis(input: {
  href: string
  error?: unknown
  snapshotRanBeforeStrip: boolean
  snapshotHadCallbackParams: boolean
}): OauthFailureDiagnosis {
  const leftoverGrantKeys = leftoverOauthGrantKeysFromHref(input.href)
  const tokenEndpointHttpStatus = oauthErrorHttpStatus(input.error)
  let tokenEndpointFailureClass: OauthTokenFailureClass = 'none'
  if (tokenEndpointHttpStatus != null) {
    tokenEndpointFailureClass = 'http'
  } else if (input.error) {
    tokenEndpointFailureClass =
      classifyOauthExchangeError(input.error).kind === 'cors'
        ? 'network'
        : 'none'
  }
  return {
    leftoverGrantInUrl: leftoverGrantKeys.length > 0,
    leftoverGrantKeys,
    exchangeErrorKind: input.error
      ? classifyOauthExchangeError(input.error).kind
      : 'none',
    tokenEndpointHttpStatus,
    tokenEndpointFailureClass,
    snapshotRanBeforeStrip: input.snapshotRanBeforeStrip,
    snapshotHadCallbackParams: input.snapshotHadCallbackParams,
  }
}

/** Safe to log: session/state *shape* only, no tokens. */
export function describeOauthInitResult(
  result: {session?: unknown; state?: string} | undefined,
): {
  hasSession: boolean
  hasStateProperty: boolean
} {
  return {
    hasSession: Boolean(result?.session),
    hasStateProperty: Boolean(
      result && Object.prototype.hasOwnProperty.call(result, 'state'),
    ),
  }
}

export function shouldPropagateOauthInitError(
  hasCallbackParams: boolean,
): boolean {
  return hasCallbackParams
}

/**
 * Bootstrap `Promise.all` helper. Callback-present failures must reject so
 * `App` cannot hide them with `.catch(() => undefined)`.
 */
export function wrapBootstrapOauthInit<T>(
  init: Promise<T>,
  hasCallbackParams: boolean,
  onSwallowedError?: (error: unknown) => void,
): Promise<T | undefined> {
  if (shouldPropagateOauthInitError(hasCallbackParams)) {
    return init
  }
  return init.catch(error => {
    onSwallowedError?.(error)
    return undefined
  })
}

/**
 * After InnerApp's launch attempt: paint only when we are not still waiting
 * on a callback retry. Once retries are exhausted we paint (error toast)
 * rather than leave a blank splash forever.
 */
export function shouldPaintAppAfterOauthLaunch(args: {
  establishedAppSession: boolean
  hasCallbackParams: boolean
  retriesExhausted: boolean
}): boolean {
  if (
    args.hasCallbackParams &&
    !args.establishedAppSession &&
    !args.retriesExhausted
  ) {
    return false
  }
  return true
}

export function createResettableSingleton<T>(factory: () => Promise<T>): {
  run: () => Promise<T>
  peek: () => Promise<T> | undefined
} {
  let current: Promise<T> | undefined
  return {
    peek: () => current,
    run: () => {
      if (!current) {
        current = factory().catch(error => {
          current = undefined
          throw error
        })
      }
      return current
    },
  }
}

/**
 * Exchange an authorization response or restore the last IndexedDB session.
 *
 * Callback params (from the module-eval snapshot, or a live URL read) always
 * take `initCallback`. `libraryInit` (`BrowserOAuthClient.init`) is only used
 * for restore-only loads. That is the hole #18 left: `init()` throw skipped
 * the snapshot retry.
 */
export async function exchangeOrRestoreOauthSession<TSession>(opts: {
  callbackParams: URLSearchParams | null
  libraryInit: () => Promise<OauthLibraryInitResult<TSession>>
  libraryInitCallback: (
    params: URLSearchParams,
    redirectUri: string,
  ) => Promise<{session: TSession; state: string | null}>
  resolveRedirectUri: () => string | undefined
  stripCallbackFromAddressBar?: () => void
  onForcedCallback?: () => void
}): Promise<OauthExchangeResult<TSession> | undefined> {
  if (opts.callbackParams) {
    const redirectUri = opts.resolveRedirectUri()
    if (!redirectUri) {
      throw new Error(
        'OAuth callback could not be completed: redirect URI mismatch',
      )
    }
    opts.onForcedCallback?.()
    // Exchange *before* stripping the address bar. Library initCallback()
    // and #18 both cleared #code= first; a failed token request then
    // looked like a clean anonymous landing (live 2026-09-05 STOP).
    const result = await opts.libraryInitCallback(
      opts.callbackParams,
      redirectUri,
    )
    opts.stripCallbackFromAddressBar?.()
    return {session: result.session, state: result.state ?? ''}
  }

  const result = await opts.libraryInit()
  if (!result) {
    return undefined
  }
  if (Object.prototype.hasOwnProperty.call(result, 'state')) {
    return {session: result.session, state: result.state ?? ''}
  }
  return {session: result.session}
}
