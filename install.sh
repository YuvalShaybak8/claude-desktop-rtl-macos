#!/usr/bin/env bash
# claude-desktop-rtl-mac — install
# Adds RTL/bidi support to Claude Desktop on macOS by patching the bundled
# Electron app.asar. Safe to re-run. To undo, run ./uninstall.sh.

set -euo pipefail

# ----- colors -----
if [[ -t 1 ]]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'
  BLUE=$'\033[0;34m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

info() { printf '%s==>%s %s\n' "$BLUE" "$NC" "$*"; }
ok()   { printf '%s✓%s %s\n'   "$GREEN" "$NC" "$*"; }
warn() { printf '%s!%s %s\n'   "$YELLOW" "$NC" "$*"; }
err()  { printf '%s✗%s %s\n'   "$RED"   "$NC" "$*" >&2; }

# ----- platform check -----
if [[ "$(uname -s)" != "Darwin" ]]; then
  err "This installer is for macOS only."
  exit 1
fi

# ----- locate Claude.app -----
CANDIDATES=(
  "/Applications/Claude.app"
  "$HOME/Applications/Claude.app"
)

CLAUDE_APP=""
for c in "${CANDIDATES[@]}"; do
  if [[ -d "$c" ]]; then CLAUDE_APP="$c"; break; fi
done

if [[ -z "$CLAUDE_APP" ]]; then
  err "Claude.app not found in /Applications or ~/Applications."
  err "Install Claude Desktop from https://claude.ai/download first."
  exit 1
fi

ok "Found Claude.app at $CLAUDE_APP"

ASAR_PATH="$CLAUDE_APP/Contents/Resources/app.asar"
BACKUP_PATH="$ASAR_PATH.original"

if [[ ! -f "$ASAR_PATH" ]]; then
  err "app.asar not found at $ASAR_PATH"
  err "Claude Desktop's structure may have changed. Please open an issue."
  exit 1
fi

# ----- dependency checks -----
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is required. Install it via 'brew install node' or from https://nodejs.org"
  exit 1
fi
if ! command -v npx >/dev/null 2>&1; then
  err "npx is required (ships with Node.js)."
  exit 1
fi
ok "Dependencies present (node $(node -v))"

# ----- locate source files -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTL_CSS="$SCRIPT_DIR/src/rtl.css"
INJECT_JS="$SCRIPT_DIR/src/inject.js"
PATCH_JS="$SCRIPT_DIR/src/patch-html.js"

for f in "$RTL_CSS" "$INJECT_JS" "$PATCH_JS"; do
  if [[ ! -f "$f" ]]; then
    err "Missing source file: $f"
    exit 1
  fi
done

# ----- warn if Claude is running -----
if pgrep -x "Claude" >/dev/null 2>&1; then
  warn "Claude Desktop appears to be running."
  warn "You'll need to quit it (⌘Q) and reopen it after this script finishes."
  echo
fi

# ----- sudo upfront -----
info "Modifying $CLAUDE_APP requires admin privileges. You may be prompted for your password."
sudo -v
# Keep sudo alive for the duration of the script.
( while true; do sudo -n true; sleep 30; kill -0 "$$" 2>/dev/null || exit; done ) &
SUDO_KEEPALIVE_PID=$!

# ----- temp dir + cleanup trap -----
TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
  kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ----- backup original asar -----
if [[ ! -f "$BACKUP_PATH" ]]; then
  info "Backing up original app.asar → app.asar.original"
  sudo cp "$ASAR_PATH" "$BACKUP_PATH"
  ok "Backup created"
else
  warn "Backup already exists at app.asar.original — leaving it untouched"
fi

# ----- extract -----
EXTRACT_DIR="$TMP_DIR/app"
info "Extracting app.asar..."
npx --yes @electron/asar@latest extract "$ASAR_PATH" "$EXTRACT_DIR" >/dev/null
ok "Extracted"

# ----- find index.html files -----
HTML_FILES=()
while IFS= read -r __line; do
  HTML_FILES+=("$__line")
done < <(find "$EXTRACT_DIR" -name 'index.html' -not -path '*/node_modules/*')

if [[ ${#HTML_FILES[@]} -eq 0 ]]; then
  err "No index.html found inside extracted app.asar."
  err "Claude Desktop's structure may have changed. Please open an issue with your Claude version."
  exit 1
fi

info "Found ${#HTML_FILES[@]} HTML entry point(s) to patch:"
for f in "${HTML_FILES[@]}"; do
  printf '    %s\n' "${f#$EXTRACT_DIR/}"
done

# ----- patch each HTML file -----
for f in "${HTML_FILES[@]}"; do
  node "$PATCH_JS" "$f" "$RTL_CSS" "$INJECT_JS"
done
ok "All HTML files patched"

# ----- repack -----
info "Repacking app.asar..."
NEW_ASAR="$TMP_DIR/app.asar.new"
npx --yes @electron/asar@latest pack "$EXTRACT_DIR" "$NEW_ASAR" >/dev/null
sudo cp "$NEW_ASAR" "$ASAR_PATH"
ok "Repacked"

# ----- re-sign (ad-hoc) -----
info "Re-signing Claude.app with an ad-hoc signature..."
# stderr filtering: codesign is chatty and most output is noise we can ignore
if sudo codesign --force --deep --sign - "$CLAUDE_APP" 2>&1 \
     | grep -v -e "replacing existing signature" -e "^$" >/dev/null; then :; fi
ok "Signed"

# ----- remove quarantine attribute if present -----
if xattr -p com.apple.quarantine "$CLAUDE_APP" >/dev/null 2>&1; then
  info "Removing quarantine attribute..."
  sudo xattr -dr com.apple.quarantine "$CLAUDE_APP"
  ok "Quarantine cleared"
fi

# ----- done -----
echo
printf '%s%sDone.%s\n' "$BOLD" "$GREEN" "$NC"
echo
echo "Next steps:"
echo "  1. Quit Claude Desktop completely (⌘Q — not just close the window)."
echo "  2. Reopen Claude Desktop."
echo "  3. Type or paste Hebrew text and check that it renders RTL."
echo
echo "Note: Claude Desktop auto-updates from time to time. Each update will"
echo "      overwrite this patch. Just re-run ./install.sh after an update."
echo
echo "To uninstall: ./uninstall.sh"
