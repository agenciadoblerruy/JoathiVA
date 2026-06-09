#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIVE_HOME_URL="${LIVE_HOME_URL:-https://joathilogistica.com/}"
LIVE_LOGIN_URL="${LIVE_LOGIN_URL:-https://joathilogistica.com/acceso-joathiva/}"

fail() {
  printf 'Verificacion fallida: %s\n' "$1" >&2
  exit 1
}

require_file() {
  local path="$1"
  [[ -f "$ROOT_DIR/$path" ]] || fail "falta $path"
}

require_file "index.html"
require_file "login.html"
require_file "admin.html"
require_file "brand-studio.html"
require_file "media-studio.html"
require_file "mktjoathi.html"
require_file "styles.css"
require_file "portal.js"
require_file "joathiva.js"
require_file "brand-studio.js"
require_file "mktjoathi.js"
require_file "mktjoathi.css"
require_file "logo.svg"
require_file "isotipo.svg"

grep -q 'href="#quotePanel"' "$ROOT_DIR/index.html" || fail "index.html no enlaza el cotizador local"
grep -q 'id="quotePanel"' "$ROOT_DIR/index.html" || fail "index.html no contiene la seccion quotePanel"
grep -q 'href="login.html"' "$ROOT_DIR/index.html" || fail "index.html no enlaza login.html"
grep -q 'script src="portal.js"' "$ROOT_DIR/index.html" || fail "index.html no carga portal.js"
grep -q 'script src="joathiva.js"' "$ROOT_DIR/index.html" || fail "index.html no carga joathiva.js"
grep -q 'script src="portal.js"' "$ROOT_DIR/login.html" || fail "login.html no carga portal.js"
grep -q 'script src="joathiva.js"' "$ROOT_DIR/login.html" || fail "login.html no carga joathiva.js"

command -v curl >/dev/null 2>&1 || fail "curl no esta disponible"

home_html="$(curl -fsSL "$LIVE_HOME_URL")"
login_html="$(curl -fsSL "$LIVE_LOGIN_URL")"
home_api="$(curl -fsSL "https://joathilogistica.com/wp-json/wp/v2/pages/124")"
login_api="$(curl -fsSL "https://joathilogistica.com/wp-json/wp/v2/pages/243")"

printf '%s' "$home_html" | grep -q 'id="cotizador"' || fail "la home publica no expone el cotizador"
printf '%s' "$home_html" | grep -q 'href="https://joathilogistica.com/acceso-joathiva/"' || fail "la home publica no enlaza JoathiVA"
printf '%s' "$home_html" | grep -q 'wp-theme-packers-agency' || fail "la home publica no corresponde al tema WordPress esperado"
printf '%s' "$home_api" | grep -q '"slug":"home"' || fail "la API no confirma la home publica"
printf '%s' "$login_html" | grep -q 'Acceso JoathiVA' || fail "la ruta publica de JoathiVA no responde como se espera"
printf '%s' "$login_api" | grep -q '"slug":"acceso-joathiva"' || fail "la API no confirma la pagina de JoathiVA"

printf 'Verificacion OK\n'
printf 'Home publica: %s\n' "$LIVE_HOME_URL"
printf 'JoathiVA publica: %s\n' "$LIVE_LOGIN_URL"

