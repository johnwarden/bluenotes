import {describe, expect, it, jest} from '@jest/globals'

import {
  classifyOauthExchangeError,
  createResettableSingleton,
  describeOauthCallbackParams,
  describeOauthInitResult,
  exchangeOrRestoreOauthSession,
  formatOauthCallbackDocumentBreadcrumb,
  shouldPaintAppAfterOauthLaunch,
  shouldPropagateOauthInitError,
  wrapBootstrapOauthInit,
} from './oauth-init-policy'

describe('describeOauthCallbackParams', () => {
  it('reports code/state presence without exposing values', () => {
    const params = new URLSearchParams({
      code: 'SECRET_CODE',
      state: 'SECRET_STATE',
      iss: 'https://bsky.social',
    })
    const described = describeOauthCallbackParams(params)
    expect(described).toEqual({
      present: true,
      hasCode: true,
      hasState: true,
      hasError: false,
    })
    expect(JSON.stringify(described)).not.toContain('SECRET')
  })

  it('includes the OAuth error token when the AS denied consent', () => {
    expect(
      describeOauthCallbackParams(
        new URLSearchParams({state: 's', error: 'access_denied'}),
      ),
    ).toEqual({
      present: true,
      hasCode: false,
      hasState: true,
      hasError: true,
      error: 'access_denied',
    })
  })
})

describe('formatOauthCallbackDocumentBreadcrumb', () => {
  it('is a single console line with shape only (no code/state values)', () => {
    const line = formatOauthCallbackDocumentBreadcrumb({
      present: true,
      hasCode: true,
      hasState: true,
      hasError: false,
      origin: 'http://127.0.0.1:19006',
      pathname: '/',
      hashPresent: true,
      searchPresent: false,
      willRewriteLocalhost: false,
    })
    expect(line.startsWith('oauth: callback document ')).toBe(true)
    expect(line).toContain('"hasCode":true')
    expect(line).toContain('"hasState":true')
    expect(line).not.toContain('code=')
  })
})

describe('classifyOauthExchangeError', () => {
  it('tags CORS / DPoP / redirect_uri / token failures', () => {
    expect(
      classifyOauthExchangeError(new TypeError('Failed to fetch')),
    ).toEqual({
      kind: 'cors',
      name: 'TypeError',
      message: 'Failed to fetch',
    })
    expect(
      classifyOauthExchangeError(new Error('invalid_dpop_proof')),
    ).toMatchObject({kind: 'dpop'})
    expect(
      classifyOauthExchangeError(
        new Error(
          'OAuth callback could not be completed: redirect URI mismatch',
        ),
      ),
    ).toMatchObject({kind: 'redirect_uri'})
    expect(
      classifyOauthExchangeError(new Error('invalid_grant')),
    ).toMatchObject({kind: 'token'})
  })
})

describe('describeOauthInitResult', () => {
  it('distinguishes callback-shaped results from restores', () => {
    expect(
      describeOauthInitResult({session: {did: 'did:plc:x'}, state: 'xyz'}),
    ).toEqual({hasSession: true, hasStateProperty: true})
    expect(describeOauthInitResult({session: {did: 'did:plc:x'}})).toEqual({
      hasSession: true,
      hasStateProperty: false,
    })
    expect(describeOauthInitResult(undefined)).toEqual({
      hasSession: false,
      hasStateProperty: false,
    })
  })
})

describe('shouldPropagateOauthInitError', () => {
  it('propagates when an authorization response is present', () => {
    expect(shouldPropagateOauthInitError(true)).toBe(true)
  })

  it('allows restore-only failures to be non-fatal', () => {
    expect(shouldPropagateOauthInitError(false)).toBe(false)
  })
})

describe('wrapBootstrapOauthInit', () => {
  it('does not swallow when callback params are present ( #18 regression )', async () => {
    const onSwallowed = jest.fn()
    await expect(
      wrapBootstrapOauthInit(
        Promise.reject(new Error('exchange failed')),
        true,
        onSwallowed,
      ),
    ).rejects.toThrow('exchange failed')
    expect(onSwallowed).not.toHaveBeenCalled()
  })

  it('rejects the #18 pattern of catch(() => undefined) on a callback load', async () => {
    const swallowed = await Promise.reject(new Error('init failed')).catch(
      () => undefined,
    )
    expect(swallowed).toBeUndefined()

    await expect(
      wrapBootstrapOauthInit(Promise.reject(new Error('init failed')), true),
    ).rejects.toThrow('init failed')
  })

  it('may swallow restore-only failures so the app can still boot', async () => {
    const onSwallowed = jest.fn()
    await expect(
      wrapBootstrapOauthInit(
        Promise.reject(new Error('no session')),
        false,
        onSwallowed,
      ),
    ).resolves.toBeUndefined()
    expect(onSwallowed).toHaveBeenCalled()
  })
})

describe('shouldPaintAppAfterOauthLaunch', () => {
  it('holds signed-out chrome while a callback retry is still pending', () => {
    expect(
      shouldPaintAppAfterOauthLaunch({
        establishedAppSession: false,
        hasCallbackParams: true,
        retriesExhausted: false,
      }),
    ).toBe(false)
  })

  it('paints after a successful OauthBskyAppAgent login', () => {
    expect(
      shouldPaintAppAfterOauthLaunch({
        establishedAppSession: true,
        hasCallbackParams: true,
        retriesExhausted: false,
      }),
    ).toBe(true)
  })

  it('paints after retries are exhausted so the splash is not forever blank', () => {
    expect(
      shouldPaintAppAfterOauthLaunch({
        establishedAppSession: false,
        hasCallbackParams: true,
        retriesExhausted: true,
      }),
    ).toBe(true)
  })
})

describe('createResettableSingleton', () => {
  it('shares one in-flight promise across double initOAuthClient() callers', async () => {
    let starts = 0
    const singleton = createResettableSingleton(async () => {
      starts += 1
      return {session: {did: 'did:plc:alice'}, state: 'xyz'}
    })
    const [a, b] = await Promise.all([singleton.run(), singleton.run()])
    expect(a).toEqual(b)
    expect(starts).toBe(1)
  })

  it('resets after rejection so InnerApp can retry a swallowed bootstrap error', async () => {
    let starts = 0
    const singleton = createResettableSingleton(async () => {
      starts += 1
      if (starts === 1) {
        throw new Error('first fail')
      }
      return 'recovered'
    })
    await expect(singleton.run()).rejects.toThrow('first fail')
    await expect(singleton.run()).resolves.toBe('recovered')
    expect(starts).toBe(2)
  })

  it('regression: a locked rejected promise would leave InnerApp anonymous', async () => {
    let locked: Promise<string> | undefined = Promise.reject(
      new Error('bootstrap swallowed'),
    )
    locked.catch(() => undefined)

    await expect(locked).rejects.toThrow('bootstrap swallowed')
    await expect(locked).rejects.toThrow('bootstrap swallowed')

    const singleton = createResettableSingleton(async () => 'retried')
    await expect(singleton.run()).resolves.toBe('retried')
  })
})

describe('exchangeOrRestoreOauthSession', () => {
  const session = {did: 'did:plc:alice'}
  const params = new URLSearchParams({state: 's', code: 'c'})

  it('calls initCallback and never library init() when params were snapshotted', async () => {
    const libraryInit = jest.fn(async () => {
      throw new Error('init() must not run on a callback load')
    })
    const libraryInitCallback = jest.fn(async () => ({
      session,
      state: 's',
    }))

    const result = await exchangeOrRestoreOauthSession({
      callbackParams: params,
      libraryInit,
      libraryInitCallback,
      resolveRedirectUri: () => 'http://127.0.0.1:19006/',
    })

    expect(result).toEqual({session, state: 's'})
    expect(libraryInit).not.toHaveBeenCalled()
    expect(libraryInitCallback).toHaveBeenCalledWith(
      params,
      'http://127.0.0.1:19006/',
    )
  })

  it('still exchanges when library init() would throw (the #18 hole)', async () => {
    const result = await exchangeOrRestoreOauthSession({
      callbackParams: params,
      libraryInit: async () => {
        throw new Error('initRestore leftover sub')
      },
      libraryInitCallback: async () => ({session, state: 's'}),
      resolveRedirectUri: () => 'http://127.0.0.1:19006/',
    })
    expect(result?.session).toEqual(session)
    expect(result && 'state' in result).toBe(true)
  })

  it('propagates initCallback errors (bootstrap must not swallow them)', async () => {
    await expect(
      exchangeOrRestoreOauthSession({
        callbackParams: params,
        libraryInit: async () => undefined,
        libraryInitCallback: async () => {
          throw new Error('token exchange failed')
        },
        resolveRedirectUri: () => 'http://127.0.0.1:19006/',
      }),
    ).rejects.toThrow('token exchange failed')
  })

  it('throws on redirect_uri mismatch instead of falling through to restore', async () => {
    await expect(
      exchangeOrRestoreOauthSession({
        callbackParams: params,
        libraryInit: async () => ({session}),
        libraryInitCallback: async () => ({session, state: 's'}),
        resolveRedirectUri: () => undefined,
      }),
    ).rejects.toThrow('redirect URI mismatch')
  })

  it('strips the address bar before exchanging so a refresh cannot replay the code', async () => {
    const strip = jest.fn()
    await exchangeOrRestoreOauthSession({
      callbackParams: params,
      libraryInit: async () => undefined,
      libraryInitCallback: async () => ({session, state: 's'}),
      resolveRedirectUri: () => 'http://127.0.0.1:19006/',
      stripCallbackFromAddressBar: strip,
    })
    expect(strip).toHaveBeenCalledTimes(1)
  })

  it('restores via library init() when this load is not a callback', async () => {
    const libraryInitCallback = jest.fn(
      async () => ({session, state: null}) as const,
    )
    const result = await exchangeOrRestoreOauthSession({
      callbackParams: null,
      libraryInit: async () => ({session}),
      libraryInitCallback,
      resolveRedirectUri: () => 'http://127.0.0.1:19006/',
    })
    expect(result).toEqual({session})
    expect(libraryInitCallback).not.toHaveBeenCalled()
  })
})
