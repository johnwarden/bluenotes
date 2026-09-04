# AT Protocol OAuth (Blue Notes)

**Launchable web OAuth is on `bluenotes-rebrand` ([PR #7](https://github.com/johnwarden/bluenotes/pull/7)), not on this 1.133 merge.**

This tree (1.133 `PasswordSession` / SessionBundle) keeps client metadata,
env flags, and an OAuth callback hook, but it does **not** complete a session
and it does **not** show the handle-only OAuth login form. `LoginForm.tsx` is
the upstream password + hosting-provider + 2FA form. `login({oauthSession})`
throws. `oauth-agent.ts` is a stub.

Ship web OAuth from PR #7 first (1.109 `SessionStore`). Re-port
`OAuthLoginFormInner` / `signInWithOAuth` only after a SessionBundle adapter
can persist DPoP sessions without JWTs.

Upstream Bluesky `social-app` still uses password sessions. Official OAuth
login is [on the roadmap](https://github.com/bluesky-social/social-app/issues/10403)
but not shipped.

## What users see

### On `bluenotes-rebrand` (PR #7) — launchable

- **Web (default):** handle-only form → redirect to the user's PDS → return to
  Blue Notes with a DPoP-bound OAuth session.
- **Password fallback:** "Use password instead" on the sign-in form, or turn
  off "Sign in with OAuth" under Settings → Privacy and Security.
- **Native:** password login only. Native OAuth needs an Expo auth helper.

### On this 1.133 merge (PR #9) — not launchable

- **Web:** upstream password form only. An OAuth callback still toasts
  "use password".
- **Settings** may still show an OAuth toggle; it does not complete sign-in.
- Re-porting the handle-only form here is deferred: 1.133 LoginForm also has
  hosting autodetection and 2FA, and the session provider cannot accept
  `oauthSession` yet.

## Environment variables

None of these are secrets. Do not invent or commit private keys. AT Protocol
public clients use `token_endpoint_auth_method: none` (no client secret).

| Variable | Required to ship? | Default | Purpose |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_OAUTH` | No | unset (OAuth on) | `1`/`true` force OAuth UI. `0`/`false` force password UI. |
| `EXPO_PUBLIC_OAUTH_CLIENT_ORIGIN` | No | `https://bluenotes.social` | Public origin used to build `client_id` and redirect URIs. |
| `EXPO_PUBLIC_OAUTH_CLIENT_ID` | Staging / alt domains | `{origin}/oauth-client-metadata.json` | Full `client_id` URL. Must be fetchable by PDS auth servers and must return JSON whose `client_id` field is this same URL. |
| `EXPO_PUBLIC_OAUTH_CLIENT_NAME` | No | `Blue Notes` | Name shown on the PDS consent screen. |
| `EXPO_PUBLIC_OAUTH_REDIRECT_URI` | No | `{origin}/` and `{origin}/auth/web/callback` | Extra redirect URI if you need one beyond the defaults. |
| `EXPO_PUBLIC_OAUTH_HANDLE_RESOLVER` | Privacy / self-host | `https://bsky.social` | Handle resolution service. Using Bluesky leaks handle + IP to Bluesky; prefer your own PDS/AppView when possible. |
| `EXPO_PUBLIC_OAUTH_SCOPE` | No | `atproto transition:generic transition:email transition:chat.bsky` | Requested OAuth scopes. |
| `EXPO_PUBLIC_OAUTH_NATIVE_CLIENT_ID` | Native only | `{origin}/oauth-client-metadata.native.json` | Native `client_id` URL. |
| `EXPO_PUBLIC_OAUTH_NATIVE_REDIRECT_URI` | Native only | `bluenotes://oauth/callback` | Native app scheme callback. |

Local web (`http://127.0.0.1:19006`) uses the ATProto **loopback client**
automatically: no hosted metadata, short-lived refresh tokens, and the library
rewrites `localhost` to `127.0.0.1`. Loopback is for development only.

For a tunneled staging host (ngrok, Cloudflare Tunnel, etc.), set
`EXPO_PUBLIC_OAUTH_CLIENT_ID` to the public metadata URL and serve metadata
whose `client_id` and `redirect_uris` match that tunnel.

## Production deploy checklist (Jonathan)

These steps apply to **PR #7 / `bluenotes-rebrand`**, not this 1.133 PR.
They are outside the agent. No paid accounts are required.

1. **Serve client metadata at the `client_id` URL** with
   `Content-Type: application/json`.
   - Webpack / Expo web: `web/oauth-client-metadata.json` is copied to
     `/oauth-client-metadata.json`.
   - `bskyweb`: `GET /oauth-client-metadata.json` is wired in
     `bskyweb/cmd/bskyweb/server.go` from `bskyweb/static/`.
2. Confirm `https://bluenotes.social/oauth-client-metadata.json` is reachable
   from the public internet (PDS authorization servers fetch it server-side).
3. Confirm the JSON `client_id` field equals that exact URL, and
   `redirect_uris` includes the live origin (`https://bluenotes.social/` and
   `/auth/web/callback`).
4. Deploy the web app so `/` and `/auth/web/callback` load the SPA.
5. If Blue Notes is hosted on another origin, copy the metadata files, change
   `client_id` / `client_uri` / `redirect_uris`, and set
   `EXPO_PUBLIC_OAUTH_CLIENT_ORIGIN` (or `EXPO_PUBLIC_OAUTH_CLIENT_ID`) in the
   host's env. No new secrets.
6. Smoke-test: sign in with a real Bluesky handle, confirm the PDS consent
   screen shows **Blue Notes**, return to the app, refresh the tab (session
   restore), then sign out.
7. Keep password login available until OAuth has been live for a release.

## Feature flags

On PR #7 (`bluenotes-rebrand`):

- **Env:** `EXPO_PUBLIC_OAUTH=0` disables the OAuth UI for a deploy.
- **In-app:** Settings → Privacy and Security → "Sign in with OAuth".
- Preference is stored in persisted local state (`oauthSignInEnabled`).

On this 1.133 tree the env flag and settings toggle do not complete sign-in.

## Remaining native / store work

- Add `expo-atproto-auth` (or the current Expo ATProto helper) and implement
  `src/state/session/oauth-client.ts`.
- Register a unique app scheme (do not keep shipping `bluesky://` as Blue
  Notes) and put that scheme in `oauth-client-metadata.native.json`.
- Host the native metadata at the native `client_id` URL.
- Universal links / App Links for the callback if the stores require them.

## Merge notes

OAuth lands on **`bluenotes-rebrand`** (PR #7). `release` is only the
assemble/deploy tip (`reset --hard bluenotes-rebrand` then merge
`community-notes-feature`). Do not merge this 1.133 PR as a way to ship OAuth.

This 1.133 merge kept metadata files and callback wiring, then took upstream
`LoginForm.tsx`. The handle-only UI (`OAuthLoginFormInner` / `signInWithOAuth`)
was **not** carried through and must be re-ported after a SessionBundle
adapter.

- `hailey/oauth` and `hailey/expo-oauth-helper` (2024) are an abandoned native
  module experiment. Do not merge them.
- `hailey/oauth-yeag` (2025-07, app 1.106) is the real source for PR #7.
- Latest `bluesky-social/social-app` `main` (1.133) still has **no** OAuth
  login. Rebasing first does not land OAuth.

Do not land this by rewriting `AGENTS.md` / shipping-install docs
(draft PR #6).
