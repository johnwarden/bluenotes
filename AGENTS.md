# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Bluenotes Social is a Community Notes-enabled fork of Bluesky. It's a React Native + Expo cross-platform app (iOS, Android, Web). The primary development target for cloud agents is the **web** build.

### Environment

This project uses **devbox** to manage development dependencies (Node.js, Yarn, Python, cmake, pkg-config, sqlite, clang, llvm). The Nix daemon must be running for devbox to work. All commands should be run through `devbox run --` to ensure the correct tool versions are available.

Before running devbox commands, ensure the Nix daemon is running:
```
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
sudo /nix/var/nix/profiles/default/bin/nix-daemon &
```

### Key commands

Prefer `just` commands (defined in the root `justfile`). Run through devbox: `devbox run -- just <recipe>`.

| Task | Command |
|------|---------|
| Install deps | `devbox run -- just deps` |
| Lint | `devbox run -- just lint` |
| Typecheck | `devbox run -- just typecheck` |
| Run web dev server | `devbox run -- just web` (serves on port 19006) |
| Unit tests | `devbox run -- yarn test` |
| Build i18n | `devbox run -- yarn intl:build` |
| List all recipes | `devbox run -- just --list` |

### Justfile recipes

The `justfile` at the repo root defines: `lint`, `typecheck`, `web`, `deps`, `bskyweb`, `ios`, `ios-simulator`. Always use `just` when a recipe exists rather than calling yarn/npm directly.

### Local backend (atproto dev environment)

To run against a full local dev environment with a test PDS, clone the `open-community-notes` companion repo and run `just start` in it (it also uses devbox). Then on the social app sign-in page, click the edit (pencil) icon next to "Hosting provider" to point to the local PDS URL and login with `alice.test`. Local PDS login uses the password fallback (`Use password instead` or `EXPO_PUBLIC_OAUTH=0`). See `docs/oauth.md`.

### Caveats

- The devbox `init_hook` in `devbox.json` runs `yarn` automatically when entering the devbox shell or running `devbox run`. This means running `devbox run -- just <cmd>` will first run `yarn install` if needed.
- 8 of 22 Jest test suites fail due to Expo native module resolution (`requireOptionalNativeModule`). This is expected in a web-only/non-native environment and is pre-existing.
- The web dev server (Expo) listens on **port 19006** (webpack) and **port 8081** (Metro).
- Chrome "Aw, Snap!" crashes (Error code 4) can occur after long dev sessions due to accumulated memory. Fix by restarting the Expo server (`just web`) and opening a fresh Chrome tab.
- Console shows CORS errors for `https://10.bsky.app/config` and React Native prop warnings (e.g., `accessibilityHint`, `hitSlop`). These are harmless in development.
- See `docs/build.md` for full build instructions and `docs/testing.md` for E2E test setup.
- Sub-projects `bskyembed/`, `bskylink/`, `bskyogcard/`, and `bskyweb/` have their own `package.json` / dependencies. For web app development, only the root and `bskyembed` deps are needed.
