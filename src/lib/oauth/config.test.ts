import {describe, expect, it} from '@jest/globals'

import {
  buildLoopbackClientId,
  buildLoopbackClientMetadata,
  buildNativeClientMetadata,
  buildWebClientMetadata,
  DEFAULT_OAUTH_CLIENT_ORIGIN,
  DEFAULT_OAUTH_SCOPE,
  getLoopbackRedirectUris,
  getOauthScope,
  getWebOauthResponseMode,
  isLoopbackOrigin,
  OAUTH_CALLBACK_PATH,
  resolveWebClientMetadata,
  shouldUseLoopbackClient,
  toLoopbackRedirectOrigin,
} from './config'

const FULL_SCOPE_PARTS = [
  'atproto',
  'transition:generic',
  'transition:email',
  'transition:chat.bsky',
] as const

function expectFullAppScope(scope: string) {
  for (const part of FULL_SCOPE_PARTS) {
    expect(scope).toContain(part)
  }
}

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
    expectFullAppScope(metadata.scope)
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

  it('requests the full app scope, not identity-only atproto', () => {
    expect(getOauthScope()).toBe(DEFAULT_OAUTH_SCOPE)
    expectFullAppScope(DEFAULT_OAUTH_SCOPE)
  })

  it('rewrites localhost to 127.0.0.1 for loopback redirect origins', () => {
    expect(toLoopbackRedirectOrigin('http://localhost:19006')).toBe(
      'http://127.0.0.1:19006',
    )
    expect(toLoopbackRedirectOrigin('http://127.0.0.1:19006')).toBe(
      'http://127.0.0.1:19006',
    )
  })

  it('builds loopback redirect URIs for the current origin and port', () => {
    const uris = getLoopbackRedirectUris('http://localhost:19006')
    expect(uris).toContain('http://127.0.0.1:19006/')
    expect(uris).toContain(`http://127.0.0.1:19006${OAUTH_CALLBACK_PATH}`)
    expect(uris.every(uri => !uri.includes('localhost'))).toBe(true)
  })

  it('puts the full DEFAULT_OAUTH_SCOPE in the loopback client_id query string', () => {
    const clientId = buildLoopbackClientId('http://127.0.0.1:19006')
    expect(clientId).toContain(
      `scope=${encodeURIComponent(DEFAULT_OAUTH_SCOPE)}`,
    )
    expect(clientId).toContain('transition%3Ageneric')
    expect(clientId).toContain('transition%3Achat.bsky')
    expect(clientId).not.toMatch(/[?&]scope=atproto(?:&|$)/)
  })

  it('encodes full DEFAULT_OAUTH_SCOPE in loopback client metadata and client_id', () => {
    const metadata = buildLoopbackClientMetadata('http://127.0.0.1:19006')
    expectFullAppScope(metadata.scope)
    expect(metadata.scope).toBe(DEFAULT_OAUTH_SCOPE)
    expect(metadata.application_type).toBe('native')
    expect(metadata.token_endpoint_auth_method).toBe('none')
    expect(metadata.dpop_bound_access_tokens).toBe(true)
    expect(metadata.redirect_uris).toContain('http://127.0.0.1:19006/')
    expect(metadata.redirect_uris).toContain(
      `http://127.0.0.1:19006${OAUTH_CALLBACK_PATH}`,
    )

    const clientId = new URL(metadata.client_id)
    expect(clientId.origin).toBe('http://localhost')
    expectFullAppScope(clientId.searchParams.get('scope') ?? '')
    expect(clientId.searchParams.getAll('redirect_uri')).toEqual(
      expect.arrayContaining([
        'http://127.0.0.1:19006/',
        `http://127.0.0.1:19006${OAUTH_CALLBACK_PATH}`,
      ]),
    )
  })

  it('uses fragment response_mode so init consumes #code= on that load', () => {
    expect(getWebOauthResponseMode('http://127.0.0.1:19006')).toBe('fragment')
    expect(getWebOauthResponseMode('http://localhost:19006')).toBe('fragment')
    expect(getWebOauthResponseMode('https://bluenotes.social')).toBe('fragment')
    expect(getWebOauthResponseMode(undefined)).toBe('fragment')
  })

  it('encodes redirect_uri hosts as 127.0.0.1, never localhost', () => {
    const clientId = new URL(buildLoopbackClientId('http://localhost:19006'))
    expect(clientId.origin).toBe('http://localhost')
    for (const uri of clientId.searchParams.getAll('redirect_uri')) {
      expect(uri).toMatch(/^http:\/\/127\.0\.0\.1:19006\//)
      expect(uri).not.toContain('localhost')
    }
  })

  it('resolveWebClientMetadata uses loopback metadata on local origins', () => {
    const loopback = resolveWebClientMetadata('http://127.0.0.1:19006')
    expectFullAppScope(loopback.scope)
    expect(loopback.client_id.startsWith('http://localhost')).toBe(true)
    expect(loopback.scope).toContain('transition:generic')
    expect(loopback.scope).toContain('transition:chat.bsky')

    const hosted = resolveWebClientMetadata('https://bluenotes.social')
    expect(hosted.client_id).toBe(
      `${DEFAULT_OAUTH_CLIENT_ORIGIN}/oauth-client-metadata.json`,
    )
    expectFullAppScope(hosted.scope)
  })
})
