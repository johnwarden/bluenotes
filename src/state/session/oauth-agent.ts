/**
 * 1.132 SessionBundle OAuth adapter — not implemented.
 *
 * The 1.109 OauthBskyAppAgent (`@atproto/api` Agent wrapping OAuthSession)
 * does not compile against PasswordSession + lex Clients. A follow-up must:
 *
 * 1. Build appview/PDS/chat Clients from `OAuthSession.fetchHandler` via
 *    `createLexClient` (see `src/state/session/clients.ts`).
 * 2. Persist `isOauthSession` accounts without `refreshJwt` / `accessJwt`.
 * 3. Skip expiry-rescue and cross-tab JWT generation checks for those
 *    accounts (`resumeSession` currently requires `refreshJwt`).
 *
 * Launchable OAuth remains on the 1.109 Community Notes line
 * (PR #7 / `cursor/oauth-merge-6a46`). See `docs/oauth.md`.
 */

export {}
