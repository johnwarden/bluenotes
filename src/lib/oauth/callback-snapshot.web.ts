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
} from '#/lib/oauth/oauth-init-policy'
import {
  canonicalizeLoopbackHref,
  readOauthCallbackParams,
} from './loopback-callback'

function capture(): URLSearchParams | null {
  if (typeof window === 'undefined') {
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
    // console.info survives production logger (Sentry-only transport).
    console.info(formatOauthCallbackDocumentBreadcrumb(report))
  }
  return params
}

const snapshottedOauthCallbackParams = capture()

export function getSnapshottedOauthCallbackParams(): URLSearchParams | null {
  return snapshottedOauthCallbackParams
}
