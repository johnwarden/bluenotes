#!/usr/bin/env bash
# Isolated Community Notes Selenium smoke. Does not touch Maestro or Jest.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${ROOT}/selenium/.venv"
PYTEST=()

if [[ ! -x "${VENV}/bin/pytest" ]]; then
  if python3 -m venv "${VENV}" 2>/dev/null; then
    "${VENV}/bin/pip" install -q -U pip
  else
    rm -rf "${VENV}"
  fi
fi
if [[ -x "${VENV}/bin/pip" ]]; then
  "${VENV}/bin/pip" install -q -r "${ROOT}/selenium/requirements.txt"
  PYTEST=("${VENV}/bin/pytest")
else
  python3 -m pip install -q --user -r "${ROOT}/selenium/requirements.txt"
  PYTEST=(python3 -m pytest)
fi

cd "${ROOT}"
exec "${PYTEST[@]}" selenium "$@"
