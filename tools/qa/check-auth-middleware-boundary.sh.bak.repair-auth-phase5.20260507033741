#!/usr/bin/env bash
set -euo pipefail

SERVER="server/joathiva-server.ps1"

fail() {
  echo "[auth-boundary] FAIL: $*" >&2
  exit 1
}

[ -f "$SERVER" ] || fail "missing $SERVER"
[ -f "V/portal.js" ] || fail "missing V/portal.js"
[ -f "V/growth-lab.js" ] || fail "missing V/growth-lab.js"

python3 - <<'PY'
from pathlib import Path
import re
import sys

server = Path("server/joathiva-server.ps1").read_text(encoding="utf-8", errors="replace")

def fail(msg):
    print(f"[auth-boundary] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)

def function_body(source, name):
    m = re.search(rf'(?im)^[ \t]*function[ \t]+{re.escape(name)}\b', source)
    if not m:
        fail(f"missing {name}")

    brace = source.find("{", m.end())
    if brace < 0:
        fail(f"malformed {name}")

    depth = 0
    in_sq = False
    in_dq = False
    esc = False

    for i in range(brace, len(source)):
        ch = source[i]

        if in_sq:
            if ch == "'":
                in_sq = False
            continue

        if in_dq:
            if ch == "`":
                esc = not esc
                continue
            if ch == '"' and not esc:
                in_dq = False
            esc = False
            continue

        if ch == "'":
            in_sq = True
            continue

        if ch == '"':
            in_dq = True
            continue

        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return source[brace:i + 1]

    fail(f"unterminated {name}")

for name in [
    "Write-AuthErrorResponse",
    "Assert-PortalAuthenticatedUser",
    "Assert-PortalRole",
]:
    function_body(server, name)

auth_body = function_body(server, "Assert-PortalAuthenticatedUser")
role_body = function_body(server, "Assert-PortalRole")

if "Get-PortalUserFromRequestBody" not in auth_body:
    fail("Assert-PortalAuthenticatedUser must use Get-PortalUserFromRequestBody")

if "AllowedRoles" not in role_body or "-notcontains" not in role_body:
    fail("Assert-PortalRole must validate against allowed roles")

def route_window(route):
    i = server.find(route)
    if i < 0:
        fail(f"missing endpoint {route}")
    return server[i:i + 4000]

profiles = route_window("/api/tools/profiles")
settings = route_window("/api/openai/settings")
respond = route_window("/api/openai/respond")

if "Assert-PortalAuthenticatedUser" not in profiles:
    fail("/api/tools/profiles must use Assert-PortalAuthenticatedUser")

for route, win in [
    ("/api/openai/settings", settings),
    ("/api/openai/respond", respond),
]:
    if "Assert-PortalAuthenticatedUser" not in win:
        fail(f"{route} must use Assert-PortalAuthenticatedUser")
    if "Assert-PortalRole" not in win or "master" not in win:
        fail(f"{route} must use Assert-PortalRole master")

for forbidden in [
    "$Global:SessionStore",
    "Authorization Bearer",
]:
    if forbidden.lower() in server.lower():
        fail(f"forbidden pattern present: {forbidden}")

for frontend in [
    "V/portal.js",
    "V/growth-lab.js",
]:
    body = Path(frontend).read_text(encoding="utf-8", errors="replace")
    if "user.password" in body:
        fail(f"frontend reintroduces user.password in {frontend}")

print("[auth-boundary] PASS")
PY
