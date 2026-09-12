/**
 * Rewrite relative `static/…` asset URLs to root-absolute `/static/…`.
 *
 * Webpack `output.publicPath = 'auto'` emits relative script/link hrefs so
 * dynamically loaded chunks can follow a CDN-hosted entry bundle. Those
 * relative hrefs break SPA deep links: `/community-notes/feeds` resolves
 * `static/js/main.js` as `/community-notes/static/js/main.js`, the server
 * returns HTML, and the browser reports a JS parse error (stuck splash).
 *
 * Production bskyweb injects `{{ staticCDNHost }}/static/…` via
 * post-web-build.js and is unchanged. This helper only prefixes paths that
 * already look like `static/…`.
 */

/**
 * @param {string} url
 * @returns {string}
 */
function absolutizeAssetUrl(url) {
  if (typeof url !== 'string' || url.length === 0) {
    return url
  }
  const trimmed = url.replace(/^\.\//, '')
  if (trimmed.startsWith('static/')) {
    return `/${trimmed}`
  }
  return url
}

/**
 * @param {string} html
 * @returns {string}
 */
function absolutizeHtmlAssetPaths(html) {
  if (typeof html !== 'string' || html.length === 0) {
    return html
  }
  return html.replace(
    /(\b(?:src|href))=(["'])(?!\/|https?:|\/\/|data:|\{\{)([^"']+)\2/gi,
    (_match, attr, quote, url) => {
      return `${attr}=${quote}${absolutizeAssetUrl(url)}${quote}`
    },
  )
}

module.exports = {
  absolutizeAssetUrl,
  absolutizeHtmlAssetPaths,
}
