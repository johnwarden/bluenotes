/**
 * First-import snapshot of the OAuth authorization response.
 *
 * Import this module from index.web.js *before* polyfills, Sentry, or the
 * app graph. Later history.replaceState / hash-router / library
 * initCallback() can strip #code= before oauth-client.web.ts evaluates.
 */
import {
  describeOauthCallbackParams,
  formatOauthCallbackDocumentBreadcrumb,
  OAUTH_BREADCRUMB,
  oauthConsoleBreadcrumb,
} from '#/lib/oauth/oauth-init-policy'
import {
  canonicalizeLoopbackHref,
  readOauthCallbackParams,
} from './loopback-callback'

function capture(): URLSearchParams | null {
  if (typeof window === 'undefined' || !window.location?.href) {
    oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.snapshotEval, {
      present: false,
      hasCode: false,
      hasState: false,
      hasError: false,
      origin: '',
      pathname: '',
      hashPresent: false,
      searchPresent: false,
      willRewriteLocalhost: false,
    })
    return null
  }
  const params = readOauthCallbackParams(window.location.href)
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
  // Always log at module-eval, before React. Silence here means this
  // document never ran bootstrap (wrong bundle / console filter) or
  // the snapshot module did not evaluate. present:true = grant was on
  // the URL before any strip. present:false + empty hash = this
  // document is not the callback document (9a58ce838 silent path).
  oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.snapshotEval, report)
  if (report.present || report.willRewriteLocalhost) {
    oauthConsoleBreadcrumb(formatOauthCallbackDocumentBreadcrumb(report))
  }
  return params
}

const snapshottedOauthCallbackParams = capture()
/** True after this module evaluated and read the callback document. */
const snapshotEvaluatedAtModuleLoad = true

export function getSnapshottedOauthCallbackParams(): URLSearchParams | null {
  return snapshottedOauthCallbackParams
}

/**
 * Did the module-eval snapshot run before any hash rewrite/strip in this
 * bundle? True once this file has executed (`index.web.js` first import).
 */
export function oauthCallbackSnapshotRanBeforeStrip(): boolean {
  return snapshotEvaluatedAtModuleLoad
}

/** Did the pre-strip snapshot contain `#code=` / `#state=` (or query)? */
export function oauthCallbackSnapshotHadParams(): boolean {
  return snapshottedOauthCallbackParams !== null
}
