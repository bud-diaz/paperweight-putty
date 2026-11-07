#!/usr/bin/env bash
# Dev install: compiles the schema and symlinks this repo into the user's
# GNOME Shell extensions directory. Safe to re-run.
set -euo pipefail

UUID="putty@paperweighthq.com"
OLD_UUID="dock-node@local"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"
TARGET="$EXT_DIR/$UUID"

echo "==> Compiling GSettings schema"
glib-compile-schemas "$REPO_DIR/schemas/"

mkdir -p "$EXT_DIR"

if [ -e "$EXT_DIR/$OLD_UUID" ]; then
  echo "==> Removing stale $OLD_UUID install"
  rm -rf "$EXT_DIR/$OLD_UUID"
fi

if [ -L "$TARGET" ] || [ -e "$TARGET" ]; then
  echo "==> Removing existing $TARGET"
  rm -rf "$TARGET"
fi

echo "==> Symlinking $TARGET -> $REPO_DIR"
ln -s "$REPO_DIR" "$TARGET"

echo "==> Done."
echo "If this is the first install, GNOME Shell on Wayland needs a"
echo "logout/login before it can see the new extension directory. After"
echo "that: gnome-extensions enable $UUID"
