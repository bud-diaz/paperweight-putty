# Changelog

## Unreleased

- Added reactive directional, pressed, lifted, impact, and rebound Node poses
  without changing the stable drag/input allocation.
- Added five generated material palettes, adaptive Node sizing, motion policy,
  connector bridges, cancelable panel transitions, and deterministic assets.
- Added GTK4/Libadwaita preferences and a system-wide GNOME Favorites editor.
- Added keyboard navigation, focus indicators, scrollable large app sets, and
  synchronous modal/transition teardown.
- Expanded pure unit coverage and CI validation for schemas and generated SVGs.

## 0.1.0

Initial release.

- Floating, draggable, collapsible Node that replaces Ubuntu Dock.
- Tap-to-expand panel listing favorites + running apps, with automatic
  4-direction flip to stay on screen.
- Automatically disables/restores Ubuntu Dock, without overriding a
  choice you made yourself.
- Node position persisted per-monitor across logins.
