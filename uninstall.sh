#!/usr/bin/env bash
# claude-desktop-rtl-mac — uninstall
# Restores Claude Desktop's original app.asar from the backup created by
# install.sh.

set -euo pipefail

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

if [[ "$(uname -s)" != "Darwin" ]]; then
  err "This script is for macOS only."
  exit 1
fi

CANDIDATES=(
  "/Applications/Claude.app"
  "$HOME/Applications/Claude.app"
)

CLAUDE_APP=""
for c in "${CANDIDATES[@]}"; do
  if [[ -d "$c" ]]; then CLAUDE_APP="$c"; break; fi
done

if [[ -z "$CLAUDE_APP" ]]; then
  err "Claude.app not found."
  exit 1
fi

ASAR_PATH="$CLAUDE_APP/Contents/Resources/app.asar"
BACKUP_PATH="$ASAR_PATH.original"
INFO_PLIST="$CLAUDE_APP/Contents/Info.plist"
INFO_PLIST_BACKUP="$INFO_PLIST.original"

if [[ ! -f "$BACKUP_PATH" ]]; then
  err "No backup found at $BACKUP_PATH"
  err "Either the patch was never installed, or the backup was deleted."
  err "If Claude Desktop is broken, reinstall it from https://claude.ai/download"
  exit 1
fi

ok "Found backup at $BACKUP_PATH"

USE_SUDO=0
run_privileged() {
  if [[ "$USE_SUDO" -eq 1 ]]; then
    sudo "$@"
  else
    "$@"
  fi
}

if [[ ! -w "$ASAR_PATH" || ! -w "$INFO_PLIST" || ! -w "$(dirname "$ASAR_PATH")" || ! -w "$(dirname "$INFO_PLIST")" ]]; then
  USE_SUDO=1
  info "Restoring Claude.app requires admin privileges. You may be prompted for your password."
  sudo -v
else
  ok "Claude.app is writable by the current user; no admin password needed"
fi

info "Restoring original app.asar..."
run_privileged cp "$BACKUP_PATH" "$ASAR_PATH"
ok "Restored"

if [[ -f "$INFO_PLIST_BACKUP" ]]; then
  info "Restoring original Info.plist..."
  run_privileged cp "$INFO_PLIST_BACKUP" "$INFO_PLIST"
  ok "Info.plist restored"
else
  warn "No Info.plist backup found — leaving current Info.plist in place"
fi

info "Re-signing Claude.app..."
run_privileged codesign --force --deep --sign - "$CLAUDE_APP" 2>/dev/null || true
ok "Signed"

read -r -p "Delete backup file? [y/N] " reply
if [[ "$reply" =~ ^[Yy]$ ]]; then
  run_privileged rm -f "$BACKUP_PATH"
  run_privileged rm -f "$INFO_PLIST_BACKUP"
  ok "Backup deleted"
else
  warn "Backup kept at $BACKUP_PATH"
fi

echo
printf '%s%sDone.%s\n' "$BOLD" "$GREEN" "$NC"
echo "Quit Claude Desktop (⌘Q) and reopen it to load the original UI."
