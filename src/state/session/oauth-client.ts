/**
 * Native OAuth is not launched yet. Password login remains the native path.
 * See docs/oauth.md for the remaining Expo / client-metadata work.
 */

export type OauthInitResult = {
  session: never
  state?: string
}

export function getOAuthClient(): never {
  throw new Error('AT Protocol OAuth is not available in this native build')
}

export async function initOAuthClient(): Promise<OauthInitResult | undefined> {
  return undefined
}

export async function signInWithOAuth(_identifier: string): Promise<void> {
  throw new Error('AT Protocol OAuth is not available in this native build')
}

export async function restoreOAuthSession(_did: string): Promise<never> {
  throw new Error('AT Protocol OAuth is not available in this native build')
}

export function clearOauthCallbackUrl() {}
