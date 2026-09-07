import {describe, expect, it} from '@jest/globals'

import {
  canonicalizeLoopbackHref,
  hrefWithoutOauthCallback,
  matchOauthRedirectUri,
  readOauthCallbackParams,
  shouldEstablishAppSessionFromOauthInit,
} from './loopback-callback'

const ALLOWED = [
  'http://127.0.0.1:19006/',
  'http://127.0.0.1:19006/auth/web/callback',
] as const

describe('readOauthCallbackParams', () => {
  it('reads fragment (response_mode=fragment) params', () => {
    const params = readOauthCallbackParams(
      'http://127.0.0.1:19006/#iss=https://bsky.social&state=abc&code=def',
    )
    expect(params?.get('state')).toBe('abc')
    expect(params?.get('code')).toBe('def')
    expect(params?.get('iss')).toBe('https://bsky.social')
  })

  it('reads query (response_mode=query) params', () => {
    const params = readOauthCallbackParams(
      'http://127.0.0.1:19006/?iss=https://bsky.social&state=abc&code=def',
    )
    expect(params?.get('state')).toBe('abc')
    expect(params?.get('code')).toBe('def')
  })

  it('prefers fragment when both hash and query look like a callback', () => {
    const params = readOauthCallbackParams(
      'http://127.0.0.1:19006/?state=query&code=q#state=hash&code=h',
    )
    expect(params?.get('code')).toBe('h')
  })

  it('still parses when a hash router inserted a leading slash', () => {
    const params = readOauthCallbackParams(
      'http://127.0.0.1:19006/#/iss=https://bsky.social&state=abc&code=def',
    )
    expect(params?.get('state')).toBe('abc')
    expect(params?.get('code')).toBe('def')
  })

  it('reads error responses the same way as codes', () => {
    const params = readOauthCallbackParams(
      'http://127.0.0.1:19006/#state=abc&error=access_denied',
    )
    expect(params?.get('error')).toBe('access_denied')
  })

  it('consumes fragment responseMode code/state on the same load', () => {
    const href =
      'http://127.0.0.1:19006/#iss=https://bsky.social&state=abc&code=def'
    const params = readOauthCallbackParams(href)
    expect(params?.get('state')).toBe('abc')
    expect(params?.get('code')).toBe('def')
    expect(matchOauthRedirectUri(href, ALLOWED)).toBe('http://127.0.0.1:19006/')
    // After snapshot, the address bar is path-only so a refresh cannot
    // replay the authorization code (library initCallback only strips
    // one mode; we strip both).
    expect(hrefWithoutOauthCallback(href)).toBe('/')
    expect(
      readOauthCallbackParams(
        `http://127.0.0.1:19006${hrefWithoutOauthCallback(href)}`,
      ),
    ).toBeNull()
  })

  it('strips both fragment and query after params are snapshotted', () => {
    expect(
      hrefWithoutOauthCallback(
        'http://127.0.0.1:19006/#iss=https://bsky.social&state=abc&code=def',
      ),
    ).toBe('/')
    expect(
      hrefWithoutOauthCallback(
        'http://127.0.0.1:19006/auth/web/callback?state=abc&code=def#iss=x',
      ),
    ).toBe('/auth/web/callback')
  })

  it('returns null when the URL is not an OAuth callback', () => {
    expect(readOauthCallbackParams('http://127.0.0.1:19006/')).toBeNull()
    expect(
      readOauthCallbackParams(
        'http://127.0.0.1:19006/#iss=https://bsky.social',
      ),
    ).toBeNull()
    expect(
      readOauthCallbackParams('http://127.0.0.1:19006/?q=search'),
    ).toBeNull()
  })
})

describe('canonicalizeLoopbackHref', () => {
  it('rewrites localhost to 127.0.0.1 and keeps hash + query', () => {
    expect(
      canonicalizeLoopbackHref(
        'http://localhost:19006/auth/web/callback?iss=x#state=abc&code=def',
      ),
    ).toBe('http://127.0.0.1:19006/auth/web/callback?iss=x#state=abc&code=def')
  })

  it('returns null when already on a loopback IP', () => {
    expect(
      canonicalizeLoopbackHref('http://127.0.0.1:19006/#state=abc&code=def'),
    ).toBeNull()
    expect(
      canonicalizeLoopbackHref('http://[::1]:19006/#state=abc&code=def'),
    ).toBeNull()
  })
})

describe('matchOauthRedirectUri', () => {
  it('matches the root redirect including a missing trailing slash', () => {
    expect(matchOauthRedirectUri('http://127.0.0.1:19006', ALLOWED)).toBe(
      'http://127.0.0.1:19006/',
    )
    expect(matchOauthRedirectUri('http://127.0.0.1:19006/', ALLOWED)).toBe(
      'http://127.0.0.1:19006/',
    )
  })

  it('matches /auth/web/callback with or without a trailing slash', () => {
    expect(
      matchOauthRedirectUri(
        'http://127.0.0.1:19006/auth/web/callback#code=x&state=y',
        ALLOWED,
      ),
    ).toBe('http://127.0.0.1:19006/auth/web/callback')
    expect(
      matchOauthRedirectUri(
        'http://127.0.0.1:19006/auth/web/callback/',
        ALLOWED,
      ),
    ).toBe('http://127.0.0.1:19006/auth/web/callback')
  })

  it('matches localhost page origin against 127.0.0.1 metadata URIs', () => {
    expect(
      matchOauthRedirectUri('http://localhost:19006/#code=x&state=y', ALLOWED),
    ).toBe('http://127.0.0.1:19006/')
  })

  it('returns undefined when the path is not a registered redirect', () => {
    expect(
      matchOauthRedirectUri('http://127.0.0.1:19006/settings', ALLOWED),
    ).toBeUndefined()
  })
})

describe('shouldEstablishAppSessionFromOauthInit', () => {
  const session = {did: 'did:plc:alice'}

  it('logs in on an authorization-callback result even if an account exists', () => {
    expect(
      shouldEstablishAppSessionFromOauthInit({session, state: 'xyz'}, true),
    ).toBe(true)
    expect(
      shouldEstablishAppSessionFromOauthInit({session, state: ''}, false),
    ).toBe(true)
  })

  it('logs in on a restore when there is no persisted app account', () => {
    expect(shouldEstablishAppSessionFromOauthInit({session}, false)).toBe(true)
  })

  it('does not steal a persisted password session on OAuth restore', () => {
    expect(shouldEstablishAppSessionFromOauthInit({session}, true)).toBe(false)
  })

  it('does nothing when init restored nothing', () => {
    expect(shouldEstablishAppSessionFromOauthInit(undefined, false)).toBe(false)
    expect(shouldEstablishAppSessionFromOauthInit({}, false)).toBe(false)
  })
})
