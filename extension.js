import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import St from 'gi://St';

import {Node} from './node.js';
import {Panel} from './panel.js';
import {clampPosition, toNormalized, fromNormalized, preserveCenterForResize} from './nodePosition.js';
import {planEnableAction, planDisableAction} from './dockOwnership.js';

const UBUNTU_DOCK_UUID = 'ubuntu-dock@ubuntu.com';

// In-process, not a `gnome-extensions` subprocess: enableExtension()/
// disableExtension() just flip entries in the `enabled-extensions`/
// `disabled-extensions` string-array keys on `global.settings` (confirmed
// by reading ui/extensionSystem.js directly). Shelling out would risk
// blocking GNOME Shell's single-threaded main loop on a subprocess that
// itself needs that same main loop (via D-Bus) to answer.
function isUbuntuDockEnabled() {
    return global.settings.get_strv('enabled-extensions').includes(UBUNTU_DOCK_UUID);
}

export default class DockNodeExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._node = null;
        this._panel = null;
        this._monitorsChangedId = null;
        this._overviewShowingId = null;
        this._overviewHiddenId = null;
        this._settingsSignalIds = [];
        this._systemSettings = St.Settings.get();
        this._systemAnimationsId = null;

        const appearance = this._readAppearance();

        this._node = new Node({
            onActivate: () => this._togglePanel(),
            onDragEnd: (x, y) => this._onDragEnd(x, y),
            getWorkArea: () => this._currentWorkArea(),
            ...appearance,
        });
        Main.layoutManager.addChrome(this._node.actor, {
            affectsStruts: false,
            trackFullscreen: true,
        });
        this._placeNodeFromSettings();

        this._panel = new Panel({
            onClose: () => this._node?.grabFocus(),
            onOpenPreferences: () => this.openPreferences(),
            ...appearance,
        });

        for (const key of ['putty-palette', 'node-scale', 'motion-style']) {
            this._settingsSignalIds.push(this._settings.connect(`changed::${key}`, () => {
                this._onAppearanceChanged(key);
            }));
        }
        this._systemAnimationsId = this._systemSettings.connect(
            'notify::enable-animations', () => this._applyAppearance());

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this._panel?.forceClose();
            this._placeNodeFromSettings();
        });
        this._overviewShowingId = Main.overview.connect('showing', () => this._closePanel());
        this._overviewHiddenId = Main.overview.connect('hidden', () => this._closePanel());

        this._applyUbuntuDockOwnershipOnEnable();
    }

    disable() {
        this._panel?.forceClose(false);
        this._panel?.destroy();
        this._panel = null;

        for (const id of this._settingsSignalIds)
            this._settings?.disconnect(id);
        this._settingsSignalIds = [];
        if (this._systemAnimationsId) {
            this._systemSettings.disconnect(this._systemAnimationsId);
            this._systemAnimationsId = null;
        }
        this._systemSettings = null;

        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = null;
        }
        if (this._overviewShowingId) {
            Main.overview.disconnect(this._overviewShowingId);
            this._overviewShowingId = null;
        }
        if (this._overviewHiddenId) {
            Main.overview.disconnect(this._overviewHiddenId);
            this._overviewHiddenId = null;
        }

        if (this._node) {
            Main.layoutManager.removeChrome(this._node.actor);
            this._node.destroy();
            this._node = null;
        }

        this._applyUbuntuDockOwnershipOnDisable();
        this._settings = null;
    }

    _togglePanel() {
        if (this._panel.isOpen)
            this._closePanel();
        else
            this._openPanel();
    }

    _openPanel() {
        const workArea = this._currentWorkArea();
        this._panel.open(this._node.getRect(), workArea);
    }

    _closePanel() {
        this._panel?.close();
    }

    _readAppearance() {
        return {
            palette: this._settings.get_string('putty-palette'),
            scale: this._settings.get_double('node-scale'),
            motionStyle: this._settings.get_string('motion-style'),
            systemAnimationsEnabled: this._systemSettings?.enable_animations ?? true,
        };
    }

    _applyAppearance() {
        const appearance = this._readAppearance();
        this._node?.setAppearance(appearance);
        this._panel?.setAppearance(appearance);
    }

    _onAppearanceChanged(key) {
        if (key !== 'node-scale') {
            this._applyAppearance();
            return;
        }

        this._panel?.forceClose();
        const oldRect = this._node.getRect();
        const appearance = this._readAppearance();
        this._node.setAppearance(appearance);
        const newGeometry = this._node.geometry;
        const centered = preserveCenterForResize({
            x: oldRect.x,
            y: oldRect.y,
            oldWidth: oldRect.width,
            oldHeight: oldRect.height,
            newWidth: newGeometry.wrapperWidth,
            newHeight: newGeometry.wrapperHeight,
        });
        const clamped = clampPosition({
            ...centered,
            width: newGeometry.wrapperWidth,
            height: newGeometry.wrapperHeight,
            workArea: this._currentWorkArea(),
        });
        this._node.actor.set_position(Math.round(clamped.x), Math.round(clamped.y));
        this._persistNodePosition(clamped.x, clamped.y);
    }

    _currentMonitorIndex() {
        const connector = this._settings.get_string('node-monitor-connector');
        if (connector) {
            try {
                const index = global.backend.get_monitor_manager()
                    .get_monitor_for_connector?.(connector);
                if (index !== undefined && index >= 0)
                    return index;
            } catch (error) {
                console.error('[Putty] monitor-for-connector lookup failed', error);
            }
        }
        return Main.layoutManager.primaryIndex;
    }

    _currentWorkArea() {
        const index = this._currentMonitorIndex();
        return Main.layoutManager.getWorkAreaForMonitor(index);
    }

    _connectorForMonitorIndex(index) {
        try {
            const manager = global.backend.get_monitor_manager();
            const monitor = manager.get_monitors?.()[index];
            return monitor?.get_connector?.() ?? '';
        } catch (error) {
            console.error('[Putty] could not resolve connector for monitor', error);
            return '';
        }
    }

    _placeNodeFromSettings() {
        const workArea = this._currentWorkArea();
        const fx = this._settings.get_double('node-position-x');
        const fy = this._settings.get_double('node-position-y');
        const raw = fromNormalized({fx, fy, workArea});
        const geometry = this._node.geometry;
        const clamped = clampPosition({
            x: raw.x,
            y: raw.y,
            width: geometry.wrapperWidth,
            height: geometry.wrapperHeight,
            workArea,
        });
        this._node.actor.set_position(Math.round(clamped.x), Math.round(clamped.y));
    }

    _onDragEnd(x, y) {
        const index = this._currentMonitorIndex();
        const workArea = Main.layoutManager.getWorkAreaForMonitor(index);
        const geometry = this._node.geometry;
        const clamped = clampPosition({
            x,
            y,
            width: geometry.wrapperWidth,
            height: geometry.wrapperHeight,
            workArea,
        });
        this._node.actor.set_position(Math.round(clamped.x), Math.round(clamped.y));

        this._persistNodePosition(clamped.x, clamped.y, index, workArea);
    }

    _persistNodePosition(x, y, index = this._currentMonitorIndex(),
        workArea = Main.layoutManager.getWorkAreaForMonitor(index)) {
        const {fx, fy} = toNormalized({x, y, workArea});
        this._settings.set_double('node-position-x', fx);
        this._settings.set_double('node-position-y', fy);
        this._settings.set_string('node-monitor-connector', this._connectorForMonitorIndex(index));
    }

    _applyUbuntuDockOwnershipOnEnable() {
        const plan = planEnableAction(isUbuntuDockEnabled());
        this._settings?.set_boolean('disabled-ubuntu-dock', plan.newMarkerValue);
        if (plan.shouldDisableUbuntuDock)
            Main.extensionManager.disableExtension(UBUNTU_DOCK_UUID);
    }

    _applyUbuntuDockOwnershipOnDisable() {
        const marker = this._settings?.get_boolean('disabled-ubuntu-dock') ?? false;
        const plan = planDisableAction(marker);
        this._settings?.set_boolean('disabled-ubuntu-dock', plan.newMarkerValue);
        if (plan.shouldEnableUbuntuDock)
            Main.extensionManager.enableExtension(UBUNTU_DOCK_UUID);
    }
}
