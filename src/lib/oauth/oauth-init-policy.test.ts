import {describe, expect, it, jest} from '@jest/globals'

import {
  classifyOauthExchangeError,
  createResettableSingleton,
  decideOauthLoginEstablishedAfterPeek,
  describeOauthCallbackParams,
  describeOauthFailureDiagnosis,
  describeOauthInitResult,
  exchangeOrRestoreOauthSession,
  formatOauthCallbackDocumentBreadcrumb,
  inferOauthExchangeNeverRanReason,
  leftoverGrantBlocksSoftGatePass,
  leftoverOauthGrantKeysFromHref,
  OAUTH_BREADCRUMB,
  oauthConsoleBreadcrumb,
  oauthErrorHttpStatus,
  shouldDiscardSessionLogin,
  shouldPaintAppAfterOauthLaunch,
  shouldPropagateOauthInitError,
  shouldStripOauthCallbackAfterDiagnosis,
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

describe('shouldDiscardSessionLogin', () => {
  it('never discards a completed OAuth login when a later task aborted it', () => {
    expect(
      shouldDiscardSessionLogin({aborted: true, isOauthSession: true}),
    ).toBe(false)
    expect(
      shouldDiscardSessionLogin({aborted: false, isOauthSession: true}),
    ).toBe(false)
  })

  it('still discards an aborted password login', () => {
    expect(
      shouldDiscardSessionLogin({aborted: true, isOauthSession: false}),
    ).toBe(true)
    expect(
      shouldDiscardSessionLogin({aborted: false, isOauthSession: false}),
    ).toBe(false)
  })
})

describe('OAUTH_BREADCRUMB', () => {
  it('uses the exact loopback smoke-gate strings', () => {
    expect(OAUTH_BREADCRUMB.initStarting).toBe('oauth: init starting')
    expect(OAUTH_BREADCRUMB.initFinished).toBe('oauth: init finished')
    expect(OAUTH_BREADCRUMB.loginStarting).toBe(
      'oauth: login() starting OauthBskyAppAgent',
    )
    expect(OAUTH_BREADCRUMB.loginEstablished).toBe(
      'oauth: login() established OauthBskyAppAgent',
    )
    expect(OAUTH_BREADCRUMB.failureDiagnosis).toBe('oauth: failure diagnosis')
    expect(OAUTH_BREADCRUMB.leftoverGrant).toBe('oauth: leftover grant')
    expect(OAUTH_BREADCRUMB.loginFailed).toBe(
      'oauth: login() failed to establish OauthBskyAppAgent',
    )
  })

  it('writes breadcrumbs through globalThis.console.warn (survives remove-console)', () => {
    const warn = jest
      .spyOn(globalThis.console, 'warn')
      .mockImplementation(() => {})
    oauthConsoleBreadcrumb(OAUTH_BREADCRUMB.initStarting, {hasCode: true})
    expect(warn).toHaveBeenCalledWith(OAUTH_BREADCRUMB.initStarting, {
      hasCode: true,
    })
    warn.mockRestore()
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
    expect(
      classifyOauthExchangeError(
        new Error('Unknown authorization session "abc"'),
      ),
    ).toMatchObject({kind: 'pkce_state'})
  })
})

describe('leftoverOauthGrantKeysFromHref', () => {
  it('reports leftover #code= / #state= without exposing values', () => {
    const href =
      'http://127.0.0.1:19006/#state=SECRET_STATE&iss=https://bsky.social&code=SECRET_CODE'
    expect(leftoverOauthGrantKeysFromHref(href)).toEqual(['code', 'state'])
  })

  it('reads hash-router #/state= forms and query leftovers', () => {
    expect(
      leftoverOauthGrantKeysFromHref(
        'http://127.0.0.1:19006/#/state=SECRET_STATE&code=SECRET_CODE',
      ),
    ).toEqual(['code', 'state'])
    expect(
      leftoverOauthGrantKeysFromHref(
        'http://127.0.0.1:19006/?code=SECRET_CODE&state=SECRET_STATE',
      ),
    ).toEqual(['code', 'state'])
  })

  it('is empty after a successful strip', () => {
    expect(leftoverOauthGrantKeysFromHref('http://127.0.0.1:19006/')).toEqual(
      [],
    )
  })
})

describe('oauthErrorHttpStatus', () => {
  it('reads OAuthResponseError.status and response.status', () => {
    expect(
      oauthErrorHttpStatus({
        status: 400,
        response: {status: 400},
      }),
    ).toBe(400)
    expect(
      oauthErrorHttpStatus({
        cause: {response: {status: 401}},
      }),
    ).toBe(401)
    expect(oauthErrorHttpStatus(new TypeError('Failed to fetch'))).toBeNull()
  })
})

describe('describeOauthFailureDiagnosis', () => {
  const callbackHref =
    'http://127.0.0.1:19006/#state=SECRET_STATE&code=SECRET_CODE'

  it('captures leftover grant, classify kind, token HTTP class, snapshot flags', () => {
    const diagnosis = describeOauthFailureDiagnosis({
      href: callbackHref,
      error: Object.assign(new Error('invalid_grant'), {
        status: 400,
        response: {status: 400},
      }),
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
      exchangeAttempt: 'ran_and_failed',
    })
    expect(diagnosis).toEqual({
      leftoverGrantInUrl: true,
      leftoverGrantKeys: ['code', 'state'],
      exchangeAttempt: 'ran_and_failed',
      exchangeErrorKind: 'token',
      tokenEndpointHttpStatus: 400,
      tokenEndpointFailureClass: 'http',
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
    })
    expect(JSON.stringify(diagnosis)).not.toContain('SECRET')
  })

  it('classifies CORS / failed fetch as a network token-endpoint failure', () => {
    const diagnosis = describeOauthFailureDiagnosis({
      href: callbackHref,
      error: new TypeError('Failed to fetch'),
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
      exchangeAttempt: 'ran_and_failed',
    })
    expect(diagnosis.exchangeErrorKind).toBe('cors')
    expect(diagnosis.tokenEndpointHttpStatus).toBeNull()
    expect(diagnosis.tokenEndpointFailureClass).toBe('network')
    expect(diagnosis.leftoverGrantInUrl).toBe(true)
  })

  it('marks anonymous-after-callback with no exchange error and no leftover', () => {
    const diagnosis = describeOauthFailureDiagnosis({
      href: 'http://127.0.0.1:19006/',
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
      exchangeAttempt: 'never_ran',
      exchangeNeverRanReason: 'no_callback_params',
    })
    expect(diagnosis).toEqual({
      leftoverGrantInUrl: false,
      leftoverGrantKeys: [],
      exchangeAttempt: 'never_ran',
      exchangeNeverRanReason: 'no_callback_params',
      exchangeErrorKind: 'none',
      tokenEndpointHttpStatus: null,
      tokenEndpointFailureClass: 'none',
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
    })
  })

  it('distinguishes leftover #state= when exchange never ran vs ran-and-failed', () => {
    const leftoverStateOnly =
      'http://127.0.0.1:19006/#state=SECRET_STATE&iss=https://bsky.social'
    const neverRan = describeOauthFailureDiagnosis({
      href: leftoverStateOnly,
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: false,
      exchangeAttempt: 'never_ran',
      exchangeNeverRanReason: 'no_callback_params',
    })
    expect(neverRan.exchangeAttempt).toBe('never_ran')
    expect(neverRan.exchangeNeverRanReason).toBe('state_without_code')
    expect(neverRan.leftoverGrantKeys).toEqual(['state'])
    expect(neverRan.exchangeErrorKind).toBe('none')
    expect(neverRan.tokenEndpointFailureClass).toBe('none')
    expect(JSON.stringify(neverRan)).not.toContain('SECRET')

    const ranFailed = describeOauthFailureDiagnosis({
      href: leftoverStateOnly,
      error: Object.assign(new Error('invalid_grant'), {status: 400}),
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
      exchangeAttempt: 'ran_and_failed',
    })
    expect(ranFailed.exchangeAttempt).toBe('ran_and_failed')
    expect(ranFailed.exchangeNeverRanReason).toBeUndefined()
    expect(ranFailed.exchangeErrorKind).toBe('token')
    expect(ranFailed.tokenEndpointHttpStatus).toBe(400)
    expect(ranFailed.tokenEndpointFailureClass).toBe('http')
  })

  it('does not treat redirect_uri mismatch as a token-endpoint run', () => {
    const diagnosis = describeOauthFailureDiagnosis({
      href: callbackHref,
      error: new Error(
        'OAuth callback could not be completed: redirect URI mismatch',
      ),
      snapshotRanBeforeStrip: true,
      snapshotHadCallbackParams: true,
      exchangeAttempt: 'never_ran',
      exchangeNeverRanReason: 'redirect_uri_mismatch',
    })
    expect(diagnosis.exchangeAttempt).toBe('never_ran')
    expect(diagnosis.exchangeNeverRanReason).toBe('redirect_uri_mismatch')
    expect(diagnosis.exchangeErrorKind).toBe('redirect_uri')
    expect(diagnosis.tokenEndpointFailureClass).toBe('none')
    expect(diagnosis.leftoverGrantInUrl).toBe(true)
  })
})

describe('leftoverGrantBlocksSoftGatePass', () => {
  it('blocks PASS whenever leftover #state= or #code= remain', () => {
    expect(leftoverGrantBlocksSoftGatePass(['state'])).toBe(true)
    expect(leftoverGrantBlocksSoftGatePass(['code', 'state'])).toBe(true)
    expect(leftoverGrantBlocksSoftGatePass([])).toBe(false)
  })
})

describe('decideOauthLoginEstablishedAfterPeek', () => {
  it('peeks leftover #state= before any clear (fd83c6624 regression)', () => {
    const beforeClear = leftoverOauthGrantKeysFromHref(
      'http://127.0.0.1:19006/#state=SECRET_STATE&iss=https://bsky.social',
    )
    expect(beforeClear).toEqual(['state'])
    expect(decideOauthLoginEstablishedAfterPeek(beforeClear)).toEqual({
      leftoverGrantKeys: ['state'],
      emitLoginEstablished: false,
      clearCallbackUrl: false,
      emitLeftoverGrant: true,
    })

    // The fd83c6624 bug: clear first, then peek — leftover looks gone
    // and loginEstablished would fire. The gate must use beforeClear.
    const afterClear = leftoverOauthGrantKeysFromHref('http://127.0.0.1:19006/')
    expect(afterClear).toEqual([])
    expect(
      decideOauthLoginEstablishedAfterPeek(afterClear).emitLoginEstablished,
    ).toBe(true)
    expect(
      decideOauthLoginEstablishedAfterPeek(beforeClear).emitLoginEstablished,
    ).toBe(false)
    expect(JSON.stringify(beforeClear)).not.toContain('SECRET')
  })

  it('clears and emits loginEstablished only when no leftover grant remains', () => {
    expect(decideOauthLoginEstablishedAfterPeek([])).toEqual({
      leftoverGrantKeys: [],
      emitLoginEstablished: true,
      clearCallbackUrl: true,
      emitLeftoverGrant: false,
    })
  })
})

describe('shouldStripOauthCallbackAfterDiagnosis', () => {
  it('strips leftover grant on hosted after diagnosis; loopback leaves it', () => {
    expect(shouldStripOauthCallbackAfterDiagnosis(false)).toBe(true)
    expect(shouldStripOauthCallbackAfterDiagnosis(true)).toBe(false)
  })
})

describe('inferOauthExchangeNeverRanReason', () => {
  it('tags leftover #state= without #code= as state_without_code', () => {
    expect(
      inferOauthExchangeNeverRanReason({
        leftoverGrantKeys: ['state'],
        hadCallbackParams: false,
      }),
    ).toBe('state_without_code')
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

  it('does not strip the address bar until the exchange succeeds', async () => {
    const strip = jest.fn()
    const order: string[] = []
    await exchangeOrRestoreOauthSession({
      callbackParams: params,
      libraryInit: async () => undefined,
      libraryInitCallback: async () => {
        order.push('exchange')
        return {session, state: 's'}
      },
      resolveRedirectUri: () => 'http://127.0.0.1:19006/',
      stripCallbackFromAddressBar: () => {
        order.push('strip')
        strip()
      },
    })
    expect(order).toEqual(['exchange', 'strip'])
    expect(strip).toHaveBeenCalledTimes(1)
  })

  it('leaves #code= in the address bar when the token request fails', async () => {
    const strip = jest.fn()
    await expect(
      exchangeOrRestoreOauthSession({
        callbackParams: params,
        libraryInit: async () => undefined,
        libraryInitCallback: async () => {
          throw new Error('token exchange failed')
        },
        resolveRedirectUri: () => 'http://127.0.0.1:19006/',
        stripCallbackFromAddressBar: strip,
      }),
    ).rejects.toThrow('token exchange failed')
    expect(strip).not.toHaveBeenCalled()
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

  it('records never_ran vs ran_and_failed for leftover-grant diagnosis', async () => {
    const onExchangeAttempt = jest.fn()
    await expect(
      exchangeOrRestoreOauthSession({
        callbackParams: params,
        libraryInit: async () => undefined,
        libraryInitCallback: async () => ({session, state: 's'}),
        resolveRedirectUri: () => undefined,
        onExchangeAttempt,
      }),
    ).rejects.toThrow('redirect URI mismatch')
    expect(onExchangeAttempt).toHaveBeenCalledWith({
      outcome: 'never_ran',
      neverRanReason: 'redirect_uri_mismatch',
    })

    onExchangeAttempt.mockClear()
    await expect(
      exchangeOrRestoreOauthSession({
        callbackParams: params,
        libraryInit: async () => undefined,
        libraryInitCallback: async () => {
          throw new Error('token exchange failed')
        },
        resolveRedirectUri: () => 'http://127.0.0.1:19006/',
        onExchangeAttempt,
      }),
    ).rejects.toThrow('token exchange failed')
    expect(onExchangeAttempt).toHaveBeenCalledWith({
      outcome: 'ran_and_failed',
    })
  })
})
