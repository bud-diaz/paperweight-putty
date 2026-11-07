// Pure decision logic for the "don't fight the user's own choice" ownership
// rule around ubuntu-dock@ubuntu.com: act once, remember whether we were the
// one who acted, never re-touch a choice we didn't make. No GNOME imports —
// unit-testable with plain `node --test`. Mirrors the pattern already used
// in host/gnomadd/src/dock_placement.rs of this user's modebi repo.

export function planEnableAction(isUbuntuDockCurrentlyEnabled) {
    if (isUbuntuDockCurrentlyEnabled)
        return {shouldDisableUbuntuDock: true, newMarkerValue: true};
    return {shouldDisableUbuntuDock: false, newMarkerValue: false};
}

export function planDisableAction(currentMarkerValue) {
    if (currentMarkerValue)
        return {shouldEnableUbuntuDock: true, newMarkerValue: false};
    return {shouldEnableUbuntuDock: false, newMarkerValue: false};
}
