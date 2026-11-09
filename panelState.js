export function nextPanelState(state, event) {
    if (event === 'force-close')
        return 'closed';
    if (event === 'open' && state === 'closed')
        return 'opening';
    if (event === 'finish' && state === 'opening')
        return 'open';
    if (event === 'close' && (state === 'opening' || state === 'open'))
        return 'closing';
    return state;
}

export function panelPressDisposition(sourceIsInsidePanel) {
    return sourceIsInsidePanel ? 'propagate' : 'dismiss';
}
