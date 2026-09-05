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
  leftoverGrant: 'oauth: leftover grant',
  loginFailed: 'oauth: login() failed to establish OauthBskyAppAgent',
  snapshotEval: 'oauth: snapshot eval',
  silentAnonymous: 'oauth: silent anonymous',
  sessionDeleted: 'oauth: session deleted',
} as const

/**
 * Production `yarn build-web` runs `babel-plugin-transform-remove-console`,
 * which deletes Identifier `console.info` / `console.warn` / `console.log`.
 * Live 9a58ce838 smoke had token 200 + getSession 401 and **zero** oauth
 * breadcrumbs because of that. Reach the console via `globalThis` so the
 * plugin cannot strip these calls.
 */
function oauthDevtoolsConsole(): {
  warn: (message: string, ...rest: unknown[]) => void
} | null {
  const g = globalThis as {
    console?: {warn?: (message: string, ...rest: unknown[]) => void}
  }
  const warn = g.console?.warn
  if (typeof warn !== 'function') {
    return null
  }
  return {warn}
}

export function oauthConsoleBreadcrumb(
  message: string,
  meta?: Record<string, unknown>,
): void {
  const devtools = oauthDevtoolsConsole()
  if (!devtools) {
    return
  }
  if (meta && Object.keys(meta).length > 0) {
    devtools.warn(message, meta)
  } else {
    devtools.warn(message)
  }
}

/**
 * Password login may be discarded when a later task aborted it.
 * OAuth callback login must still dispatch: aborting after
 * `oauthCreateAgent` (React Strict / resumeSession) left Sign in
 * visible after a successful token exchange (9a58ce838).
 */
/** Safe to log: error class name only, never tokens or URLs. */
export function describeOauthDeletedCause(cause: unknown): {
  causeName: string
} {
  if (cause && typeof cause === 'object' && 'name' in cause) {
    const name = (cause as {name: unknown}).name
    if (typeof name === 'string' && name.length > 0 && name.length < 80) {
      return {causeName: name}
    }
  }
  return {causeName: 'unknown'}
}

export function shouldDiscardSessionLogin(args: {
  aborted: boolean
  isOauthSession: boolean
}): boolean {
  if (!args.aborted) {
    return false
  }
  return !args.isOauthSession
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
 * Hosted: strip `#code=` / `#state=` after diagnosis and before anonymous
 * paint so the grant does not linger in browser history. Loopback leaves
 * the hash for live diagnosis.
 */
export function shouldStripOauthCallbackAfterDiagnosis(
  isLoopbackOrigin: boolean,
): boolean {
  return !isLoopbackOrigin
}

/**
 * Leftover `#code=` / `#state=` (or query equivalents) after a failed or
 * skipped exchange. Expected on failed exchange for loopback diagnosis;
 * hosted strips after the diagnosis breadcrumb. Forbidden after a
 * successful login.
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

/**
 * Did `callback()` / `exchangeCode` run against this leftover grant?
 * Required whenever `#state=` remains — do not infer from error kind
 * (`redirect_uri` mismatch never entered the token request).
 */
export type OauthExchangeAttempt =
  | 'never_ran'
  | 'ran_and_failed'
  | 'ran_and_succeeded'

export type OauthExchangeNeverRanReason =
  | 'no_callback_params'
  | 'state_without_code'
  | 'redirect_uri_mismatch'
  | 'localhost_rewrite'
  | 'unknown'

export type OauthExchangeAttemptRecord = {
  outcome: OauthExchangeAttempt
  neverRanReason?: OauthExchangeNeverRanReason
}

export function inferOauthExchangeNeverRanReason(input: {
  leftoverGrantKeys: Array<'code' | 'state'>
  hadCallbackParams: boolean
  redirectUriResolved?: boolean
  localhostRewrite?: boolean
}): OauthExchangeNeverRanReason {
  if (input.localhostRewrite) {
    return 'localhost_rewrite'
  }
  if (input.hadCallbackParams && input.redirectUriResolved === false) {
    return 'redirect_uri_mismatch'
  }
  if (
    input.leftoverGrantKeys.includes('state') &&
    !input.leftoverGrantKeys.includes('code')
  ) {
    return 'state_without_code'
  }
  if (!input.hadCallbackParams) {
    return 'no_callback_params'
  }
  return 'unknown'
}

export function refineOauthExchangeNeverRanReason(
  reason: OauthExchangeNeverRanReason | undefined,
  leftoverGrantKeys: Array<'code' | 'state'>,
): OauthExchangeNeverRanReason | undefined {
  if (
    (reason === 'no_callback_params' || reason === undefined) &&
    leftoverGrantKeys.includes('state') &&
    !leftoverGrantKeys.includes('code')
  ) {
    return 'state_without_code'
  }
  return reason
}

export type OauthFailureDiagnosis = {
  leftoverGrantInUrl: boolean
  leftoverGrantKeys: Array<'code' | 'state'>
  exchangeAttempt: OauthExchangeAttempt
  exchangeNeverRanReason?: OauthExchangeNeverRanReason
  exchangeErrorKind: OauthExchangeErrorKind | 'none'
  tokenEndpointHttpStatus: number | null
  tokenEndpointFailureClass: OauthTokenFailureClass
  snapshotRanBeforeStrip: boolean
  snapshotHadCallbackParams: boolean
}

/**
 * Leftover `#state=` is never a soft-gate PASS, even if login painted.
 * The diagnosis must already distinguish never-ran vs ran-and-failed.
 */
export function leftoverGrantBlocksSoftGatePass(
  leftoverGrantKeys: Array<'code' | 'state'>,
): boolean {
  return (
    leftoverGrantKeys.includes('state') || leftoverGrantKeys.includes('code')
  )
}

/**
 * Empty hash + no leftover `#state=` after consent is a different
 * failure than leftover-grant. 9a58ce838: token 200, hash gone, Sign in,
 * no leftover-grant line. That path must still be diagnosable.
 */
export function isSilentAnonymousOauthFailure(input: {
  leftoverGrantKeys: Array<'code' | 'state'>
  hashEmpty: boolean
  snapshotHadCallbackParams: boolean
  exchangeAttempt: OauthExchangeAttempt
}): boolean {
  if (leftoverGrantBlocksSoftGatePass(input.leftoverGrantKeys)) {
    return false
  }
  if (!input.hashEmpty) {
    return false
  }
  return (
    input.snapshotHadCallbackParams ||
    input.exchangeAttempt === 'ran_and_succeeded' ||
    input.exchangeAttempt === 'ran_and_failed'
  )
}

export type OauthSilentAnonymousDiagnosis = {
  leftoverGrantInUrl: false
  leftoverGrantKeys: []
  hashEmpty: true
  pathname: string
  snapshotRanBeforeStrip: boolean
  snapshotHadCallbackParams: boolean
  exchangeAttempt: OauthExchangeAttempt
  exchangeNeverRanReason?: OauthExchangeNeverRanReason
  exchangeErrorKind: OauthExchangeErrorKind | 'none'
}

export function describeSilentAnonymousDiagnosis(input: {
  pathname: string
  snapshotRanBeforeStrip: boolean
  snapshotHadCallbackParams: boolean
  exchangeAttempt: OauthExchangeAttempt
  exchangeNeverRanReason?: OauthExchangeNeverRanReason
  exchangeErrorKind?: OauthExchangeErrorKind | 'none'
}): OauthSilentAnonymousDiagnosis {
  return {
    leftoverGrantInUrl: false,
    leftoverGrantKeys: [],
    hashEmpty: true,
    pathname: input.pathname,
    snapshotRanBeforeStrip: input.snapshotRanBeforeStrip,
    snapshotHadCallbackParams: input.snapshotHadCallbackParams,
    exchangeAttempt: input.exchangeAttempt,
    ...(input.exchangeAttempt === 'never_ran' && input.exchangeNeverRanReason
      ? {exchangeNeverRanReason: input.exchangeNeverRanReason}
      : {}),
    exchangeErrorKind: input.exchangeErrorKind ?? 'none',
  }
}

/**
 * Soft-gate PASS claim. c8e3a12de logged `login() established` when
 * `currentAccount` was briefly set, then DPoP getProfile 401 `delStored`
 * the session and `silent anonymous` fired at Sign-in paint. Require a
 * durable account *and* a still-present IndexedDB OAuth session. Never
 * over leftover `#code=`/`#state=`.
 */
export function shouldEmitOauthLoginEstablishedBreadcrumb(args: {
  hasCurrentAccount: boolean
  leftoverGrantInUrl: boolean
  oauthSessionAlive: boolean
}): boolean {
  return (
    args.hasCurrentAccount && !args.leftoverGrantInUrl && args.oauthSessionAlive
  )
}

/**
 * Peek leftover grant keys, then decide whether `login() established`
 * may fire. Must run *before* `clearOauthCallbackUrl()` — that replaceState
 * always wipes hash/search, which made the leftover gate dead (fd83c6624).
 *
 * `emitLoginEstablished` here is only the leftover-URL half. App.web still
 * requires {@link shouldEmitOauthLoginEstablishedBreadcrumb} (account +
 * alive IndexedDB session) before the breadcrumb.
 */
export function decideOauthLoginEstablishedAfterPeek(
  leftoverGrantKeys: Array<'code' | 'state'>,
): {
  leftoverGrantKeys: Array<'code' | 'state'>
  emitLoginEstablished: boolean
  clearCallbackUrl: boolean
  emitLeftoverGrant: boolean
} {
  if (leftoverGrantBlocksSoftGatePass(leftoverGrantKeys)) {
    return {
      leftoverGrantKeys,
      emitLoginEstablished: false,
      clearCallbackUrl: false,
      emitLeftoverGrant: true,
    }
  }
  return {
    leftoverGrantKeys,
    emitLoginEstablished: true,
    clearCallbackUrl: true,
    emitLeftoverGrant: false,
  }
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
  exchangeAttempt: OauthExchangeAttempt
  exchangeNeverRanReason?: OauthExchangeNeverRanReason
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
  const exchangeNeverRanReason =
    input.exchangeAttempt === 'never_ran'
      ? (refineOauthExchangeNeverRanReason(
          input.exchangeNeverRanReason,
          leftoverGrantKeys,
        ) ??
        inferOauthExchangeNeverRanReason({
          leftoverGrantKeys,
          hadCallbackParams: input.snapshotHadCallbackParams,
        }))
      : undefined
  return {
    leftoverGrantInUrl: leftoverGrantKeys.length > 0,
    leftoverGrantKeys,
    exchangeAttempt: input.exchangeAttempt,
    ...(exchangeNeverRanReason ? {exchangeNeverRanReason} : {}),
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
  onExchangeAttempt?: (attempt: OauthExchangeAttemptRecord) => void
}): Promise<OauthExchangeResult<TSession> | undefined> {
  if (opts.callbackParams) {
    const redirectUri = opts.resolveRedirectUri()
    if (!redirectUri) {
      opts.onExchangeAttempt?.({
        outcome: 'never_ran',
        neverRanReason: 'redirect_uri_mismatch',
      })
      throw new Error(
        'OAuth callback could not be completed: redirect URI mismatch',
      )
    }
    opts.onForcedCallback?.()
    // Exchange *before* stripping the address bar. Library initCallback()
    // and #18 both cleared #code= first; a failed token request then
    // looked like a clean anonymous landing (live 2026-09-05 STOP).
    try {
      const result = await opts.libraryInitCallback(
        opts.callbackParams,
        redirectUri,
      )
      opts.onExchangeAttempt?.({outcome: 'ran_and_succeeded'})
      opts.stripCallbackFromAddressBar?.()
      return {session: result.session, state: result.state ?? ''}
    } catch (e) {
      opts.onExchangeAttempt?.({outcome: 'ran_and_failed'})
      throw e
    }
  }

  opts.onExchangeAttempt?.({
    outcome: 'never_ran',
    neverRanReason: 'no_callback_params',
  })
  const result = await opts.libraryInit()
  if (!result) {
    return undefined
  }
  if (Object.prototype.hasOwnProperty.call(result, 'state')) {
    return {session: result.session, state: result.state ?? ''}
  }
  return {session: result.session}
}
