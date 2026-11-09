// Pure geometry helpers: no GNOME/GJS imports, unit-testable with plain `node --test`.

export const DRAG_THRESHOLD_PX = 8;
// These match the generated SVG canvases exactly (node-default.svg /
// panel-default.svg, see scripts/generate-blob-svgs.mjs) -- the panel's
// St.Bin is sized to PANEL_WIDTH/PANEL_HEIGHT rather than derived from its
// content, because St's background-image doesn't reliably stretch to an
// arbitrary allocated size; the image renders at its own intrinsic
// dimensions regardless, so the container has to match it instead of the
// other way around.
export const NODE_WIDTH = 64;
export const NODE_HEIGHT = 60;
export const PANEL_WIDTH = 450;
export const PANEL_HEIGHT = 230;
export const NODE_MARGIN = 12;
export const PANEL_MARGIN = 8;
export const MIN_NODE_HIT_SIZE = 64;
export const MIN_NODE_SCALE = 0.85;
export const MAX_NODE_SCALE = 1.5;
export const BRIDGE_OVERLAP = 10;
export const BRIDGE_THICKNESS = 34;

export function clampPosition({x, y, width, height, workArea}) {
    const maxX = workArea.x + workArea.width - width;
    const maxY = workArea.y + workArea.height - height;
    return {
        x: Math.min(Math.max(x, workArea.x), Math.max(workArea.x, maxX)),
        y: Math.min(Math.max(y, workArea.y), Math.max(workArea.y, maxY)),
    };
}

export function toNormalized({x, y, workArea}) {
    return {
        fx: workArea.width > 0 ? (x - workArea.x) / workArea.width : 0,
        fy: workArea.height > 0 ? (y - workArea.y) / workArea.height : 0,
    };
}

export function fromNormalized({fx, fy, workArea}) {
    return {
        x: workArea.x + fx * workArea.width,
        y: workArea.y + fy * workArea.height,
    };
}

export function clampNodeScale(scale) {
    if (!Number.isFinite(scale))
        return 1;
    return Math.min(Math.max(scale, MIN_NODE_SCALE), MAX_NODE_SCALE);
}

// The texture remains at its native 64x60 size and is scaled by Clutter.
// Only the stable input wrapper changes allocation, so deformation never
// feeds back into drag coordinates or hit testing.
export function computeNodeGeometry(scale = 1) {
    const visualScale = clampNodeScale(scale);
    const visualWidth = NODE_WIDTH * visualScale;
    const visualHeight = NODE_HEIGHT * visualScale;
    const wrapperWidth = Math.max(MIN_NODE_HIT_SIZE, Math.ceil(visualWidth));
    const wrapperHeight = Math.max(MIN_NODE_HIT_SIZE, Math.ceil(visualHeight));
    return {
        scale: visualScale,
        visualWidth,
        visualHeight,
        wrapperWidth,
        wrapperHeight,
        visualX: (wrapperWidth - NODE_WIDTH) / 2,
        visualY: (wrapperHeight - NODE_HEIGHT) / 2,
    };
}

export function preserveCenterForResize({x, y, oldWidth, oldHeight, newWidth, newHeight}) {
    return {
        x: x + (oldWidth - newWidth) / 2,
        y: y + (oldHeight - newHeight) / 2,
    };
}

function computeBridge({side, nodeRect, panelRect, margin}) {
    const nodeCenterX = nodeRect.x + nodeRect.width / 2;
    const nodeCenterY = nodeRect.y + nodeRect.height / 2;
    const longSize = margin + BRIDGE_OVERLAP * 2;

    if (side === 'right') {
        return {
            x: nodeRect.x + nodeRect.width - BRIDGE_OVERLAP,
            y: nodeCenterY - BRIDGE_THICKNESS / 2,
            width: longSize,
            height: BRIDGE_THICKNESS,
        };
    }
    if (side === 'left') {
        return {
            x: panelRect.x + panelRect.width - BRIDGE_OVERLAP,
            y: nodeCenterY - BRIDGE_THICKNESS / 2,
            width: longSize,
            height: BRIDGE_THICKNESS,
        };
    }
    if (side === 'below') {
        return {
            x: nodeCenterX - BRIDGE_THICKNESS / 2,
            y: nodeRect.y + nodeRect.height - BRIDGE_OVERLAP,
            width: BRIDGE_THICKNESS,
            height: longSize,
        };
    }
    return {
        x: nodeCenterX - BRIDGE_THICKNESS / 2,
        y: panelRect.y + panelRect.height - BRIDGE_OVERLAP,
        width: BRIDGE_THICKNESS,
        height: longSize,
    };
}

// Decides which side of the Node the expand panel should open on, and the
// resulting top-left position, so the panel never clips off the work area.
// Picks the axis with more room: if the Node sits closer to a left/right
// edge than a top/bottom edge, flip horizontally; otherwise flip vertically.
export function computePanelPlacement({nodeRect, panelSize, workArea, margin = PANEL_MARGIN}) {
    const nodeCenterX = nodeRect.x + nodeRect.width / 2;
    const nodeCenterY = nodeRect.y + nodeRect.height / 2;

    const distLeft = nodeRect.x - workArea.x;
    const distRight = workArea.x + workArea.width - (nodeRect.x + nodeRect.width);
    const distTop = nodeRect.y - workArea.y;
    const distBottom = workArea.y + workArea.height - (nodeRect.y + nodeRect.height);

    const minHorizontal = Math.min(distLeft, distRight);
    const minVertical = Math.min(distTop, distBottom);

    let x, y, side;
    if (minHorizontal < minVertical) {
        // Anchor to the inner side (away from the nearer vertical edge).
        side = distLeft < distRight ? 'right' : 'left';
        x = side === 'right'
            ? nodeRect.x + nodeRect.width + margin
            : nodeRect.x - margin - panelSize.width;
        y = nodeCenterY - panelSize.height / 2;
    } else {
        side = distTop < distBottom ? 'below' : 'above';
        y = side === 'below'
            ? nodeRect.y + nodeRect.height + margin
            : nodeRect.y - margin - panelSize.height;
        x = nodeCenterX - panelSize.width / 2;
    }

    const clamped = clampPosition({
        x, y, width: panelSize.width, height: panelSize.height, workArea,
    });
    const panelRect = {
        x: clamped.x,
        y: clamped.y,
        width: panelSize.width,
        height: panelSize.height,
    };
    const attachment = {
        x: side === 'right' ? panelRect.x
            : side === 'left' ? panelRect.x + panelRect.width
                : nodeCenterX,
        y: side === 'below' ? panelRect.y
            : side === 'above' ? panelRect.y + panelRect.height
                : nodeCenterY,
    };
    return {
        x: clamped.x,
        y: clamped.y,
        side,
        attachment,
        bridge: computeBridge({side, nodeRect, panelRect, margin}),
    };
}
