import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import {computePanelPlacement} from './nodePosition.js';

const PANEL_MIN_WIDTH = 240;
const ICON_SIZE = 40;
const ROW_HEIGHT = 48;

// Hand-rolled expand panel (not PopupMenu.PopupMenu) so we control the
// 4-direction flip ourselves via nodePosition.computePanelPlacement().
// Dismissal uses Main.pushModal/popModal, the same mechanism
// PopupMenu.PopupMenu itself relies on for "click outside closes it".
export class Panel {
    constructor({onClose}) {
        this.onClose = onClose;
        this.actor = null;
        this._grab = null;
        this._stageButtonId = null;
        this._stageKeyId = null;
    }

    get isOpen() {
        return this.actor !== null;
    }

    open(nodeRect, workArea) {
        if (this.isOpen)
            return;

        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'popup-menu-content putty-panel',
        });
        this._populate(box);

        this.actor = new St.Bin({
            style_class: 'popup-menu-boxpointer putty-panel-bin',
            child: box,
            reactive: true,
        });
        Main.layoutManager.addChrome(this.actor);

        const [, naturalWidth] = box.get_preferred_width(-1);
        const width = Math.max(naturalWidth, PANEL_MIN_WIDTH);
        const [, naturalHeight] = box.get_preferred_height(width);
        const panelSize = {width, height: naturalHeight};

        const placement = computePanelPlacement({nodeRect, panelSize, workArea});
        this.actor.set_position(Math.round(placement.x), Math.round(placement.y));
        this.actor.set_size(panelSize.width, panelSize.height);

        this._grab = Main.pushModal(this.actor, {actionMode: Shell.ActionMode.POPUP});
        this._stageButtonId = global.stage.connect('button-press-event', (actor, event) => {
            const [px, py] = event.get_coords();
            if (!this._pointInsidePanel(px, py))
                this.close();
            return Clutter.EVENT_PROPAGATE;
        });
        this._stageKeyId = global.stage.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    // Geometry-based, not actor-identity-based: while Main.pushModal()'s
    // grab is active, event.get_source() reports the grabbed actor itself
    // for clicks anywhere on screen, not the actor actually under the
    // pointer, so it can't distinguish an outside click from an inside one.
    _pointInsidePanel(px, py) {
        if (!this.actor)
            return false;
        return px >= this.actor.x && px <= this.actor.x + this.actor.width &&
            py >= this.actor.y && py <= this.actor.y + this.actor.height;
    }

    _populate(box) {
        const favoriteMap = AppFavorites.getAppFavorites().getFavoriteMap();
        const running = Shell.AppSystem.get_default().get_running();

        const seen = new Set();
        const apps = [];
        for (const id in favoriteMap) {
            apps.push(favoriteMap[id]);
            seen.add(id);
        }
        for (const app of running) {
            if (!seen.has(app.get_id())) {
                apps.push(app);
                seen.add(app.get_id());
            }
        }

        if (apps.length === 0) {
            box.add_child(new St.Label({text: 'No apps', style_class: 'putty-empty'}));
            return;
        }

        for (const app of apps)
            box.add_child(this._createRow(app));
    }

    _createRow(app) {
        const row = new St.BoxLayout({
            style_class: 'popup-menu-item putty-row',
            reactive: true,
            height: ROW_HEIGHT,
        });
        row.add_child(app.create_icon_texture(ICON_SIZE));
        row.add_child(new St.Label({
            text: app.get_name(),
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'putty-row-label',
        }));
        row.connect('button-press-event', () => {
            app.activate();
            this.close();
            return Clutter.EVENT_STOP;
        });
        return row;
    }

    close() {
        if (!this.isOpen)
            return;
        if (this._stageButtonId) {
            global.stage.disconnect(this._stageButtonId);
            this._stageButtonId = null;
        }
        if (this._stageKeyId) {
            global.stage.disconnect(this._stageKeyId);
            this._stageKeyId = null;
        }
        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = null;
        }
        Main.layoutManager.removeChrome(this.actor);
        this.actor.destroy();
        this.actor = null;
        this.onClose?.();
    }

    destroy() {
        this.close();
    }
}
