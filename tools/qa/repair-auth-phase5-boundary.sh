#!/usr/bin/env bash
set -euo pipefail

SERVER="server/joathiva-server.ps1"
BOUNDARY="tools/qa/check-auth-middleware-boundary.sh"
SMOKE="tools/qa/run-core-smoke.sh"

fail() {
  echo "[repair-auth-phase5] ERROR: $*" >&2
  exit 1
}

[ -f "$SERVER" ] || fail "No existe $SERVER"
[ -f "V/portal.js" ] || fail "No existe V/portal.js"
[ -f "V/growth-lab.js" ] || fail "No existe V/growth-lab.js"
[ -f "$SMOKE" ] || fail "No existe $SMOKE"

mkdir -p tools/qa

STAMP="$(date +%Y%m%d%H%M%S)"
cp "$SERVER" "$SERVER.bak.repair-auth-phase5.$STAMP"
cp "$SMOKE" "$SMOKE.bak.repair-auth-phase5.$STAMP"
[ -f "$BOUNDARY" ] && cp "$BOUNDARY" "$BOUNDARY.bak.repair-auth-phase5.$STAMP"

python3 - <<'PY'
from pathlib import Path
import re

server_path = Path("server/joathiva-server.ps1")
text = server_path.read_text(encoding="utf-8", errors="replace")

helpers = r'''
function Write-AuthErrorResponse {
    param(
        [Parameter(Mandatory = $true)]
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
        [Parameter(Mandatory = $true)]
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
        [Parameter(Mandatory = $true)]
        [object]$Response,

        [Parameter(Mandatory = $true)]
        [object]$PortalUser,

        [Parameter(Mandatory = $true)]
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

def find_function_span(source, name):
    m = re.search(rf'(?im)^[ \t]*function[ \t]+{re.escape(name)}\b', source)
    if not m:
        return None

    brace = source.find("{", m.end())
    if brace < 0:
        return None

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
                end = i + 1
                while end < len(source) and source[end] in " \t\r\n":
                    end += 1
                return (m.start(), end)

    return None

for name in [
    "Write-AuthErrorResponse",
    "Assert-PortalAuthenticatedUser",
    "Assert-PortalRole",
]:
    span = find_function_span(text, name)
    if span:
        text = text[:span[0]] + text[span[1]:]

insert_match = re.search(r'(?im)^[ \t]*function[ \t]+Get-PortalUserFromRequestBody\b', text)
if insert_match:
    text = text[:insert_match.start()] + helpers + text[insert_match.start():]
else:
    text = helpers + text

text = text.replace("$Global:SessionStore", "$script:PortalSessions")
text = re.sub(r'Authorization\s+Bearer', 'sessionToken', text, flags=re.I)

def endpoint_window(source, route, size=4000):
    i = source.find(route)
    if i < 0:
        raise SystemExit(f"[repair-auth-phase5] ERROR: No se encontró endpoint {route}")
    return i, source[i:i + size]

def ensure_auth_after_route(source, route, required_lines):
    i, w = endpoint_window(source, route)

    if all(line.strip() in w for line in required_lines):
        return source

    if "Assert-PortalAuthenticatedUser" in w:
        return source

    body_match = re.search(
        r'(?im)^([ \t]*\$requestBody[ \t]*=.*?$)',
        w,
    )

    block = "\n" + "\n".join(required_lines) + "\n"

    if body_match:
        insert_at = i + body_match.end()
        return source[:insert_at] + block + source[insert_at:]

    open_brace = source.find("{", i)
    if open_brace < 0:
        raise SystemExit(f"[repair-auth-phase5] ERROR: No se pudo ubicar bloque para {route}")

    return source[:open_brace + 1] + block + source[open_brace + 1:]

text = ensure_auth_after_route(text, "/api/tools/profiles", [
    '        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody',
    '        if (-not $portalUser) { return }',
])

text = ensure_auth_after_route(text, "/api/openai/settings", [
    '        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody',
    '        if (-not $portalUser) { return }',
    '        if (-not (Assert-PortalRole -Response $Response -PortalUser $portalUser -AllowedRoles @("master"))) { return }',
])

text = ensure_auth_after_route(text, "/api/openai/respond", [
    '        $portalUser = Assert-PortalAuthenticatedUser -Request $Request -Response $Response -RequestBody $requestBody',
    '        if (-not $portalUser) { return }',
    '        if (-not (Assert-PortalRole -Response $Response -PortalUser $portalUser -AllowedRoles @("master"))) { return }',
])

server_path.write_text(text, encoding="utf-8")
PY

cat > "$BOUNDARY" <<'SH2'
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
SH2

chmod +x "$BOUNDARY"

python3 - <<'PY'
from pathlib import Path

path = Path("tools/qa/run-core-smoke.sh")
text = path.read_text(encoding="utf-8", errors="replace")

header = 'echo "== Auth middleware boundary =="'
check = 'bash tools/qa/check-auth-middleware-boundary.sh'

lines = text.splitlines()
filtered = []
skip_next = False

for line in lines:
    if line.strip() == header:
        continue
    if line.strip() == check:
        continue
    filtered.append(line)

lines = filtered

insert_at = 0
for i, line in enumerate(lines):
    if line.startswith("set -"):
        insert_at = i + 1
        break

lines[insert_at:insert_at] = [
    header,
    check,
]

path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

node --check V/portal.js
node --check V/growth-lab.js
bash tools/qa/run-core-smoke.sh
git status --short
