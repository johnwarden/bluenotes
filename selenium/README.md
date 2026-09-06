# Community Notes web smoke (Selenium)

Ship-adjacent **product smoke** for Blue Notes Community Notes. This does **not**
replace Maestro mobile e2e under `__e2e__/`.

It exists because a manual bot treated the Helpful Community Notes feed as
PASS when posts and “Readers Added Context / Rate Proposed” **label chrome**
were visible but the CommunityNoteWidget **note body** was missing. Chrome
alone is not a PASS.

## What it checks

Standing product bar (signed-in OAuth session, or documented soft-anon where
allowed):

| | Check | Auth |
| --- | --- | --- |
| **A** | `org.opencommunitynotes.getConfig` succeeds; `labelerDid` set | unauth |
| **B** | On a post with proposed/helpful notes, `getProposals?uris=` returns notes **and** the widget shows **visible note body text** | soft-anon Explore is the default gate; signed-in OAuth/DPoP is a separate test |
| **C** | `propose` succeeds | optional — skip if credentials missing |
| **D** | `vote` persists | optional — same |
| **E** | CN tabs `needs_your_help` / `new` / `rated_helpful` load real posts (not blank/error) | soft-anon or session |

**B default (CI / no OAuth creds):** dismiss the beta welcome modal via
**Explore the app without signing in**, stay on `/community-notes/rated_helpful`,
assert a **visible** Community Note body (not labels / feed-shell chrome),
and assert `getProposals` HTTP 200 with **Authorization omitted**.

**B signed-in OAuth:** handle-only form (not “Use password instead”) → PDS
consent → DPoP session. Assert visible note bodies on **Helpful home/feed-tab
chrome** and on `/community-notes/rated_helpful`. `getProposals` must send
`Authorization: DPoP <token>` (`fetchWithAgentAuth`). Never empty Bearer.
**Skips** with a clear message when `OAUTH_IDENTIFIER` + `OAUTH_PASSWORD`
are missing.

`selenium/test_assertions.py` is offline: it fails a chrome-only fixture so
the suite still encodes the false-PASS even when production currently
renders bodies.

## Requirements

- Python 3.10+ (devbox includes `python3`)
- Google Chrome (or Chromium)
- Selenium 4 **Selenium Manager** downloads a matching chromedriver — you do
  not install chromedriver by hand unless you pin `CHROME_BIN`

```bash
# from the repo root (creates selenium/.venv)
yarn test:selenium
# or
just selenium
# or
./scripts/run-selenium.sh
```

Offline assertions only (no Chrome, no live app):

```bash
./scripts/run-selenium.sh selenium/test_assertions.py
```

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `BASE_URL` | `http://127.0.0.1:19006` | App under test. Use `https://bluenotes.social` for production. |
| `NOTES_API_URL` | `https://api.bluenotes.social` | Live notes XRPC |
| `BSKY_PUBLIC_API` | `https://public.api.bsky.app` | Discover CN feed posts |
| `SELENIUM_HEADLESS` | `1` | Set `0` to watch the browser |
| `CHROME_BIN` | (auto) | Chrome binary override |
| `BSKY_IDENTIFIER` | unset | Handle for optional C/D |
| `BSKY_APP_PASSWORD` | unset | App password (or `BSKY_PASSWORD`) |
| `OAUTH_IDENTIFIER` | unset | Handle for signed-in DPoP note-body test |
| `OAUTH_PASSWORD` | unset | Account password for PDS OAuth consent (not an app password) |
| `BSKY_PDS` | `https://bsky.social` | `createSession` host |
| `SMOKE_ALLOW_WRITES` | `1` on localhost, else `0` | Required for C/D against production |
| `SMOKE_WRITE_POST_URI` | unset | Post `at://…` to annotate in C |

Against production:

```bash
BASE_URL=https://bluenotes.social yarn test:selenium
# or
just selenium-prod
```

Local webpack (`just web`, port 19006) only has Community Notes **routes**
when the running tree includes the CN UI (`community-notes-feature` or an
assembled `release`). `bluenotes-rebrand` alone is branding/OAuth — point
`BASE_URL` at production (or a release build) for a meaningful B/E run.

If `BASE_URL` is down, live tests **skip** with a message. Assertion tests
still run.

## Auth notes

- Unauth `getProposals?uris=` works on `https://api.bluenotes.social` (omit header).
- `Authorization: Bearer ` (empty) → **401**.
- Soft-anon Explore is the default CI gate for visible note bodies.
- Signed-in path must use DPoP via `fetchWithAgentAuth`. Set `OAUTH_IDENTIFIER`
  + `OAUTH_PASSWORD` to run it; otherwise it skips.
- C/D use a password session (`createSession` → non-empty Bearer). They do
  not hand-roll DPoP.

## CI

GitHub Actions runs **offline assertion tests only** when `selenium/**`
changes (`.github/workflows/selenium-smoke.yml`). Live Chrome against
production is not in the default PR matrix: it needs a browser, a running
app or `BASE_URL`, and optional write credentials. Dispatch the workflow
with a `base_url` input to run live smoke manually.

Maestro (`yarn e2e:run`) and Jest (`yarn test`) are unchanged.
