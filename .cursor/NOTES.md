# Cursor-only repo notes

## Cloud agent model

Launch with model **Grok 4.6** (`grok-4.6`). Fallback **Claude Sonnet 4.6** (`claude-sonnet-4-6`) if Grok 4.6 is unavailable. Not Opus unless Jonathan says so for that run.

Do **not** paste standing shipping rules into CloudAgent launch/reply prompts. Root `AGENTS.md` is what Cursor already reads for policy.

## Branching

- `tooling` — shared tooling both working lines rebase onto (itself rebases from `upstream/main`)
- `community-notes-feature` — pure Community Notes (separable for a Bluesky merge without rebrand)
- `bluenotes-rebrand` — brand + independent-app deployability
- `release` — assemble/deploy tip only (not a day-to-day PR base)

Both working lines rebase onto `tooling`. See **BRANCHING_AND_RELEASING.md** for details.

## Session start

For **every** Blue Notes cloud-agent session, decide which of these three the work is, then set the target **before** relying on session-start rebase/ff:

1. **tooling** — shared tooling both working lines rebase onto → `tooling`
2. **Community Notes** feature → `community-notes-feature`
3. **Bluenotes rebrand** feature → `bluenotes-rebrand`

Write that branch into local `.cursor/trunk` (one line), or otherwise pass it as the session rebase/ff target.

`install` (Build time) may set `core.hooksPath=.githooks` and warm deps. `start` is `.cursor/session-start.sh`: re-sets hooksPath if `.githooks` exists and `git fetch`es. If a local `.cursor/trunk` names a branch, it fast-forwards that branch to `origin/<trunk>` and rebases a feature branch onto `origin/<trunk>` (aborts on conflict). If the file is absent or empty, start skips ff/rebase (no default to `main`). Agents should not fetch, pull, or rebase unless start failed. `start` is detached, so wait for it if the session’s rebase target is needed immediately.

**Do not commit a repo-wide trunk** that picks one working line. session-start does not assemble `release`.

Start new work from the chosen line on a new VM. Reply to the existing cloud agent for the same PR; do not launch a second one on the same branch.

## environment.json

Set `"start": ".cursor/session-start.sh"`. Create a minimal `.cursor/environment.json` if the repo has none.

## This repo (Cloud)

The primary development target for cloud agents is the **web** build.

Chrome "Aw, Snap!" crashes (Error code 4) can occur after long dev sessions due to accumulated memory. Fix by restarting the Expo server (`just web`) and opening a fresh Chrome tab.
