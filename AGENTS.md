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

### Key commands (all via `devbox run --`)

| Task | Command |
|------|---------|
| Install deps | `devbox run -- yarn install` (also installs patches + i18n via postinstall) |
| Install bskyembed deps | `devbox run -- bash -c "cd bskyembed && yarn install --frozen-lockfile"` |
| Lint | `devbox run -- yarn lint` |
| Typecheck | `devbox run -- yarn typecheck` |
| Unit tests | `devbox run -- yarn test` |
| Run web dev server | `devbox run -- yarn web` (serves on port 19006) |
| Build i18n | `devbox run -- yarn intl:build` |

### Caveats

- The devbox `init_hook` in `devbox.json` runs `yarn` automatically when entering the devbox shell or running `devbox run`. This means running `devbox run -- <cmd>` will first run `yarn install` if needed.
- 8 of 22 Jest test suites fail due to Expo native module resolution (`requireOptionalNativeModule`). This is expected in a web-only/non-native environment and is pre-existing.
- The web dev server (Expo) listens on **port 19006** (webpack) and **port 8081** (Metro).
- See `docs/build.md` for full build instructions and `docs/testing.md` for E2E test setup.
- Sub-projects `bskyembed/`, `bskylink/`, `bskyogcard/`, and `bskyweb/` have their own `package.json` / dependencies. For web app development, only the root and `bskyembed` deps are needed.
