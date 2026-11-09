# Paperweight: Putty

A floating, draggable, collapsible **Node** for GNOME Shell that replaces the
Ubuntu Dock with a small circular button you can drop anywhere on screen.
Tap it to expand a small panel listing your favorite and running apps; tap
again (or click outside, or press Escape) to collapse it back down.

![screenshot TODO](docs/screenshot.png)
<!-- TODO: add a real screenshot/gif once this has been exercised live. -->

## What it does

- A small organic **Node** floats over your desktop. Drag it anywhere;
  it remembers where you left it (per-monitor, by stable monitor connector
  name) across logins.
- A plain click/tap expands a panel anchored near the Node, listing your
  pinned favorites plus any currently-running apps — click one to launch
  or focus it.
- The panel automatically flips up/down/left/right so it never runs off
  the edge of the screen, no matter which corner the Node is parked in.
- Click outside the panel, press Escape, or tap the Node again to collapse
  it.
- The Node leans toward the pointer, lifts while dragging, and settles with
  a restrained plop. A generated bridge visually joins it to the panel.
- Preferences provide five curated palettes, 85–150% Node sizing, motion
  controls, and an editor for the existing system-wide GNOME Favorites list.
- Enabling Putty disables Ubuntu Dock (`ubuntu-dock@ubuntu.com`) so there's
  exactly one dock-like element on screen. Disabling Putty restores Ubuntu
  Dock to whatever state it was actually in before (it won't resurrect a
  choice you made yourself — e.g. if you'd already turned Ubuntu Dock off
  before enabling Putty, disabling Putty leaves it off).

## Requirements

- GNOME Shell 50+ (tested on 50.1, Wayland).
- Ubuntu Dock installed (standard on Ubuntu) if you want the auto
  disable/restore behavior; Putty still works without it, it just has
  nothing to hand control back to.

## Install (from source)

```sh
git clone https://github.com/bud-diaz/paperweight-putty.git
cd paperweight-putty
./scripts/install-dev.sh
```

This compiles the GSettings schema and symlinks the repo into
`~/.local/share/gnome-shell/extensions/putty@paperweighthq.com`.

**Wayland cannot discover a brand-new extension directory without a
logout/login** — this is a GNOME Shell limitation, not a Putty bug. After
the first install, log out and back in, then:

```sh
gnome-extensions enable putty@paperweighthq.com
```

Any later edits to the source are picked up by the existing symlink; you
only need to re-run `install-dev.sh` if the schema itself changes
(`glib-compile-schemas schemas/` is enough on its own for that case).

## Development

```sh
npm test          # runs the pure-logic unit tests (no GNOME Shell needed)
npm run validate  # tests, JS syntax, and deterministic generated-asset check
npm run generate:assets  # regenerate palette, pose, panel, and bridge SVGs
npm run pack      # build a complete extension archive in dist/
```

The drag/clamp/panel-placement math (`nodePosition.js`) and the Ubuntu
Dock ownership decision logic (`dockOwnership.js`) are plain JS modules
with zero GNOME imports, specifically so they can be unit tested outside
GNOME Shell. Everything that actually touches the Shell (`extension.js`,
`node.js`, `panel.js`) is kept thin and only wires those modules up.

The Node textures always retain their native 64×60 canvas. Size preferences
use compositor scaling inside a stable wrapper whose hit target never drops
below 64×64. Likewise, every panel actor remains exactly 450×230 because Shell
does not reliably stretch the SVG background; additional apps are made
reachable with an internal vertical scroller rather than by growing the asset.

Preferences run in their separate GTK4/Libadwaita process (`prefs.js`) and do
not import Shell, St, or Clutter. Favorite edits update GNOME's ordered
`favorite-apps` setting—Putty deliberately does not maintain a second list.

## License

GPL-2.0-or-later — see [LICENSE](LICENSE). GNOME Shell extensions are
derivative works of GNOME Shell, which is itself GPL-2.0-or-later.
