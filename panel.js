import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import {computePanelPlacement, PANEL_WIDTH, PANEL_HEIGHT} from './nodePosition.js';

const ICON_SIZE = 40;

// Hand-rolled expand panel (not PopupMenu.PopupMenu) so we control the
// 4-direction flip ourselves via nodePosition.computePanelPlacement().
//
// Dismissal uses Main.pushModal/popModal, but the grab target (`this.actor`)
// is a full-stage-sized invisible root, not the visible panel box itself.
// Once a grab is active, clicks outside the grabbed actor's subtree aren't
// delivered as normal Clutter events at all -- there's nothing to catch on
// global.stage, not just a misidentified source. Making the grabbed actor
// cover the whole stage, with the real panel as its child, means every
// click is legitimately "inside the grab": clicks on the visible content
// are picked (and absorbed) by it or its rows as usual, and clicks on the
// empty rest of the root are picked as the root itself, which is exactly
// when we want to close.
export class Panel {
    constructor({onClose}) {
        this.onClose = onClose;
        this.actor = null;
        this._content = null;
        this._grab = null;
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
            style_class: 'putty-panel',
        });
        this._populate(box);

        this._content = new St.Bin({
            style_class: 'putty-panel-bin',
            child: box,
            reactive: true,
            // The Bin is sized to the organic background's full canvas
            // (see below), which is usually larger than the content's own
            // natural size -- center the content within it rather than
            // defaulting to a top-left-anchored child.
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        // Absorb clicks that land on the panel's own padding/background
        // (not on a specific row) so they don't bubble up to the root and
        // get treated as an outside click.
        this._content.connect('button-press-event', () => Clutter.EVENT_STOP);

        this.actor = new St.Widget({reactive: true, x: 0, y: 0});
        const [stageWidth, stageHeight] = global.stage.get_size();
        this.actor.set_size(stageWidth, stageHeight);
        this.actor.add_child(this._content);
        Main.layoutManager.addChrome(this.actor);

        // Size to the background SVG's own canvas, not the content's
        // natural size: St's background-image doesn't reliably stretch to
        // an arbitrary allocated size, so the container has to match the
        // image's fixed dimensions for the two to actually line up. Only
        // grow beyond it if content genuinely needs more room (accepting
        // that the image won't stretch to match in that case -- a known
        // limitation, fine for now since this layout comfortably fits the
        // design target).
        const [, naturalWidth] = box.get_preferred_width(-1);
        const width = Math.max(naturalWidth, PANEL_WIDTH);
        const [, naturalHeight] = box.get_preferred_height(width);
        const panelSize = {width, height: Math.max(naturalHeight, PANEL_HEIGHT)};

        const placement = computePanelPlacement({nodeRect, panelSize, workArea});
        this._content.set_position(Math.round(placement.x), Math.round(placement.y));
        this._content.set_size(panelSize.width, panelSize.height);

        this._grab = Main.pushModal(this.actor, {actionMode: Shell.ActionMode.POPUP});
        this.actor.connect('button-press-event', () => {
            this.close();
            return Clutter.EVENT_STOP;
        });
        this._stageKeyId = global.stage.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    // Favorites render as icon-over-label tiles in one row; running-only
    // apps render beneath, prefixed by a "Running" label, as icon+dot
    // tiles with no name -- matching putty-organic.md's supplied mockup.
    _populate(box) {
        const favoriteMap = AppFavorites.getAppFavorites().getFavoriteMap();
        const running = Shell.AppSystem.get_default().get_running();

        const seen = new Set();
        const favorites = [];
        for (const id in favoriteMap) {
            favorites.push(favoriteMap[id]);
            seen.add(id);
        }
        const runningOnly = [];
        for (const app of running) {
            if (!seen.has(app.get_id())) {
                runningOnly.push(app);
                seen.add(app.get_id());
            }
        }

        if (favorites.length === 0 && runningOnly.length === 0) {
            box.add_child(new St.Label({text: 'No apps', style_class: 'putty-empty'}));
            return;
        }

        // Two rows, not one long row: keeps the content area closer to the
        // panel background's fixed aspect ratio instead of growing wider
        // than the organic silhouette can stretch to cover.
        const favoriteTiles = favorites.map(app => this._createAppTile(app));
        favoriteTiles.push(this._createAllAppsTile());
        const midpoint = Math.ceil(favoriteTiles.length / 2);

        const firstRow = new St.BoxLayout({style_class: 'putty-favorites-row'});
        for (const tile of favoriteTiles.slice(0, midpoint))
            firstRow.add_child(tile);
        box.add_child(firstRow);

        const secondRowTiles = favoriteTiles.slice(midpoint);
        if (secondRowTiles.length > 0) {
            const secondRow = new St.BoxLayout({style_class: 'putty-favorites-row'});
            for (const tile of secondRowTiles)
                secondRow.add_child(tile);
            box.add_child(secondRow);
        }

        if (runningOnly.length > 0) {
            const runningRow = new St.BoxLayout({style_class: 'putty-running-row'});
            runningRow.add_child(new St.Label({
                text: 'Running',
                y_align: Clutter.ActorAlign.CENTER,
                style_class: 'putty-running-label',
            }));
            for (const app of runningOnly)
                runningRow.add_child(this._createRunningTile(app));
            box.add_child(runningRow);
        }
    }

    _activateAndClose(action) {
        action();
        this.close();
        return Clutter.EVENT_STOP;
    }

    _createAppTile(app) {
        const tile = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'putty-app-tile',
        });
        tile.add_child(app.create_icon_texture(ICON_SIZE));
        tile.add_child(new St.Label({
            text: app.get_name(),
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'putty-app-tile-label',
        }));
        tile.connect('button-press-event',
            () => this._activateAndClose(() => app.activate()));
        return tile;
    }

    _createRunningTile(app) {
        const tile = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'putty-running-tile',
        });
        tile.add_child(app.create_icon_texture(ICON_SIZE));
        tile.add_child(new St.Widget({
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'putty-running-indicator',
        }));
        tile.connect('button-press-event',
            () => this._activateAndClose(() => app.activate()));
        return tile;
    }

    _createAllAppsTile() {
        const tile = new St.BoxLayout({
            vertical: true,
            reactive: true,
            style_class: 'putty-app-tile',
        });
        tile.add_child(new St.Icon({
            icon_name: 'view-app-grid-symbolic',
            icon_size: ICON_SIZE,
        }));
        tile.add_child(new St.Label({
            text: 'Show Apps',
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'putty-app-tile-label',
        }));
        tile.connect('button-press-event',
            () => this._activateAndClose(() => Main.overview.showApps()));
        return tile;
    }

    close() {
        if (!this.isOpen)
            return;
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
        this._content = null;
        this.onClose?.();
    }

    destroy() {
        this.close();
    }
}
