#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PS1_SMOKE="$SCRIPT_DIR/lucia_qa_smoke.ps1"

if [[ ! -f "$PS1_SMOKE" ]]; then
  echo "No se encontro el wrapper PowerShell en $PS1_SMOKE" >&2
  exit 1
fi

PS1_SMOKE_WIN="$(wslpath -w "$PS1_SMOKE")"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PS1_SMOKE_WIN" "$@"
