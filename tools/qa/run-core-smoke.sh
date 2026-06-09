#!/usr/bin/env bash
set -euo pipefail
echo "== Auth middleware boundary =="
bash tools/qa/check-auth-middleware-boundary.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[core-smoke] PASS"
