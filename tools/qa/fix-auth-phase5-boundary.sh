#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
SERVER="server/joathiva-server.ps1"
BOUNDARY="tools/qa/check-auth-middleware-boundary.sh"
SMOKE="tools/qa/run-core-smoke.sh"

fail() {
  echo "[fix-auth-phase5] ERROR: $*" >&2
  exit 1
}

[ -f "$SERVER" ] || fail "No existe $SERVER"
[ -f "V/portal.js" ] || fail "No existe V/portal.js"
[ -f "V/growth-lab.js" ] || fail "No existe V/growth-lab.js"
[ -f "$SMOKE" ] || fail "No existe $SMOKE"

mkdir -p tools/qa

cp "$SERVER" "$SERVER.bak.auth-phase5.$(date +%Y%m%d%H%M%S)"
cp "$SMOKE" "$SMOKE.bak.auth-phase5.$(date +%Y%m%d%H%M%S)"

python3 - <<'PY'
from pathlib import Path
import re

server_path = Path("server/joathiva-server.ps1")
text = server_path.read_text(encoding="utf-8")

required_helpers = r'''
function Write-AuthErrorResponse {
    param(
        [object]$Response,
        [int]$StatusCode = 401,
        [string]$Message = "Authentication required"
    )

    $Response.StatusCode = $StatusCode
    $Response.ContentType = "application/json"

    $payload = @{
        ok = $false
        error = $Message
    } | ConvertTo-Json -Depth 8

    $buffer = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $Response.OutputStream.Write($buffer, 0, $buffer.Length)
    $Response.OutputStream.Close()
}

function Assert-PortalAuthenticatedUser {
    param(
        [object]$Request,
        [object]$Response,
        [object]$RequestBody
    )

    $portalUser = Get-PortalUserFromRequestBody -RequestBody $RequestBody

    if (-not $portalUser) {
        Write-AuthErrorResponse -Response $Response -StatusCode 401 -Message "Invalid or missing portal session"
        return $null
    }

    return $portalUser
}

function Assert-PortalRole {
    param(
        [object]$Response,
        [object]$PortalUser,
        [string[]]$AllowedRoles
    )

    if (-not $PortalUser) {
        Write-AuthErrorResponse -Response $Response -StatusCode 401 -Message "Authentication required"
        return $false
    }

    if (-not $AllowedRoles -or $AllowedRoles.Count -eq 0) {
        Write-AuthErrorResponse -Response $Response -StatusCode 403 -Message "No portal roles allowed"
        return $false
    }

    $role = [string]$PortalUser.role

    if (-not $role -or ($AllowedRoles -notcontains $role)) {
        Write-AuthErrorResponse -Response $Response -StatusCode 403 -Message "Forbidden"
        return $false
    }

    return $true
}
'''.strip() + "\n\n"

missing = [
    name for name in [
        "Write-AuthErrorResponse",
        "Assert-PortalAuthenticatedUser",
        "Assert-PortalRole",
    ]
    if not re.search(rf"function\s+{re.escape(name)}\b", text, re.I)
]

if missing:
    marker = re.search(r"function\s+Get-PortalUserFromRequestBody\b", text, re.I)
    if marker:
        insert_at = marker.start()
        text = text[:insert_at] + required_helpers + text[insert_at:]
    else:
        text = required_helpers + text

text = re.sub(
    r"\$Global:SessionStore",
    "$script:PortalSessions",
    text,
)

text = re.sub(
    r"Authorization\s+Bearer",
    "sessionToken",
    text,
    flags=re.I,
)

patterns = {
    "/api/tools/profiles": r"""
        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody
        if (-not $portalUser) { return }
""",
    "/api/openai/settings": r"""
        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody
        if (-not $portalUser) { return }
        if (-not (Assert-PortalRole -Response $Response -PortalUser $portalUser -AllowedRoles @("master"))) { return }
""",
    "/api/openai/respond": r"""
        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody
        if (-not $portalUser) { return }
        if (-not (Assert-PortalRole -Response $Response -PortalUser $portalUser -AllowedRoles @("master"))) { return }
""",
}

def ensure_block_after_route(source: str, route: str, block: str) -> str:
    idx = source.find(route)
    if idx < 0:
        raise SystemExit(f"[fix-auth-phase5] ERROR: No se encontró endpoint {route}")

    window = source[idx:idx + 2500]

    if route == "/api/tools/profiles":
        if "Assert-PortalAuthenticatedUser" in window:
            return source
    else:
        if "Assert-PortalAuthenticatedUser" in window and "Assert-PortalRole" in window and "master" in window:
            return source

    body_match = re.search(
        r"(\$requestBody\s*=\s*(?:Read-JsonBody|Read-RequestBody|Get-RequestBody|ConvertFrom-Json|.*?ConvertFrom-Json).*?\n)",
        window,
        re.I,
    )

    if body_match:
        insert_at = idx + body_match.end()
        return source[:insert_at] + block + source[insert_at:]

    brace = source.find("{", idx)
    if brace < 0:
        raise SystemExit(f"[fix-auth-phase5] ERROR: No se pudo ubicar bloque para {route}")

    insert_at = brace + 1
    return source[:insert_at] + "\n" + block + source[insert_at:]

for route, block in patterns.items():
    text = ensure_block_after_route(text, route, block)

server_path.write_text(text, encoding="utf-8")
PY

cat > "$BOUNDARY" <<'SH2'
#!/usr/bin/env bash
set -euo pipefail

SERVER="server/joathiva-server.ps1"
PORTAL="V/portal.js"
GROWTH="V/growth-lab.js"

fail() {
  echo "[auth-boundary] FAIL: $*" >&2
  exit 1
}

[ -f "$SERVER" ] || fail "missing $SERVER"
[ -f "$PORTAL" ] || fail "missing $PORTAL"
[ -f "$GROWTH" ] || fail "missing $GROWTH"

grep -Eq 'function[[:space:]]+Write-AuthErrorResponse\b' "$SERVER" || fail "missing Write-AuthErrorResponse"
grep -Eq 'function[[:space:]]+Assert-PortalAuthenticatedUser\b' "$SERVER" || fail "missing Assert-PortalAuthenticatedUser"
grep -Eq 'function[[:space:]]+Assert-PortalRole\b' "$SERVER" || fail "missing Assert-PortalRole"

awk '
  /function[[:space:]]+Assert-PortalAuthenticatedUser\b/ { in_fn=1 }
  in_fn && /function[[:space:]]+Assert-PortalRole\b/ { exit }
  in_fn { print }
' "$SERVER" | grep -q 'Get-PortalUserFromRequestBody' || fail "Assert-PortalAuthenticatedUser must use Get-PortalUserFromRequestBody"

awk '
  /function[[:space:]]+Assert-PortalRole\b/ { in_fn=1 }
  in_fn && /^function[[:space:]]+/ && !/Assert-PortalRole/ { exit }
  in_fn { print }
' "$SERVER" | grep -Eq 'AllowedRoles|allowedRoles|\[string\[\]\]' || fail "Assert-PortalRole must validate allowed roles"

for endpoint in '/api/tools/profiles' '/api/openai/settings' '/api/openai/respond'; do
  grep -q "$endpoint" "$SERVER" || fail "missing endpoint $endpoint"
done

python3 - <<'PY'
from pathlib import Path
import sys

text = Path("server/joathiva-server.ps1").read_text(encoding="utf-8", errors="replace")

def window(route):
    i = text.find(route)
    if i < 0:
        raise SystemExit(f"[auth-boundary] FAIL: missing endpoint {route}")
    return text[i:i+3000]

checks = [
    ("/api/tools/profiles", ["Assert-PortalAuthenticatedUser"]),
    ("/api/openai/settings", ["Assert-PortalAuthenticatedUser", "Assert-PortalRole", "master"]),
    ("/api/openai/respond", ["Assert-PortalAuthenticatedUser", "Assert-PortalRole", "master"]),
]

for route, needles in checks:
    w = window(route)
    for needle in needles:
        if needle not in w:
            raise SystemExit(f"[auth-boundary] FAIL: {route} missing {needle}")

for forbidden in [
    "$Global:SessionStore",
    "Authorization Bearer",
]:
    if forbidden.lower() in text.lower():
        raise SystemExit(f"[auth-boundary] FAIL: forbidden pattern present: {forbidden}")

for frontend in ["V/portal.js", "V/growth-lab.js"]:
    ft = Path(frontend).read_text(encoding="utf-8", errors="replace")
    if "user.password" in ft:
        raise SystemExit(f"[auth-boundary] FAIL: frontend reintroduces user.password in {frontend}")

print("[auth-boundary] PASS")
PY
SH2

chmod +x "$BOUNDARY"

python3 - <<'PY'
from pathlib import Path

path = Path("tools/qa/run-core-smoke.sh")
text = path.read_text(encoding="utf-8")

line_header = 'echo "== Auth middleware boundary =="'
line_exec = 'bash tools/qa/check-auth-middleware-boundary.sh'

if "check-auth-middleware-boundary.sh" not in text:
    insert = f'\n{line_header}\n{line_exec}\n'
    if "set -euo pipefail" in text:
        text = text.replace("set -euo pipefail", "set -euo pipefail" + insert, 1)
    else:
        text = insert + "\n" + text
elif '== Auth middleware boundary ==' not in text:
    text = text.replace(line_exec, f'{line_header}\n{line_exec}', 1)

path.write_text(text, encoding="utf-8")
PY

node --check V/portal.js
node --check V/growth-lab.js
bash tools/qa/run-core-smoke.sh
git status --short
