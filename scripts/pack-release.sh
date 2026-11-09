#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${1:-$REPO_DIR/dist}"

mkdir -p "$OUT_DIR"
cd "$REPO_DIR"

gnome-extensions pack --force --out-dir="$OUT_DIR" \
  --extra-source=assets \
  --extra-source=node.js \
  --extra-source=panel.js \
  --extra-source=nodePosition.js \
  --extra-source=nodeInteraction.js \
  --extra-source=panelState.js \
  --extra-source=motion.js \
  --extra-source=favorites.js \
  --extra-source=theme.js \
  .
