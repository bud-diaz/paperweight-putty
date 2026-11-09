# Changelog

## Unreleased

- Added reactive directional, pressed, lifted, impact, and rebound Node poses
  without changing the stable drag/input allocation.
- Added five generated material palettes, adaptive Node sizing, motion policy,
  connector bridges, cancelable panel transitions, and deterministic assets.
- Added GTK4/Libadwaita preferences and a system-wide GNOME Favorites editor.
- Added keyboard navigation, focus indicators, scrollable large app sets, and
  synchronous modal/transition teardown.
- Fixed panel-level press interception that prevented application buttons from
  activating on Shell 50, and only auto-focus the first tile for keyboard opens.
- Restored outside-click dismissal for modal grabs that report an underlying
  desktop source, and initialize reveal transforms before painting to avoid a
  panel-opening flash.
- Use direct primary-press and explicit keyboard activation for panel controls,
  releasing the modal before launching Shell actions.
- Expanded pure unit coverage and CI validation for schemas and generated SVGs.

## 0.1.0

Initial release.

- Floating, draggable, collapsible Node that replaces Ubuntu Dock.
- Tap-to-expand panel listing favorites + running apps, with automatic
  4-direction flip to stay on screen.
- Automatically disables/restores Ubuntu Dock, without overriding a
  choice you made yourself.
- Node position persisted per-monitor across logins.
