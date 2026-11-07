import Gio from 'gi://Gio';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Node} from './node.js';
import {Panel} from './panel.js';
import {clampPosition, toNormalized, fromNormalized, NODE_SIZE} from './nodePosition.js';
import {planEnableAction, planDisableAction} from './dockOwnership.js';

const UBUNTU_DOCK_UUID = 'ubuntu-dock@ubuntu.com';

async function runGnomeExtensions(args) {
    const proc = Gio.Subprocess.new(
        ['gnome-extensions', ...args],
        Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);
    const [stdout] = await proc.communicate_utf8_async(null, null);
    return stdout ?? '';
}

async function isExtensionEnabled(uuid) {
    const out = await runGnomeExtensions(['list', '--enabled']);
    return out.split('\n').map(l => l.trim()).includes(uuid);
}

export default class DockNodeExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._node = null;
        this._panel = null;
        this._monitorsChangedId = null;
        this._overviewShowingId = null;
        this._overviewHiddenId = null;

        this._node = new Node({
            onActivate: () => this._togglePanel(),
            onDragEnd: (x, y) => this._onDragEnd(x, y),
        });
        Main.layoutManager.addChrome(this._node.actor, {
            affectsStruts: false,
            trackFullscreen: true,
        });
        this._placeNodeFromSettings();

        this._panel = new Panel({onClose: () => {}});

        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this._closePanel();
            this._placeNodeFromSettings();
        });
        this._overviewShowingId = Main.overview.connect('showing', () => this._closePanel());
        this._overviewHiddenId = Main.overview.connect('hidden', () => this._closePanel());

        this._applyUbuntuDockOwnershipOnEnable();
    }

    disable() {
        this._closePanel();
        this._panel?.destroy();
        this._panel = null;

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
        const clamped = clampPosition({
            x: raw.x, y: raw.y, width: NODE_SIZE, height: NODE_SIZE, workArea,
        });
        this._node.actor.set_position(Math.round(clamped.x), Math.round(clamped.y));
    }

    _onDragEnd(x, y) {
        const index = this._currentMonitorIndex();
        const workArea = Main.layoutManager.getWorkAreaForMonitor(index);
        const clamped = clampPosition({
            x, y, width: NODE_SIZE, height: NODE_SIZE, workArea,
        });
        this._node.actor.set_position(Math.round(clamped.x), Math.round(clamped.y));

        const {fx, fy} = toNormalized({x: clamped.x, y: clamped.y, workArea});
        this._settings.set_double('node-position-x', fx);
        this._settings.set_double('node-position-y', fy);
        this._settings.set_string('node-monitor-connector', this._connectorForMonitorIndex(index));
    }

    _applyUbuntuDockOwnershipOnEnable() {
        isExtensionEnabled(UBUNTU_DOCK_UUID).then(isEnabled => {
            const plan = planEnableAction(isEnabled);
            this._settings?.set_boolean('disabled-ubuntu-dock', plan.newMarkerValue);
            if (plan.shouldDisableUbuntuDock) {
                runGnomeExtensions(['disable', UBUNTU_DOCK_UUID]).catch(error =>
                    console.error('[Putty] failed to disable Ubuntu Dock', error));
            }
        }).catch(error => console.error('[Putty] failed to check Ubuntu Dock state', error));
    }

    _applyUbuntuDockOwnershipOnDisable() {
        const marker = this._settings?.get_boolean('disabled-ubuntu-dock') ?? false;
        const plan = planDisableAction(marker);
        this._settings?.set_boolean('disabled-ubuntu-dock', plan.newMarkerValue);
        if (plan.shouldEnableUbuntuDock) {
            runGnomeExtensions(['enable', UBUNTU_DOCK_UUID]).catch(error =>
                console.error('[Putty] failed to re-enable Ubuntu Dock', error));
        }
    }
}
