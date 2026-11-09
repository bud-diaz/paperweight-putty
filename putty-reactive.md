Paperweight: Putty — Reactive Clay UI Implementation Plan

1. Current repository baseline

The repository already has a strong separation between behavior and presentation:

extension.js owns lifecycle, monitor selection, position persistence, and Ubuntu Dock ownership.

node.js implements click-versus-drag interaction.

panel.js owns the full-stage modal root, outside-click dismissal, Escape handling, application discovery, and activation.

nodePosition.js contains testable geometry and four-direction panel placement.

dockOwnership.js protects the existing Ubuntu Dock restoration contract.

theme.js, stylesheet.css, and generate-blob-svgs.mjs already generate the organic node and flattened panel assets.

The extension targets GNOME Shell 50 and currently has no prefs.js. Its schema only stores position and Ubuntu Dock ownership state.

The current 450×230 panel asset must match its actor allocation because Shell does not reliably stretch the SVG background. That constraint should remain explicit.

The redesign should therefore extend the existing architecture—not replace it.

2. Core behavior contract

The following behavior must remain invariant throughout implementation:

The existing eight-pixel threshold distinguishes clicking from dragging.

Dragging changes only the node’s logical position.

Position remains normalized and associated with a stable monitor connector.

Panel placement remains work-area-aware and chooses left, right, above, or below.

Favorites continue to come from GNOME’s existing favorites model.

Running applications remain deduplicated against favorites.

Application activation and “Show Apps” retain their current entry points.

The full-stage modal root remains responsible for outside-click dismissal.

Escape and clicking the node area close the panel.

Ubuntu Dock ownership logic remains untouched except for additional regression tests.

Disable must synchronously remove actors, signal handlers, modal grabs, transitions, and pending callbacks.

3. Refined visual direction

Collapsed node

Use a stable invisible input actor containing a separately deformable visual actor.

Default visible material: 64×60 px.

Minimum interactive region: 64×64 px.

Upper-left soft highlight, lower-right body shadow, two restrained surface depressions.

Asymmetrical outline remains recognizable at every scale.

No continuous idle animation.

Generate a small bank of pre-rendered SVG poses:

Neutral

Eight directional bulge poses

Pressed/squashed

Lifted

Impact/plop

The pointer selects a directional pose by angle. The outline should change in discrete, slightly stepped increments while translation and scale remain softly eased. This creates a claymation character without making the node feel laggy.

Pointer and drag responses

State	Visual response
Rest	Neutral pose, scale 1.0
Hover	Lean 1–2 px toward pointer, scale about 1.025, directional pose
Pressed	Width about 1.05, height about 0.93, move down 1 px
Dragging	Scale about 1.06, lift 2–3 px, softer/larger shadow
Direction change	Switch between directional poses with angular hysteresis
Release	Short squash, small rebound, then neutral
Panel open	Node remains visible at the attachment point
Suggested plop sequence:

Impact: 60–80 ms, wider and flatter.

Rebound: 70–90 ms, slightly tall.

Settle: 100–130 ms back to neutral.

A new press must cancel this sequence immediately and deterministically.

Stop-motion character

Process pointer-shape changes at no more than approximately 12 Hz.

Update only while the pointer is interacting with the node.

Use angular and distance hysteresis to prevent pose flicker.

Do not run an idle timer.

Keep deformation subtle enough that the cursor never appears detached from the object.

Expanded panel

Keep the panel and node as separate actors but visually join them with a small generated “neck” or overlapping bridge.

Bridge orientation follows the placement result from computePanelPlacement().

The bridge renders below the node and panel so there is no visible seam.

The node remains visually intact and recognizable.

Panel expansion originates from the attachment side.

Icons appear only after the material has substantially flattened.

Application tiles should feel pressed into the putty:

Hover: icon rises approximately 3–4%, with a soft localized highlight.

Press: icon compresses briefly toward the panel.

Keyboard focus: strong, clearly visible organic ring.

Avoid rectangular hover fills.

The settings gear should sit inside the panel’s safe content inset, preferably at its upper-right visual edge. Use a small symbolic gear but retain at least a 36×36 px target.

4. Recommended rendering strategy

Continue using generated SVG assets. Do not introduce procedural drawing, an HTML renderer, or a per-frame canvas.

Recommended generated assets:

node-{palette}-{pose}.svg

panel-{palette}.svg

bridge-{palette}-{side}.svg

Optional small tile-indentation/highlight asset

Only the active palette’s node poses should be loaded. Reuse those textures rather than constructing an SVG or changing file content on every pointer event.

Keep the visual SVG actor at its native 64×60 size. Apply node-size customization through compositor scaling. The stable wrapper’s allocation should reflect the scaled visual bounds and remain at least 64×64, so hit testing, clamping, and panel anchoring stay correct.

5. GNOME-specific architecture

extension.js

Continue using it as the composition root:

Read settings.

Construct Node and Panel.

Pass openPreferences() to the panel.

Subscribe to appearance-setting changes.

Apply palette and scale updates.

Disconnect every settings signal during disable.

Preserve all Ubuntu Dock code unchanged.

Opening preferences from the gear should follow this sequence:

Close the panel and release its modal grab.

Invoke this.openPreferences().

Do not leave an invisible modal actor behind.

GNOME’s supported extension API provides openPreferences(), and preferences run separately from the Shell process. GNOME preferences documentation

node.js

Refactor into two layers:

Stable input/position wrapper

Deformable visual child

Only the visual child receives pose, scale, translation, and shadow animation. The wrapper continues to own:

Screen position

Drag coordinates

Work-area clamping

Focus and accessibility

Click-versus-drag logic

getRect()

This separation is the principal safeguard against deformation corrupting drag math.

panel.js

Preserve the existing full-stage modal-root design. Internally separate:

Modal root

Bridge material

Panel material

Content layer

Focusable controls

Add explicit states: closed, opening, open, and closing. Every transition should be cancelable, and forceClose() should synchronously restore a clean state during extension disable.

prefs.js

Add a standard GTK4/Libadwaita preferences window using ExtensionPreferences.

Preferences run outside GNOME Shell, so prefs.js must not import St, Clutter, Shell, or Main. It should use Adwaita/GTK for UI and Gio.Settings for communication. GNOME preferences architecture

Suggested sections:

Appearance

Putty palette

Node size

Motion

Follow system

Reduced

Off

Favorite applications

Reorder

Add

Remove

About/reset

Favorites customization

Do not introduce a second Putty-only favorites list. The panel currently reflects GNOME favorites, so preferences should edit GNOME’s existing ordered favorite-apps setting.

The UI must clearly say that these are system-wide GNOME Favorites and changes also affect the Overview and other components that use that list.

The preferences process can enumerate desktop applications with Gio.AppInfo, present a searchable chooser, then update the ordered string array atomically.

6. Settings model

Add these extension settings:

putty-palette: string, default plum

node-scale: double, recommended range 0.85–1.50

motion-style: string, values system, reduced, or off

Do not add a Putty favorites key.

For GNOME Shell 50:

system should honor St.Settings.get().enable_animations.

reduced should remove directional stretch and elastic rebound, retaining only a short fade or simple scale.

off should apply final states immediately.

GNOME 51 adds a more explicit reduced-motion property, but the extension currently targets Shell 50, so implementation must not depend on the Shell 51 API. St settings reference

7. Palette customization

Begin with curated palettes rather than an arbitrary color picker. The present SVG pipeline is static and verified; free-form runtime SVG generation would introduce caching, write-location, and texture-lifecycle risks.

Suggested initial palettes:

Plum — current identity

Terracotta — warm modeling clay

Moss — muted green putty

Ocean — cool blue putty

High Contrast — deliberately stronger edge and focus treatment

Evolve theme.js from individual constants into palette records containing:

Base

Highlight

Shadow

Deep shadow

Primary text

Secondary text

Focus color

Running indicator

The asset generator should create every palette deterministically.

Do not assume white text works on every palette. Validate each palette’s declared text color against the panel’s representative center fill, and provide a high-contrast fallback.

8. Phased Codex implementation

Phase 1 — Interaction-safe actor foundation

Introduce the stable wrapper/deformable-child split in node.js.

Preserve the current neutral SVG and appearance.

Move size calculations into a pure helper.

Ensure clamping and getRect() use wrapper bounds.

Add keyboard activation with Enter and Space.

Add accessible role and name.

Confirm all existing tests and manual behavior remain unchanged.

Checkpoint: zero intended visual difference.

Phase 2 — Preferences and live appearance settings

Add schema keys and prefs.js.

Add palette selection, node-size control, and motion setting.

Add the settings gear to the panel.

Implement the GNOME Favorites editor.

Connect appearance-setting signals in extension.js.

Re-center and clamp the node safely when its scale changes.

Add generated palette assets.

Checkpoint: configuration works without animation.

Phase 3 — Pointer-reactive node

Extend the SVG generator with directional, pressed, lifted, and impact poses.

Add an explicit node interaction state controller.

Quantize directional pose changes.

Add hover, press, lift, drag, and plop responses.

Ensure transformations affect only the visual child.

Cancel transitions on new input and extension disable.

Add reduced/off motion paths.

Checkpoint: dragging and saved coordinates exactly match the neutral implementation.

Phase 4 — Adaptive panel and accessibility

Convert application tiles and gear into proper focusable buttons.

Add accessible labels and logical Tab order.

Focus the first application when opening.

Restore focus to the node when closing.

Ellipsize long labels and provide tooltips.

Constrain content to the panel’s safe irregular inset.

Add scrolling or paging when favorites exceed the fixed canvas capacity.

Test increased text scaling without growing the SVG-backed panel beyond its asset.

Checkpoint: all applications remain reachable by pointer and keyboard.

Phase 5 — Material connection and panel transition

Generate four directional bridge assets.

Return attachment geometry with the panel placement result.

Reveal the panel from the node-facing side using scale, translation, and opacity.

Fade/scale icons in after the material reveal begins.

Reverse the sequence on close.

Keep the modal grab active until close completes to prevent click-through.

Make rapid toggle input settle into a deterministic final state.

Checkpoint: node and panel read as one material without merging their hit-testing or geometry.

Phase 6 — Hardening and release validation

Add deterministic asset-generation checking.

Complete performance, accessibility, monitor, and lifecycle tests.

Update README screenshots or animation after final live verification.

Document palette generation and the separate preferences process.

Record any Shell 50-specific limitations honestly.

9. Tests and safeguards

Pure unit tests

Add coverage for:

Node scale-to-wrapper geometry

Center preservation when scale changes

Placement with every supported node scale

Bridge orientation and attachment point

Interaction-state transitions

Interrupted plop/open/close sequences

Motion-policy selection

Palette-name fallback

Favorite ordering, deduplication, add, and removal

Existing Dock ownership paths

Prefer pure helper tests over additional regex assertions against source text.

CI

Extend the existing workflow to run:

npm test

xmllint on schemas and generated SVGs

glib-compile-schemas against the schema directory

JavaScript syntax checks

Asset-generator check mode that fails when committed SVGs differ from generated output

GNOME Shell 50 manual matrix

Validate:

Four monitor corners and four panel directions

Multi-monitor connector persistence

Monitor removal and reconnection

100%, fractional, and 200% scaling where available

Small, default, and maximum node sizes

Few, many, and zero favorites

Long localized application names

Running-only application deduplication

Gear → preferences modal handoff

Favorite reordering

Keyboard-only navigation

Orca announcements

High-contrast mode

Animations enabled and disabled

Rapid click/open/close interruption

Repeated extension enable/disable

Ubuntu Dock initially enabled

Ubuntu Dock initially disabled

Real Wayland login-cycle verification

The repository’s existing Wayland/module-cache and modal-grab lessons should continue to guide testing. HANDOFF.md

10. Performance rules

No idle animation loop.

No per-frame SVG generation.

No layout mutation during deformation.

Pointer pose changes capped and event-driven.

Animate compositor properties: opacity, scale, and translation.

Reuse pose textures.

Keep the node’s input allocation stable during interaction.

Cancel all transitions before beginning a conflicting transition.

Pop modal grabs exactly once.

Clear signals, callbacks, and temporary actors on disable.

Avoid animating panel width or height because its SVG canvas and actor allocation must remain synchronized.

11. Completion criteria

Implementation is complete when:

The node visibly reacts to pointer direction without cursor detachment.

Dragging produces a clear lift and release produces a restrained plop.

The panel appears connected to and formed from the node.

Settings can change palette and node size and edit GNOME Favorites.

All pointer, keyboard, dismissal, placement, persistence, and Dock behaviors remain intact.

Reduced/off motion paths are functional on GNOME Shell 50.

The panel remains usable with long labels and large favorite sets.

Repeated animation interruption and enable/disable cycles leave no actors, grabs, signals, or transitions behind.

Unit tests, schema validation, deterministic asset checks, and the GNOME 50 manual matrix pass.
