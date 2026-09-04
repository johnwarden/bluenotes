# AGENTS.md

Instructions for any coding agent (human-assisted or autonomous) working in this repository.

Keep this file **agent-general**. Tool-specific setup belongs under `.cursor/`, not here.

## Branching

- `tooling` — shared tooling both working lines rebase onto (itself rebases from `upstream/main`)
- `community-notes-feature` — pure Community Notes (separable for a Bluesky merge without rebrand)
- `bluenotes-rebrand` — brand + independent-app deployability
- `release` — assemble/deploy tip only (not a day-to-day PR base)

Both working lines rebase onto `tooling`. See **BRANCHING_AND_RELEASING.md** for details. Do not invent a different model. How a session picks its rebase/ff target (`tooling`, `community-notes-feature`, or `bluenotes-rebrand`) is under `.cursor/`.

## Merge

Squash the PR to **one commit**, then **fast-forward** onto the correct base (`tooling`, `bluenotes-rebrand`, or `community-notes-feature`). That squash commit **is** HEAD of that base.

- No merge commits
- Rebase-merge is **not** the path (it keeps N commits)
- GitHub’s “Squash and merge” is the button
- **Do not merge** unless Jonathan explicitly says so for that PR (`gh pr merge --squash` is still a merge)
- Never `gh pr merge --merge`. Do not `--rebase` unless he says so for that PR
- Do **not** open ordinary feature PRs into `release`. Assembling `release` follows **BRANCHING_AND_RELEASING.md**.

The squash SHA differs from the PR head. Treat the **code** as identical. Do not write SHA-dependent tests.

## CI and deploy

Test on the PR (the code that becomes the chosen base). Branch protection must **require** those PR checks (Lint / tests / web build) so untested code cannot merge.

`release` is the **deploy tip**. After it is assembled and pushed, **deploy immediately**. Do **not** re-run format/compile/test on push to `release` (that is how a post-merge red happens after deploy already shipped). Deploy workflows on push to `release` need `concurrency: group: deploy-production` and `cancel-in-progress: true` so two pushes cannot race and land the older SHA last.

When CI fails on a PR, notify or resume the agent that owns that branch. Do not poll. Do not merge to “fix” CI.

## GitHub settings (human, once per repo)

Settings → General → Pull Requests:

- Allow merge commits: **off**
- Allow squash merging: **on**
- Allow rebase merging: **off**

Settings → Branches → rules on `tooling`, `bluenotes-rebrand`, and `community-notes-feature`:

- Require linear history: **on**
- Require the PR checks (Lint / tests / web build) before merge

`release` is assembled per **BRANCHING_AND_RELEASING.md**, not by ordinary PR merge. Bots do not flip admin settings from the shared ops computer.

## Git hooks

If this repo has `.githooks`, environment setup must set `core.hooksPath=.githooks`. Do **not** `git commit` or `git push --no-verify` unless Jonathan says so. CI is the backstop, not the only gate.

## Incomplete work

The Bot that owns this repo owns open PRs, CI, merge conflicts, and drafts. Check at the weekday 8:56 America/Denver run and whenever a signal arrives. Act without waiting to be nudged. Stay silent if nothing is new.

When a base moves: rebase remaining **non-parked** feature/`cursor/*` PRs onto that same base. Skip PRs Jonathan has parked (do not nag, do not rebase).

## Do not

- Put tokens, keys, or secrets in this repo, in docs, or in chat
- Merge, spend, publish, or send external mail unless Jonathan says so
- Enable a live bot or production flag unless he says so

## Project notes

Bluenotes Social is a Community Notes-enabled fork of Bluesky. It's a React Native + Expo cross-platform app (iOS, Android, Web).

### Environment

This project uses **devbox** to manage development dependencies (Node.js, pnpm, Python, cmake, pkg-config, sqlite, clang, llvm). Upstream 1.133+ uses **pnpm** (not yarn). The Nix daemon must be running for devbox to work. All commands should be run through `devbox run --` to ensure the correct tool versions are available.

Before running devbox commands, ensure the Nix daemon is running:
```
export PATH="/nix/var/nix/profiles/default/bin:$PATH"
sudo /nix/var/nix/profiles/default/bin/nix-daemon &
```

### Key commands

Prefer `just` commands (defined in the root `justfile`). Run through `devbox run -- just <recipe>`.

| Task | Command |
|------|---------|
| Install deps | `devbox run -- just deps` |
| Lint | `devbox run -- just lint` |
| Typecheck | `devbox run -- just typecheck` |
| Run web dev server | `devbox run -- just web` (serves on port 19006) |
| Unit tests | `devbox run -- pnpm test` |
| Build i18n | `devbox run -- pnpm intl:build` |
| List all recipes | `devbox run -- just --list` |

### Justfile recipes

The `justfile` at the repo root defines: `lint`, `typecheck`, `web`, `deps`, `bskyweb`, `ios`, `ios-simulator`. Always use `just` when a recipe exists rather than calling pnpm/npm directly.

### Local backend (atproto dev environment)

To run against a full local dev environment with a test PDS, clone the `open-community-notes` companion repo and run `just start` in it (it also uses devbox). Then on the social app sign-in page, click the edit (pencil) icon next to "Hosting provider" to point to the local PDS URL and login with `alice.test`.

### Caveats

- The devbox `init_hook` in `devbox.json` enables corepack and runs `pnpm install` when entering the devbox shell or running `devbox run`. This means running `devbox run -- just <cmd>` will first install JS deps if needed.
- 8 of 22 Jest test suites fail due to Expo native module resolution (`requireOptionalNativeModule`). This is expected in a web-only/non-native environment and is pre-existing.
- The web dev server (Expo) listens on **port 19006** (webpack) and **port 8081** (Metro).
- Console shows CORS errors for `https://10.bsky.app/config` and React Native prop warnings (e.g., `accessibilityHint`, `hitSlop`). These are harmless in development.
- See `docs/build.md` for full build instructions and `docs/testing.md` for E2E test setup.
- Sub-projects `bskyembed/`, `bskylink/`, `bskyogcard/`, and `bskyweb/` have their own `package.json` / dependencies. For web app development, only the root and `bskyembed` deps are needed.
