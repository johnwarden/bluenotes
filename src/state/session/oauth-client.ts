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

export function hasPendingOauthCallback(): boolean {
  return false
}

export async function signInWithOAuth(_identifier: string): Promise<void> {
  throw new Error('AT Protocol OAuth is not available in this native build')
}

export async function restoreOAuthSession(_did: string): Promise<never> {
  throw new Error('AT Protocol OAuth is not available in this native build')
}

export async function revokeOAuthSession(_did: string): Promise<void> {
  // Native OAuth is not launched; nothing to revoke at the AS.
}

export function isLocalOAuthRevokeInProgress(_did: string): boolean {
  return false
}

export function subscribeOAuthSessionDeleted(
  _listener: (detail: {sub: string; cause: unknown}) => void,
): () => void {
  return () => {}
}

export function clearOauthCallbackUrl() {}
