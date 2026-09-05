# AT Protocol OAuth (Blue Notes)

Blue Notes signs in with **AT Protocol OAuth** by default on web. Password /
app-password login remains available as a fallback (required for the local
`alice.test` PDS and until production client metadata is live).

Upstream Bluesky `social-app` still uses password sessions. Official OAuth
login is [on the roadmap](https://github.com/bluesky-social/social-app/issues/10403)
but not shipped. This fork ports the experimental `hailey/oauth-yeag` work onto
the current session store and points the client at Blue Notes, not
`bsky.hailey.at`.

## What users see

- **Web (default):** handle-only form → redirect to the user's PDS → return to
  Blue Notes with a DPoP-bound OAuth session.
- **Password fallback:** "Use password instead" on the sign-in form, or turn
  off "Sign in with OAuth" under Settings → Privacy and Security.
- **Native:** password login only in this revision. Native OAuth needs an Expo
  auth helper, app scheme, and hosted native client metadata (see below).

## Local testing with atproto-community-notes

Use this path to smoke-test the app against a local ATProto / Community Notes
network. Local `.test` PDS accounts need **password** login. The OAuth
handle-only flow is for real Bluesky handles (and production client metadata).

There is no `just dev` recipe in this repo. Start the web app with `yarn web`
or `just web`.

### 1. Start the test network

From a **separate checkout** of
[`johnwarden/atproto-community-notes`](https://github.com/johnwarden/atproto-community-notes):

```
devbox run -- just start
```

(or `just start` inside the devbox shell)

Wait until introspection is ready:

```
curl -s http://localhost:2581 | jq '.mockSetup.complete'
```

That should print `true`.

- **PDS:** `http://localhost:2583`
- **Test users:** `alice.test` / `hunter2` (also `bob.test`, `carla.test`)

### 2. Start Blue Notes web

From this Blue Notes branch (`bluenotes-rebrand` / this PR tip):

```
yarn web
```

or `just web`. Expo web listens on `http://127.0.0.1:19006` and uses the
ATProto **loopback** OAuth client automatically. That client_id encodes
the same full scope string as production (`getOauthScope()` /
`atproto transition:generic transition:email transition:chat.bsky`).
The library default is identity-only `atproto`, which is not enough for
home, Community Notes feeds, or chat.

If `yarn web` / webpack-dev-server on `:19006` hangs (common on low-RAM
shared boxes), build a static bundle and serve it instead:

```
EXPO_PUBLIC_OAUTH=0 yarn build-web
npx serve -l 19006 -s web-build
```

Then use the same password path: **Custom** hosting →
`http://localhost:2583` → `alice.test` / `hunter2`.

Confirmed 2026-09-04 on a shared box: this workaround reached the
Following feed with local mock posts.

### 3. Sign in against the local PDS

In the app sign-in UI:

1. Open **Hosting provider** (pencil) → **Custom** → enter
   `http://localhost:2583` (or `http://127.0.0.1:2583`).
2. Use **password** login (`Use password instead` if the handle-only OAuth
   form is showing) with `alice.test` / `hunter2`.

### 4. Optional: force the password form

```
EXPO_PUBLIC_OAUTH=0 yarn web
```

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
automatically: no hosted metadata document, short-lived refresh tokens, and
`localhost` is rewritten to `127.0.0.1` for redirect URIs. The loopback
`client_id` query string **must** include the full `DEFAULT_OAUTH_SCOPE`
(not just `atproto`). Authorization servers synthesize loopback metadata
from those query params; if `scope` is omitted they grant identity only,
and AppView / chat RPCs fail with `Missing required scope` (for example
`rpc:app.bsky.feed.getFeedGenerator` or `rpc:chat.bsky.convo.listConvos`).

Loopback and hosted web both request `response_mode=fragment` so
`BrowserOAuthClient.init()` consumes `#code=` / `#state=` on that load.
The app also reads query params if an AS returns `?code=`, canonicalizes
`localhost` → `127.0.0.1` *without* dropping those params, and calls
`login()` before signed-out chrome can paint.

If this document loaded with callback params, **do not** call library
`init()` first: it can throw (`initRestore` leftover sub, or
`initCallback` after stripping the hash) and skip the #18 retry. The
app force-calls `initCallback` with the snapshot, does not swallow
bootstrap errors, and retries `login()` once if `getSession` throws.
See `src/lib/oauth/oauth-init-policy.ts`.

After changing loopback scopes or the callback handler, **re-authorize**:
rebuild the static web bundle if you are serving `web-build`, clear site
data **once** on `http://127.0.0.1:19006` (not mid-flow), sign in, consent
**once**, then confirm signed-in chrome (profile/avatar). Then open chats
and a Community Notes thread.

### Re-test on a box that already has a bsky.app session

```
EXPO_PUBLIC_OAUTH=1 yarn build-web
npx serve -l 19006 -s web-build
```

1. Chrome → `http://127.0.0.1:19006` → DevTools → Application → clear
   **only** this origin (not mid-flow; wiping after PAR starts drops PKCE).
2. Sign in with a real Bluesky handle. Consent on bsky.social (full scopes).
3. Callback must stay on `http://127.0.0.1:19006` (or `/auth/web/callback`)
   and show **profile/avatar**, not Sign in / Create account.
4. On the callback document **before** any rewrite/strip, DevTools must
   show `oauth: callback document {"hasCode":true,"hasState":true,...}`
   (`console.info` from `index.web.js`'s first import). The hash must
   **stay** until the token exchange succeeds; a failed exchange leaves
   `#code=` so it is not a silent anonymous landing. Then
   `oauth: init finished` and `oauth: login() established
   OauthBskyAppAgent` (`console.info`, not only the collapsed logger).
   Empty hash + no leftover `#state=` + no oauth lines is a **different**
   failure than leftover-grant (9a58ce838 silent-anonymous). At
   module-eval (before React) DevTools must show `oauth: snapshot eval`
   (`present:true` if `#code=`/`#state=` were on the document). Silence
   means this document never ran bootstrap, the wrong document loaded
   (`/` with `present:false`), or the console filter hides Warnings.
   Breadcrumbs use `globalThis.console.warn` (not `console.info`, not
   the Sentry-only logger). After a successful strip that still paints
   Sign in, expect `oauth: silent anonymous` (not `oauth: leftover grant`).
   Do **not** call PDS `getSession` on the OAuth path: a 401 with
   `DPoP error="invalid_token"` makes `@atproto/oauth-client` refresh
   then `delStored` the session that `callback()` just wrote (9a58ce838:
   token 200, getSession 401, Sign in). Handle comes from `getProfile`
   / token `sub`. Production `yarn build-web` strips Identifier
   `console.info`; breadcrumbs go through `globalThis.console.warn`.
   Failures: `kind` = `cors` | `dpop` |
   `redirect_uri` | `pkce_state` | `token`. When exchange fails or the
   session stays anonymous, DevTools must also show
   `oauth: failure diagnosis` with leftover `#code=`/`#state=`
   (`leftoverGrantInUrl`), `exchangeErrorKind`, token-endpoint
   `tokenEndpointHttpStatus` / `tokenEndpointFailureClass` (no secrets),
   and `snapshotRanBeforeStrip` / `snapshotHadCallbackParams` (did the
   module-eval snapshot run before hash rewrite/strip). Leftover
   `#state=` is **not** a soft-gate PASS. DevTools must show
   `oauth: leftover grant` with `exchangeAttempt` =
   `never_ran` (plus `exchangeNeverRanReason`) **or** `ran_and_failed`
   (plus classify kind / token HTTP class). Do not infer that
   distinction from error kind alone (`redirect_uri` never entered
   the token request). On **hosted** origins, after those breadcrumbs,
   `clearOauthCallbackUrl()` runs before anonymous chrome paints so
   `#code=`/`#state=` do not linger in browser history. **Loopback**
   leaves the grant on the URL for diagnosis. After `login()`, peek
   leftover `#code=`/`#state=` **before** any `clearOauthCallbackUrl()`;
   emit `login() established` only when none remain. Clearing first
   (fd83c6624) made the leftover gate dead.
5. Then chats + a Community Notes thread.

Do **not** assemble `release` / Fly / force-push.

An old token issued with `atproto` only will keep failing until replaced.

Loopback is for development only.

For a tunneled staging host (ngrok, Cloudflare Tunnel, etc.), set
`EXPO_PUBLIC_OAUTH_CLIENT_ID` to the public metadata URL and serve metadata
whose `client_id` and `redirect_uris` match that tunnel.

## Production deploy checklist (Jonathan)

These steps are outside the agent. No paid accounts are required.

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

- **Env:** `EXPO_PUBLIC_OAUTH=0` disables the OAuth UI for a deploy.
- **In-app:** Settings → Privacy and Security → "Sign in with OAuth".
- Preference is stored in persisted local state (`oauthSignInEnabled`).

## Logout / revoke

- Web logout (`logoutCurrentAccount` / `logoutEveryAccount`) calls
  `BrowserOAuthClient.revoke(sub)` for each OAuth account so the
  authorization server invalidates the token set. Failures are logged and
  do not block the logout UI. The native stub is a no-op (native OAuth is
  not launched).
- `OAuthSession` has no event API. On `@atproto/oauth-client` 0.6.x
  (what `oauth-client-browser` 0.3.42 pulls in), invalidation is the
  constructor `onDelete` hook (plus `onUpdate` for token refresh).
  Older clients used EventTarget `deleted` / `updated`; there is no
  `sessionadd`. Those events map to password-path `persistSession`
  `expired` / `create-failed`. Failed OAuth `restore()` also dispatches
  `create-failed` so the session store drops the account the same way a
  failed password resume does.

## Remaining native / store work

- Add `expo-atproto-auth` (or the current Expo ATProto helper) and implement
  `src/state/session/oauth-client.ts`.
- Register a unique app scheme (do not keep shipping `bluesky://` as Blue
  Notes) and put that scheme in `oauth-client-metadata.native.json`.
- Host the native metadata at the native `client_id` URL.
- Universal links / App Links for the callback if the stores require them.

## Merge notes

OAuth lands on **`bluenotes-rebrand`** (the independent branded app). `release`
is only the assemble/deploy tip (`reset --hard bluenotes-rebrand` then merge
`community-notes-feature`). This was ported onto rebrand rather than by merging
the raw `hailey/oauth*` branches:

- `hailey/oauth` and `hailey/expo-oauth-helper` (2024) are an abandoned native
  module experiment.
- `hailey/oauth-yeag` (2025-07, app 1.106) is the real source, but it rewrites
  the session provider, hardcodes `bsky.hailey.at`, and uses an AuthCallback
  route that never renders while logged out.
- Latest `bluesky-social/social-app` `main` (1.132) still has **no** OAuth
  login. Rebasing first would not land OAuth.

Password sessions and Community Notes behavior are unchanged when OAuth is
off. Do not land this by rewriting `AGENTS.md` / shipping-install docs
(draft PR #6).

## Community Notes / auth coordination

Community Notes XRPC (`getProposals`, `propose`, `vote`) talks to a
**separate notes service** (`https://api.bluenotes.social`, or
`localhost:2595` against a local PDS), not the user's PDS. Those calls
cannot go through `Agent`'s built-in XRPC client. They use
`fetchWithAgentAuth` in `src/lib/api/community-notes-auth.ts`.

| Session | What is sent |
| --- | --- |
| No real access token (`accessJwt` missing or `''`) | **Omit** `Authorization`. An empty `Bearer` is a hard 401; a missing header is soft-anonymous `getProposals`. |
| Password / app-password | `Authorization: Bearer <accessJwt>` when the JWT is non-empty. |
| OAuth (`OauthBskyAppAgent`) | `OAuthSession.fetchHandler` from `@atproto/oauth-client`. |

OAuth access tokens are DPoP-bound and live in the browser OAuth client
store, not in persisted `session.accessJwt` (that field is empty on
purpose). `fetchHandler` loads the real token via `getTokenSet`, sets
`Authorization: DPoP <access_token>` (`token_type` is `DPoP`), and the
library `dpopFetchWrapper` adds the `DPoP` proof (method + `htu` + `ath`)
and handles nonce retry / refresh. Do not hand-roll DPoP or send
`session.accessJwt` for OAuth sessions.
