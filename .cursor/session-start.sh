#!/usr/bin/env bash
# Install as .cursor/session-start.sh; environment.json "start" → that path.
# Optional .cursor/trunk: one line naming the integration branch (default main).
set -u
if [[ -d .githooks ]]; then
  git config core.hooksPath .githooks
fi

trunk=main
if [[ -f .cursor/trunk ]]; then
  trunk="$(tr -d '[:space:]' < .cursor/trunk)"
  if [[ -z "$trunk" ]]; then
    trunk=main
  fi
fi

git fetch origin --prune || {
  echo "WARN: git fetch origin failed" >&2
  exit 0
}

branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo HEAD)"

if [[ "$branch" == "$trunk" ]]; then
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
