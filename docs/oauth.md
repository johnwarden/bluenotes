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
ATProto **loopback** OAuth client automatically.

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
automatically: no hosted metadata, short-lived refresh tokens, and the library
rewrites `localhost` to `127.0.0.1`. Loopback is for development only.

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
