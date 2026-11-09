export const MOTION_STYLES = Object.freeze(['system', 'reduced', 'off']);

export function normalizeMotionStyle(value) {
    return MOTION_STYLES.includes(value) ? value : 'system';
}

export function resolveMotionPolicy(value, systemAnimationsEnabled = true) {
    const style = normalizeMotionStyle(value);
    if (style === 'off' || (style === 'system' && !systemAnimationsEnabled))
        return 'off';
    return style === 'reduced' ? 'reduced' : 'full';
}

export function motionDuration(policy, fullDuration, reducedDuration = 80) {
    if (policy === 'off')
        return 0;
    return policy === 'reduced' ? reducedDuration : fullDuration;
}
