export const DIRECTIONAL_POSES = Object.freeze([
    'east', 'south-east', 'south', 'south-west',
    'west', 'north-west', 'north', 'north-east',
]);

const STEP = Math.PI / 4;

function wrappedAngleDistance(a, b) {
    const delta = Math.abs(a - b) % (Math.PI * 2);
    return Math.min(delta, Math.PI * 2 - delta);
}

export function selectDirectionalPose({
    dx,
    dy,
    previousPose = 'neutral',
    minimumDistance = 6,
    hysteresisDegrees = 8,
}) {
    if (Math.hypot(dx, dy) < minimumDistance)
        return 'neutral';

    const angle = Math.atan2(dy, dx);
    if (DIRECTIONAL_POSES.includes(previousPose)) {
        const previousAngle = DIRECTIONAL_POSES.indexOf(previousPose) * STEP;
        if (wrappedAngleDistance(angle, previousAngle) <= STEP / 2 +
            hysteresisDegrees * Math.PI / 180)
            return previousPose;
    }

    const index = Math.round(angle / STEP);
    return DIRECTIONAL_POSES[(index + DIRECTIONAL_POSES.length) % DIRECTIONAL_POSES.length];
}

export function nextInteractionState(state, event) {
    switch (event) {
    case 'press':
        return 'pressed';
    case 'drag-start':
        return 'dragging';
    case 'release':
        return state === 'dragging' ? 'plopping' : 'hovered';
    case 'enter':
        return state === 'rest' ? 'hovered' : state;
    case 'leave':
    case 'settle':
        return 'rest';
    default:
        return state;
    }
}
