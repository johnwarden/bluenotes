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

export type OauthExchangeErrorKind =
  | 'cors'
  | 'dpop'
  | 'redirect_uri'
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
    /invalid_grant|invalid_client|unauthorized_client|token/.test(text)
  ) {
    kind = 'token'
  }
  return {kind, name: err.name, message: err.message}
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
    opts.stripCallbackFromAddressBar?.()
    opts.onForcedCallback?.()
    const result = await opts.libraryInitCallback(
      opts.callbackParams,
      redirectUri,
    )
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
