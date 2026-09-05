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
  oauthConsoleBreadcrumb,
} from '#/lib/oauth/oauth-init-policy'
import {
  canonicalizeLoopbackHref,
  readOauthCallbackParams,
} from './loopback-callback'

function capture(): URLSearchParams | null {
  if (typeof window === 'undefined' || !window.location?.href) {
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
  if (report.present || report.willRewriteLocalhost) {
    // Must use oauthConsoleBreadcrumb: Identifier `console.info` is
    // stripped by production transform-remove-console (9a58ce838 smoke).
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
