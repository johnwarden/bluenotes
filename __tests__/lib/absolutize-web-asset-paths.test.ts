const {
  absolutizeAssetUrl,
  absolutizeHtmlAssetPaths,
} = require('../../scripts/absolutize-web-asset-paths')

describe('absolutize web-build asset paths', () => {
  it('prefixes relative static/ URLs used by webpack publicPath=auto', () => {
    expect(absolutizeAssetUrl('static/js/main.abc.js')).toBe(
      '/static/js/main.abc.js',
    )
    expect(absolutizeAssetUrl('./static/css/main.abc.css')).toBe(
      '/static/css/main.abc.css',
    )
  })

  it('leaves already-absolute, remote, and template URLs alone', () => {
    expect(absolutizeAssetUrl('/static/js/main.abc.js')).toBe(
      '/static/js/main.abc.js',
    )
    expect(absolutizeAssetUrl('https://cdn.example/static/js/main.js')).toBe(
      'https://cdn.example/static/js/main.js',
    )
    expect(absolutizeAssetUrl('{{ staticCDNHost }}/static/js/main.js')).toBe(
      '{{ staticCDNHost }}/static/js/main.js',
    )
  })

  it('rewrites deep-link-breaking script and stylesheet tags in index.html', () => {
    const html = [
      '<!doctype html><html><head>',
      '<link href="static/css/main.abc.css" rel="stylesheet">',
      '<link href="/static/style.css" rel="stylesheet">',
      '</head><body>',
      '<script defer="defer" src="static/js/main.abc.js"></script>',
      '<script src="https://cdn.example/static/js/extra.js"></script>',
      '</body></html>',
    ].join('')

    expect(absolutizeHtmlAssetPaths(html)).toBe(
      [
        '<!doctype html><html><head>',
        '<link href="/static/css/main.abc.css" rel="stylesheet">',
        '<link href="/static/style.css" rel="stylesheet">',
        '</head><body>',
        '<script defer="defer" src="/static/js/main.abc.js"></script>',
        '<script src="https://cdn.example/static/js/extra.js"></script>',
        '</body></html>',
      ].join(''),
    )
  })
})
