import {describe, expect, it} from '@jest/globals'

import {
  buildNativeClientMetadata,
  buildWebClientMetadata,
  DEFAULT_OAUTH_CLIENT_ORIGIN,
  isLoopbackOrigin,
  OAUTH_CALLBACK_PATH,
  shouldUseLoopbackClient,
} from './config'

describe('oauth config', () => {
  it('builds production web metadata for bluenotes.social', () => {
    const metadata = buildWebClientMetadata()
    expect(metadata.client_id).toBe(
      `${DEFAULT_OAUTH_CLIENT_ORIGIN}/oauth-client-metadata.json`,
    )
    expect(metadata.client_name).toBe('Blue Notes')
    expect(metadata.application_type).toBe('web')
    expect(metadata.dpop_bound_access_tokens).toBe(true)
    expect(metadata.token_endpoint_auth_method).toBe('none')
    expect(metadata.redirect_uris).toContain(`${DEFAULT_OAUTH_CLIENT_ORIGIN}/`)
    expect(metadata.redirect_uris).toContain(
      `${DEFAULT_OAUTH_CLIENT_ORIGIN}${OAUTH_CALLBACK_PATH}`,
    )
    expect(metadata.scope).toContain('atproto')
  })

  it('builds native metadata with a custom scheme redirect', () => {
    const metadata = buildNativeClientMetadata()
    expect(metadata.application_type).toBe('native')
    expect(metadata.client_id).toBe(
      `${DEFAULT_OAUTH_CLIENT_ORIGIN}/oauth-client-metadata.native.json`,
    )
    expect(metadata.redirect_uris[0]).toMatch(/^bluenotes:\/\//)
  })

  it('detects loopback origins used for local web development', () => {
    expect(isLoopbackOrigin('http://127.0.0.1:19006')).toBe(true)
    expect(isLoopbackOrigin('http://localhost:19006')).toBe(true)
    expect(isLoopbackOrigin('http://[::1]:19006')).toBe(true)
    expect(isLoopbackOrigin('https://bluenotes.social')).toBe(false)
  })

  it('uses the loopback client only on loopback origins without a hosted client id', () => {
    expect(shouldUseLoopbackClient('http://127.0.0.1:19006')).toBe(true)
    expect(shouldUseLoopbackClient('https://bluenotes.social')).toBe(false)
    expect(shouldUseLoopbackClient(undefined)).toBe(false)
  })
})
