Paperweight: Putty
Organic Node & Flattened Panel UI Redesign
Objective
Redesign the existing Paperweight: Putty GNOME Shell extension to replace its generic circular floating Node and conventional application panel with a distinctive, organic, putty-inspired interface.
The central design concept:
Putty should look and behave like a small piece of soft, malleable material resting on the desktop.
When collapsed, it resembles a small, irregular blob of putty.
When expanded, it visually transforms into a larger, flattened piece of putty containing the user’s favorite and running applications.
The result should feel playful, tactile, polished, and unmistakably different from a traditional desktop dock.
Important: This is a visual and interaction redesign, not a rewrite of the extension. Preserve existing functionality unless a change is explicitly required below.
 
⸻
 
1. Initial Codebase Assessment
Before implementing anything:
1. Inspect the existing GNOME Shell extension architecture.
2. Identify the current Node actor, expanded panel, positioning logic, and event handlers.
3. Identify the existing styling system and stylesheet.
4. Review GNOME Shell version compatibility.
5. Identify how monitor positioning and connector-based persistence work.
6. Review the existing Ubuntu Dock disable/restore implementation.
7. Identify how favorites, running applications, and application activation are currently handled.
Reuse existing infrastructure wherever practical.
Do not introduce unnecessary dependencies or replace working functionality merely to accommodate the redesign.
Create a short implementation plan before making changes.
 
⸻
 
2. Visual Design Language
Theme: Soft Sculpted Putty
The interface should resemble a physical piece of soft modeling putty.
Primary characteristics
* Organic, asymmetrical silhouettes
* Smooth, irregular edges
* Subtle surface depressions
* Rounded protrusions
* Soft dimensional shading
* Gentle highlights
* Diffuse contact shadows
* Slightly imperfect geometry
* No sharp corners
* No conventional rectangular panel outlines
The visual language should suggest a soft material that can be pressed, stretched, and flattened.
Avoid making Putty look like a generic glassmorphism widget, rounded rectangle, or conventional floating dock.
Default color palette
Use the following colors as initial design targets:
Element	Color
Putty base	#A878C8
Putty highlight	#C9A2E1
Putty shadow	#76518F
Deep surface shadow	#563A6B
Primary text	#FFFFFF
Secondary text	#E8D9F0
Running indicator	#FFFFFF
The material should use subtle tonal variation rather than a completely flat fill.
Colors must be centralized so additional Putty themes can be introduced later.
Do not hardcode colors throughout the application logic.
 
⸻
 
3. Collapsed State: The Putty Node
3.1 Shape
Replace the existing circular Node with an irregular, three-dimensional blob.
Target dimensions:
* Default width: 64px
* Default height: 60px
* Minimum interactive hit target: 64 × 64px
* Configurable scale for future accessibility support
The blob should be approximately circular but visibly imperfect.
Shape characteristics
* Slightly asymmetrical perimeter
* Soft, rounded protrusions
* Minor indentations along the edges
* Uneven surface curvature
* No perfectly circular outline
* No hard border
The silhouette should resemble a small ball of putty that has been lightly squeezed.
Avoid excessive distortion that makes the Node look damaged or unrecognizable.
3.2 Surface Treatment
Create the illusion of depth using:
* A soft highlight toward the upper-left
* A darker lower-right region
* Subtle internal shadowing
* Two or three shallow surface depressions
* A diffuse shadow beneath the Node
The surface should feel matte or satin rather than glossy plastic.
Avoid excessive shine.
3.3 Interaction
Preserve the existing interaction model.
Click/tap: Expand the application panel.
Drag: Move the Node freely around the desktop.
Release: Save its position using the existing monitor-aware persistence system.
Drag feedback
During dragging:
* Slightly increase the Node’s scale to approximately 1.05.
* Increase its shadow softness.
* Optionally apply subtle elastic deformation.
* Return to the resting appearance when released.
Drag feedback must not interfere with pointer coordinates or position persistence.
The visual actor and interactive hit region should remain correctly aligned.
 
⸻
 
4. Expanded State: Flattened Putty Panel
4.1 Overall Appearance
Replace the existing conventional application panel with a larger, irregular, flattened blob.
The expanded panel should resemble the collapsed Node after being pressed flat against the desktop.
Think of a piece of modeling clay flattened by someone’s palm.
Target dimensions
For the initial horizontal layout:
* Preferred width: 450px
* Preferred height: 230px
* Internal content padding: approximately 28px
* Minimum screen-edge margin: 12px
These dimensions are starting targets, not fixed constraints.
The panel must adapt to available monitor space and application count.
4.2 Silhouette
The expanded panel must not be a rounded rectangle.
Its perimeter should feature:
* Gently undulating edges
* Slightly uneven top and bottom boundaries
* Soft asymmetrical corners
* Occasional shallow indentations
* Rounded outward bulges
Keep the silhouette restrained enough that application icons remain easy to align and interact with.
Critical distinction
The content layout can use a conventional internal grid.
The visible outer material must remain organic.
The user should perceive a flattened piece of putty containing application icons, not a standard panel with unusually rounded corners.
4.3 Material
Use the same material treatment as the collapsed Node.
Include:
* Subtle highlights
* Soft dimensional shading
* Mild surface irregularities
* Diffuse shadows
* Slightly darker edges where appropriate
The panel should appear thicker around its perimeter and flatter toward its center.
Maintain enough contrast for icons and labels to remain legible.
 
⸻
 
5. Node-to-Panel Relationship
The expanded panel should feel physically connected to the Node.
The design should communicate that both elements are made from the same material.
Preferred behavior
When expanded:
1. The Node remains visible near the panel’s attachment point.
2. The panel appears to emerge from or stretch outward from the Node.
3. The Node and panel use matching colors and surface treatment.
4. The transition reinforces the impression of soft material changing shape.
The Node should not look like an unrelated floating button beside a separate window.
Connection treatment
Use a small organic connection or overlapping material region where appropriate.
Avoid obvious rectangular seams.
The Node must remain independently clickable to collapse the panel.
 
⸻
 
6. Application Layout
Preserve the existing favorites and running-app discovery behavior.
Favorites
Display pinned applications in the upper portion of the flattened panel.
Each application should include:
* Its existing application icon
* An optional readable label
* Appropriate hover feedback
* A sufficiently large click target
Use GNOME’s existing application icon infrastructure.
Do not recreate application icons.
Running Applications
Display running applications beneath the favorites.
Include a subtle separator or visual distinction between the two groups.
Use a small white indicator beneath running applications when appropriate.
Duplicate handling
Preserve the existing behavior for applications that are both favorites and currently running.
Do not introduce duplicate icons unless the existing extension intentionally supports them.
Layout behavior
The application layout must adapt to:
* Different numbers of favorites
* Different numbers of running applications
* Smaller monitors
* Different display scaling factors
* Long application names
* Accessibility text scaling
Avoid clipping icons or placing interactive content outside the organic panel.
If necessary, support multiple rows, scrolling, or compact layouts.
 
⸻
 
7. Expansion & Collapse Animations
The transition should visually resemble putty being flattened and reformed.
Expansion
Target duration: 240–320ms.
Suggested sequence:
1. The Node subtly compresses.
2. The putty surface stretches toward the selected panel direction.
3. The flattened panel expands into its final shape.
4. Application icons fade and scale into view.
5. The surface settles with a subtle elastic effect.
Avoid exaggerated bouncing.
The animation should feel soft and deliberate.
Collapse
Target duration: 200–280ms.
Suggested sequence:
1. Application icons fade out.
2. The flattened panel contracts toward the Node.
3. The material visually gathers into the smaller blob.
4. The Node returns to its resting dimensions.
The collapse animation should reverse the visual logic of expansion.
Animation requirements
* Prefer compositor-friendly transformations.
* Avoid unnecessary per-frame layout recalculation.
* Avoid blocking the GNOME Shell main thread.
* Respect reduced-motion preferences.
* Prevent rapid repeated clicks from corrupting animation state.
* Ensure the final actor state is correct if an animation is interrupted.
Reduced motion
When reduced motion is enabled:
* Disable elastic deformation.
* Use a brief fade or immediate transition.
* Preserve all functionality.
 
⸻
 
8. Monitor-Aware Positioning
Preserve the existing monitor-aware positioning system.
The expanded panel must remain visible regardless of where the Node is placed.
Positioning priorities
1. Prefer expanding toward available screen space.
2. Avoid crossing monitor boundaries.
3. Respect monitor work areas.
4. Avoid clipping the organic panel silhouette.
5. Keep the Node accessible.
6. Recalculate placement when the monitor configuration changes.
Examples
Node near right edge: Expand left.
Node near left edge: Expand right.
Node near bottom edge: Expand upward.
Node near top edge: Expand downward.
Node near a corner: Choose the direction offering the most usable space.
Use the actual rendered bounds of the organic panel when calculating placement.
Do not assume its visible silhouette matches a conventional rectangle, although a rectangular bounding box may be used for safe placement calculations.
Preserve saved Node positions using stable monitor connector identifiers.
 
⸻
 
9. Hover, Focus & Press Feedback
Collapsed Node
Hover:
* Slight increase in brightness
* Subtle shadow adjustment
* Optional 1.03 scale
Pressed:
* Slight compression
* Minor reduction in height
* Increased surface depression
Dragging:
* Slight stretching or deformation
* Stronger elevation shadow
Expanded Panel
Application icons should respond to interaction.
Hover:
* Subtle icon scaling
* Soft localized highlight
* Optional application tooltip
Pressed:
* Brief compression
* Immediate activation feedback
Avoid conventional rectangular hover backgrounds that visually conflict with the putty material.
Keyboard focus indicators must remain clearly visible.
 
⸻
 
10. Rendering Strategy
Choose a rendering strategy appropriate for the installed GNOME Shell version.
Preferred approaches include:
* SVG-based organic shapes
* GNOME Shell-compatible Clutter/St rendering
* Pre-rendered scalable assets
* Carefully implemented custom drawing where supported
The Node and panel may use separate scalable visual assets.
However, their material treatment must remain consistent.
Important technical constraints
Do not assume GNOME Shell supports arbitrary browser CSS.
In particular:
* Do not rely on unsupported CSS filters.
* Do not assume browser-style SVG filters work inside Shell actors.
* Do not introduce Electron, WebKit, or an HTML renderer.
* Do not use expensive CPU-driven animation loops.
* Do not introduce external runtime dependencies without justification.
If SVG is selected, verify compatibility with the GNOME Shell asset-loading pipeline.
Prefer a maintainable implementation over a visually elaborate but fragile one.
Shape accuracy
A rounded rectangle with a large border radius is not an acceptable substitute for the organic panel.
The final implementation must have a genuinely irregular visible silhouette.
 
⸻
 
11. Preserve Existing Functionality
The following behaviors must remain intact:
* Draggable floating Node
* Saved position across logins
* Per-monitor positioning
* Stable monitor connector identification
* Favorites discovery
* Running-app discovery
* Application launching
* Application focusing
* Click-to-expand
* Click-to-collapse
* Outside-click dismissal
* Escape-key dismissal
* Automatic panel direction selection
* Ubuntu Dock disable behavior
* Ubuntu Dock state restoration
* Extension enable/disable lifecycle
Ubuntu Dock restoration
This behavior is especially important.
Putty must restore Ubuntu Dock to its actual previous state.
If Ubuntu Dock was disabled before Putty was enabled, disabling Putty must leave Ubuntu Dock disabled.
Do not simplify or regress this behavior.
 
⸻
 
12. Performance & Reliability
Putty should remain lightweight.
The redesign must not introduce noticeable desktop lag.
Requirements
* No continuous animation while idle.
* No unnecessary redraw loops.
* No persistent high-frequency timers.
* Avoid excessive texture allocations.
* Reuse visual assets where practical.
* Clean up actors, signals, and timeouts on disable.
* Avoid memory leaks during repeated expansion and collapse.
* Handle monitor hot-plugging safely.
* Handle GNOME Shell scaling correctly.
Use the compositor for animations wherever possible.
 
⸻
 
13. Accessibility
Maintain accessible interaction targets and navigation.
Requirements:
* Keyboard-accessible Node
* Visible focus states
* Escape-key dismissal
* Accessible application labels
* Sufficient text contrast
* Reduced-motion support
* Reasonable behavior with increased text scaling
The irregular visual shape must not reduce usability.
Use a reliable interactive hit area even when the visible silhouette contains indentations.
 
⸻
 
14. Implementation Phases
Implement the redesign incrementally.
Phase 1: Visual Foundation
* Create the organic Node silhouette.
* Apply dimensional putty shading.
* Create the flattened panel silhouette.
* Establish reusable color and material definitions.
Phase 2: Layout Integration
* Integrate existing application icons.
* Implement adaptive content positioning.
* Connect the Node and expanded panel visually.
* Preserve existing application behavior.
Phase 3: Interaction & Animation
* Add expansion animation.
* Add collapse animation.
* Add hover and press feedback.
* Add optional drag deformation.
* Implement interruption-safe animation handling.
Phase 4: Positioning & Compatibility
* Verify monitor-edge behavior.
* Verify scaling.
* Verify connector-based persistence.
* Verify extension lifecycle.
* Verify Ubuntu Dock restoration.
Phase 5: Refinement
* Tune surface shading.
* Refine organic silhouettes.
* Adjust animation timing.
* Improve icon spacing.
* Optimize performance.
* Test accessibility behavior.
 
⸻
 
15. Acceptance Criteria
The implementation is complete when:
1. The collapsed Node visibly resembles an irregular blob of putty.
2. The expanded panel visibly resembles a flattened piece of the same material.
3. Both elements share a consistent visual identity.
4. The panel is not simply a rounded rectangle.
5. Expansion and collapse feel like soft material changing shape.
6. Application icons remain readable and functional.
7. Dragging remains smooth and accurate.
8. Saved positions survive extension restarts and desktop logins.
9. The expanded panel remains inside the available monitor work area.
10. All existing dismissal methods continue working.
11. Ubuntu Dock restoration remains correct.
12. No significant performance regressions are introduced.
13. Reduced-motion preferences are respected.
14. The extension can be repeatedly enabled and disabled without errors or leftover actors.
 
⸻
 
16. Deliverables
Provide:
1. Updated GNOME Shell extension source code.
2. Updated stylesheet and visual assets.
3. Any necessary resource-loading changes.
4. A concise summary of modified files.
5. An explanation of the selected rendering strategy.
6. A list of preserved behaviors.
7. Testing results and any unresolved compatibility limitations.
Do not claim testing was completed unless it was actually performed.
 
⸻
 
17. Final Design Direction
The goal is not simply to make the existing dock prettier.
The goal is to establish a recognizable visual identity for Paperweight: Putty.
The collapsed Node should look like a small piece of putty sitting on the desktop.
The expanded panel should look like that same material pressed into a functional application launcher.
The experience should feel:
Soft. Organic. Tactile. Minimal. Playful. Functional.
Prioritize visual cohesion, reliable GNOME Shell integration, and preservation of existing functionality.
Use the supplied UI mockup as the primary visual reference.
Where the mockup and implementation requirements differ, preserve functional correctness while matching the visual appearance as closely as the platform allows.
Do not replace the existing extension with a new implementation unless a specific architectural limitation makes that unavoidable.


## 
start with SVG assets for the putty silhouettes, rather than attempting to procedurally render everything.

##
prioritize getting the shapes, shading, and transitions right. The elastic stretching effects can come afterward.

##
keep the collapsed Node and expanded panel as separate actors, even though they should appear to be one continuous piece of material. That separation makes positioning, hit detection, and animation much easier to manage.
