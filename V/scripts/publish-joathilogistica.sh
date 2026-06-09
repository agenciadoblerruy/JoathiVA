#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERIFY_SCRIPT="$ROOT_DIR/scripts/verify-joathilogistica.sh"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARTIFACT_ROOT="${ARTIFACT_ROOT:-$(cd "$ROOT_DIR/.." && pwd)/publication-artifacts}"
RUN_DIR="$ARTIFACT_ROOT/joathilogistica-$STAMP"
BACKUP_DIR="$RUN_DIR/backup"
STAGING_DIR="$RUN_DIR/staging"
PUBLIC_DIR="$RUN_DIR/public"
BACKUP_ARCHIVE="$RUN_DIR/joathilogistica-backup.tar.gz"
PUBLIC_ARCHIVE="$RUN_DIR/joathilogistica-public-bundle.tar.gz"
MANIFEST="$RUN_DIR/manifest.txt"

PUBLIC_FILES=(
  "index.html"
  "login.html"
  "admin.html"
  "brand-studio.html"
  "media-studio.html"
  "mktjoathi.html"
  "styles.css"
  "app.js"
  "brand-studio.js"
  "growth-lab.js"
  "joathiva.js"
  "portal.js"
  "mktjoathi.css"
  "mktjoathi.js"
  "logo.png"
  "logo.svg"
  "isotipo.svg"
  "lucia-arancel-data.js"
  "lucia-operational-data.js"
  "lucia-reference-data.js"
  "lucia-smart-search-data.js"
)

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Falta el comando requerido: %s\n' "$1" >&2
    exit 1
  }
}

copy_public_file() {
  local rel="$1"
  local src="$ROOT_DIR/$rel"
  local dst="$PUBLIC_DIR/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -a "$src" "$dst"
}

mkdir -p "$BACKUP_DIR" "$STAGING_DIR" "$PUBLIC_DIR"

"$VERIFY_SCRIPT"

require_command tar

cat >"$MANIFEST" <<EOF
Proyecto: joathilogistica.com
Fecha: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Fuente: $ROOT_DIR
Bundle publico: $PUBLIC_ARCHIVE
Backup local: $BACKUP_ARCHIVE

Exclusiones de backup:
- .env
- *.log
- *.bak*
- node_modules/
- assets/joathi-outlook-assistant/output/
- assets/joathi-outlook-assistant/input/emails/
- assets/joathi-outlook-assistant/config/assistant.local.env

Exclusiones de bundle publico:
- docs/
- scripts/
- prototipos/
- v1/
- tasks.config.json
- assets/joathi-outlook-assistant/

EOF

tar -czf "$BACKUP_ARCHIVE" \
  -C "$ROOT_DIR" \
  --exclude='.git' \
  --exclude='.idea' \
  --exclude='.gradle' \
  --exclude='build' \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.bak' \
  --exclude='*.bak-*' \
  --exclude='*.tmp' \
  --exclude='*.temp' \
  --exclude='*.zip' \
  --exclude='*.tar' \
  --exclude='*.tar.gz' \
  --exclude='*.tgz' \
  --exclude='assets/joathi-outlook-assistant/output' \
  --exclude='assets/joathi-outlook-assistant/input/emails' \
  --exclude='assets/joathi-outlook-assistant/config/assistant.local.env' \
  --exclude='assets/joathi-outlook-assistant/*.bak*' \
  --exclude='assets/joathi-outlook-assistant/scripts/*.bak*' \
  --exclude='assets/joathi-outlook-assistant/src/*.bak*' \
  .

for file in "${PUBLIC_FILES[@]}"; do
  copy_public_file "$file"
done

mkdir -p "$PUBLIC_DIR/assets"
cp -a "$ROOT_DIR/assets/brand" "$PUBLIC_DIR/assets/"

if [[ -d "$ROOT_DIR/assets/joathi-outlook-assistant" ]]; then
  printf 'Nota: el bundle publico no incluye assets/joathi-outlook-assistant.\n' >>"$MANIFEST"
fi

tar -czf "$PUBLIC_ARCHIVE" -C "$PUBLIC_DIR" .

if tar -tzf "$PUBLIC_ARCHIVE" | grep -Eq '(^|/)(\.env|.*\.log|.*\.bak.*|node_modules|docs/|scripts/|prototipos/|v1/|tasks\.config\.json|assets/joathi-outlook-assistant/)'; then
  printf 'El bundle publico contiene archivos excluidos.\n' >&2
  exit 1
fi

printf 'Backup local: %s\n' "$BACKUP_ARCHIVE"
printf 'Bundle publico: %s\n' "$PUBLIC_ARCHIVE"
printf 'Manifest: %s\n' "$MANIFEST"
