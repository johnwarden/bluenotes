#!/usr/bin/env bash
# Canonical copy: repo-setup/templates/session-start.sh in johnwarden/agents.
# Install as .cursor/session-start.sh and set environment.json "start" to that
# path. Cursor runs start on every Cloud Agent boot (detached).
# Optional .cursor/trunk: one line naming the integration branch.
# Deviation from the template: if .cursor/trunk is absent or empty, do not
# default to main. Fetch only and skip ff/rebase (this repo has three session
# targets; main is a stale upstream mirror).
set -u
if [[ -d .githooks ]]; then
  git config core.hooksPath .githooks
fi

trunk=
if [[ -f .cursor/trunk ]]; then
  trunk="$(tr -d '[:space:]' < .cursor/trunk)"
fi

git fetch origin --prune || {
  echo "WARN: git fetch origin failed" >&2
  exit 0
}

if [[ -z "$trunk" ]]; then
  echo "INFO: no .cursor/trunk; skipped ff/rebase" >&2
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"

if [[ "$branch" == "$trunk" ]]; then
  # Fast-forward only. Never a merge commit.
  git merge --ff-only "origin/${trunk}" || echo "WARN: could not ff-only ${trunk} to origin/${trunk}" >&2
elif [[ "$branch" != "HEAD" ]]; then
  if ! git rebase "origin/${trunk}"; then
    git rebase --abort >/dev/null 2>&1 || true
    echo "WARN: rebase onto origin/${trunk} failed; left $branch as fetched" >&2
  fi
elif git merge-base --is-ancestor HEAD "origin/${trunk}" 2>/dev/null; then
  git checkout -B "$trunk" "origin/${trunk}" || echo "WARN: could not move detached HEAD to origin/${trunk}" >&2
fi
exit 0
