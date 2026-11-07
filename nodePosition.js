// Pure geometry helpers: no GNOME/GJS imports, unit-testable with plain `node --test`.

export const DRAG_THRESHOLD_PX = 8;
export const NODE_SIZE = 56;
export const NODE_MARGIN = 12;
export const PANEL_MARGIN = 8;

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
    return {x: clamped.x, y: clamped.y, side};
}
