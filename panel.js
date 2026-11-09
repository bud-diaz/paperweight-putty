import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import Pango from 'gi://Pango';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';

import {computePanelPlacement, PANEL_WIDTH, PANEL_HEIGHT} from './nodePosition.js';
import {normalizePaletteName} from './theme.js';
import {resolveMotionPolicy, motionDuration} from './motion.js';
import {deduplicateRunning} from './favorites.js';
import {nextPanelState, panelPressDisposition} from './panelState.js';

const ICON_SIZE = 40;
const TILES_PER_ROW = 5;

export class Panel {
    constructor({
        onClose,
        onOpenPreferences,
        palette = 'plum',
        motionStyle = 'system',
        systemAnimationsEnabled = true,
    }) {
        this.onClose = onClose;
        this.onOpenPreferences = onOpenPreferences;
        this.actor = null;
        this._grab = null;
        this._stageKeyId = null;
        this._state = 'closed';
        this._palette = normalizePaletteName(palette);
        this._motionStyle = motionStyle;
        this._systemAnimationsEnabled = systemAnimationsEnabled;
        this._transitionGeneration = 0;
        this._firstFocusable = null;
    }

    get isOpen() {
        return this._state !== 'closed';
    }

    get state() {
        return this._state;
    }

    get motionPolicy() {
        return resolveMotionPolicy(this._motionStyle, this._systemAnimationsEnabled);
    }

    setAppearance({palette, motionStyle, systemAnimationsEnabled} = {}) {
        if (palette !== undefined)
            this._palette = normalizePaletteName(palette);
        if (motionStyle !== undefined)
            this._motionStyle = motionStyle;
        if (systemAnimationsEnabled !== undefined)
            this._systemAnimationsEnabled = systemAnimationsEnabled;
        this._applyPaletteClasses();
        if (this.motionPolicy === 'off' && this._state === 'opening') {
            this._cancelTransitions();
            this._finishOpening();
        } else if (this.motionPolicy === 'off' && this._state === 'closing') {
            this.forceClose();
        }
    }

    open(nodeRect, workArea, {focusFirst = false} = {}) {
        if (this._state === 'closing')
            this.forceClose();
        if (this.isOpen)
            return;

        this._state = nextPanelState(this._state, 'open');
        this._transitionGeneration++;
        this.actor = new St.Widget({
            reactive: true,
            x: 0,
            y: 0,
        });
        const [stageWidth, stageHeight] = global.stage.get_size();
        this.actor.set_size(stageWidth, stageHeight);

        const placement = computePanelPlacement({
            nodeRect,
            panelSize: {width: PANEL_WIDTH, height: PANEL_HEIGHT},
            workArea,
        });
        this._side = placement.side;

        this._bridge = new St.Widget({reactive: false});
        this._bridge.set_position(Math.round(placement.bridge.x), Math.round(placement.bridge.y));
        this._bridge.set_size(placement.bridge.width, placement.bridge.height);
        this.actor.add_child(this._bridge);

        this._panelGroup = new St.Widget({
            reactive: true,
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
        });
        this._panelGroup.set_position(Math.round(placement.x), Math.round(placement.y));
        this.actor.add_child(this._panelGroup);

        this._material = new St.Widget({
            reactive: false,
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
        });
        this._panelGroup.add_child(this._material);

        this._contentLayer = new St.Widget({
            reactive: false,
            width: PANEL_WIDTH,
            height: PANEL_HEIGHT,
        });
        this._panelGroup.add_child(this._contentLayer);
        this._populateContent();
        this._applyPaletteClasses();
        this._prepareOpenVisualState();

        Main.layoutManager.addChrome(this.actor);
        this._grab = Main.pushModal(this.actor, {actionMode: Shell.ActionMode.POPUP});
        this.actor.connect('button-press-event', (actor, event) => {
            const source = event.get_source();
            const sourceIsInsidePanel = source === this._panelGroup ||
                (source !== null && this._panelGroup.contains(source));
            const disposition = panelPressDisposition(sourceIsInsidePanel);
            if (disposition === 'dismiss') {
                this.close();
                return Clutter.EVENT_STOP;
            }
            // Child buttons must receive both press and release. Stopping a
            // bubbled press on a parent prevents St.Button from completing
            // its clicked state on GNOME Shell 50.
            return Clutter.EVENT_PROPAGATE;
        });
        this._stageKeyId = global.stage.connect('key-press-event', (actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Escape) {
                this.close();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._animateOpen();
        if (focusFirst)
            this._firstFocusable?.grab_key_focus();
    }

    _applyPaletteClasses() {
        if (!this._panelGroup)
            return;
        const paletteClass = `putty-palette-${this._palette}`;
        this._panelGroup.set_style_class_name(`putty-panel-group ${paletteClass}`);
        this._material.set_style_class_name(`putty-panel-material putty-panel-${this._palette}`);
        this._bridge.set_style_class_name(
            `putty-bridge putty-bridge-${this._palette}-${this._side}`);
        this._contentLayer.set_style_class_name(`putty-panel-content ${paletteClass}`);
    }

    _populateContent() {
        const scroll = new St.ScrollView({
            style_class: 'putty-panel-scroll',
            overlay_scrollbars: true,
            reactive: true,
        });
        scroll.set_policy(St.PolicyType.NEVER, St.PolicyType.AUTOMATIC);
        scroll.set_position(30, 48);
        scroll.set_size(PANEL_WIDTH - 60, PANEL_HEIGHT - 78);

        const box = new St.BoxLayout({
            vertical: true,
            style_class: 'putty-panel',
            x_expand: true,
        });
        scroll.add_child(box);
        this._contentLayer.add_child(scroll);

        const gear = new St.Button({
            style_class: 'putty-settings-button',
            can_focus: true,
            reactive: true,
            accessible_name: 'Open Putty preferences',
            child: new St.Icon({icon_name: 'emblem-system-symbolic', icon_size: 16}),
        });
        gear.set_position(PANEL_WIDTH - 64, 22);
        gear.set_size(36, 36);
        this._connectDirectActivation(gear, () => {
            // Preferences run out of process. Release the Shell modal before
            // invoking Extension.openPreferences().
            this.forceClose();
            this.onOpenPreferences?.();
        });
        this._contentLayer.add_child(gear);

        const favoriteManager = AppFavorites.getAppFavorites();
        const favorites = favoriteManager.getFavorites?.() ??
            Object.values(favoriteManager.getFavoriteMap());
        const favoriteIds = favorites.map(app => app.get_id());
        const runningOnly = deduplicateRunning(
            favoriteIds, Shell.AppSystem.get_default().get_running());

        if (favorites.length === 0 && runningOnly.length === 0) {
            box.add_child(new St.Label({text: 'No apps', style_class: 'putty-empty'}));
            this._firstFocusable = gear;
            return;
        }

        const favoriteTiles = favorites.map(app => this._createAppButton(app));
        favoriteTiles.push(this._createAllAppsButton());
        this._addTileRows(box, favoriteTiles, 'putty-favorites-row');

        if (runningOnly.length > 0) {
            box.add_child(new St.Label({
                text: 'Running',
                style_class: 'putty-running-label',
                x_align: Clutter.ActorAlign.CENTER,
            }));
            this._addTileRows(
                box,
                runningOnly.map(app => this._createRunningButton(app)),
                'putty-running-row');
        }

        this._firstFocusable ??= gear;
    }

    _addTileRows(box, tiles, styleClass) {
        for (let index = 0; index < tiles.length; index += TILES_PER_ROW) {
            const row = new St.BoxLayout({
                style_class: styleClass,
                x_align: Clutter.ActorAlign.CENTER,
            });
            for (const tile of tiles.slice(index, index + TILES_PER_ROW)) {
                row.add_child(tile);
                this._firstFocusable ??= tile;
            }
            box.add_child(new St.Bin({child: row, x_expand: true}));
        }
    }

    _makeLabel(text) {
        const label = new St.Label({
            text,
            x_align: Clutter.ActorAlign.CENTER,
            style_class: 'putty-app-tile-label',
        });
        label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
        label.clutter_text.single_line_mode = true;
        label.set_width(64);
        return label;
    }

    _createButton({name, icon, running = false, action}) {
        const content = new St.BoxLayout({
            vertical: true,
            style_class: running ? 'putty-running-tile-content' : 'putty-app-tile-content',
        });
        content.set_pivot_point(0.5, 0.5);
        content.add_child(icon);
        if (running) {
            content.add_child(new St.Widget({
                x_align: Clutter.ActorAlign.CENTER,
                style_class: 'putty-running-indicator',
            }));
        } else {
            content.add_child(this._makeLabel(name));
        }

        const button = new St.Button({
            style_class: running ? 'putty-running-tile' : 'putty-app-tile',
            can_focus: true,
            reactive: true,
            accessible_name: name,
            child: content,
        });
        this._connectDirectActivation(button, () => this._activateAndClose(action));
        button.connect('enter-event', () => {
            this._animateTile(content, {scale: 1.04, y: -1});
            return Clutter.EVENT_PROPAGATE;
        });
        button.connect('leave-event', () => {
            this._animateTile(content, {scale: 1, y: 0});
            return Clutter.EVENT_PROPAGATE;
        });
        return button;
    }

    _connectDirectActivation(button, action) {
        button.connect('button-press-event', (actor, event) => {
            if (event.get_button() !== Clutter.BUTTON_PRIMARY)
                return Clutter.EVENT_PROPAGATE;
            action();
            return Clutter.EVENT_STOP;
        });
        button.connect('key-press-event', (actor, event) => {
            const symbol = event.get_key_symbol();
            if (symbol !== Clutter.KEY_Return && symbol !== Clutter.KEY_KP_Enter &&
                symbol !== Clutter.KEY_space)
                return Clutter.EVENT_PROPAGATE;
            action();
            return Clutter.EVENT_STOP;
        });
    }

    _activateAndClose(action) {
        if (!this.isOpen)
            return;
        // The original live implementation activated on press. Release the
        // modal synchronously before invoking Shell/App actions so activation
        // cannot depend on St.Button.clicked surviving ScrollView bubbling or
        // on a closing animation retaining the grab.
        this.forceClose();
        action();
    }

    _animateTile(content, {scale, y}) {
        const duration = motionDuration(this.motionPolicy, 90, 60);
        content.remove_all_transitions();
        if (duration === 0) {
            content.set({scale_x: scale, scale_y: scale, translation_y: y});
            return;
        }
        content.ease({
            scale_x: scale,
            scale_y: scale,
            translation_y: y,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    _createAppButton(app) {
        return this._createButton({
            name: app.get_name(),
            icon: app.create_icon_texture(ICON_SIZE),
            action: () => app.activate(),
        });
    }

    _createRunningButton(app) {
        return this._createButton({
            name: app.get_name(),
            icon: app.create_icon_texture(ICON_SIZE),
            running: true,
            action: () => app.activate(),
        });
    }

    _createAllAppsButton() {
        return this._createButton({
            name: 'Show Apps',
            icon: new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: ICON_SIZE}),
            action: () => Main.overview.showApps(),
        });
    }

    _setPanelPivot() {
        const pivots = {
            right: [0, 0.5],
            left: [1, 0.5],
            below: [0.5, 0],
            above: [0.5, 1],
        };
        this._panelGroup.set_pivot_point(...pivots[this._side]);
    }

    _initialTransform() {
        if (this._side === 'left' || this._side === 'right')
            return {scale_x: 0.18, scale_y: 0.72};
        return {scale_x: 0.72, scale_y: 0.18};
    }

    _prepareOpenVisualState() {
        this._setPanelPivot();
        if (this.motionPolicy === 'off') {
            this._panelGroup.set({scale_x: 1, scale_y: 1, opacity: 255});
            this._bridge.opacity = 255;
            this._contentLayer.opacity = 255;
            return;
        }

        const initial = this.motionPolicy === 'reduced'
            ? {scale_x: 0.96, scale_y: 0.96}
            : this._initialTransform();
        this._panelGroup.set({...initial, opacity: 0});
        this._bridge.opacity = 0;
        this._contentLayer.opacity = 0;
    }

    _animateOpen() {
        this._cancelTransitions();
        const generation = this._transitionGeneration;
        if (this.motionPolicy === 'off') {
            this._finishOpening();
            return;
        }

        this._bridge.ease({
            opacity: 255,
            duration: motionDuration(this.motionPolicy, 150, 80),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
        this._panelGroup.ease({
            scale_x: 1,
            scale_y: 1,
            opacity: 255,
            duration: motionDuration(this.motionPolicy, 280, 100),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                if (generation === this._transitionGeneration)
                    this._finishOpening();
            },
        });
        this._contentLayer.ease({
            opacity: 255,
            delay: motionDuration(this.motionPolicy, 135, 30),
            duration: motionDuration(this.motionPolicy, 125, 70),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
    }

    _finishOpening() {
        if (!this.actor)
            return;
        this._panelGroup.set({scale_x: 1, scale_y: 1, opacity: 255});
        this._bridge.opacity = 255;
        this._contentLayer.opacity = 255;
        this._state = nextPanelState(this._state, 'finish');
    }

    _cancelTransitions() {
        this._transitionGeneration++;
        this._panelGroup?.remove_all_transitions();
        this._bridge?.remove_all_transitions();
        this._contentLayer?.remove_all_transitions();
    }

    close() {
        if (!this.isOpen || this._state === 'closing')
            return;
        this._state = nextPanelState(this._state, 'close');
        this._cancelTransitions();
        const generation = this._transitionGeneration;
        if (this.motionPolicy === 'off') {
            this.forceClose();
            return;
        }

        this._contentLayer.ease({
            opacity: 0,
            duration: motionDuration(this.motionPolicy, 80, 55),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
        this._bridge.ease({
            opacity: 0,
            delay: motionDuration(this.motionPolicy, 80, 30),
            duration: motionDuration(this.motionPolicy, 110, 55),
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        });
        const target = this.motionPolicy === 'reduced'
            ? {scale_x: 0.97, scale_y: 0.97}
            : this._initialTransform();
        this._panelGroup.ease({
            ...target,
            opacity: 0,
            delay: motionDuration(this.motionPolicy, 55, 20),
            duration: motionDuration(this.motionPolicy, 190, 80),
            mode: Clutter.AnimationMode.EASE_IN_QUAD,
            onComplete: () => {
                if (generation === this._transitionGeneration)
                    this.forceClose();
            },
        });
    }

    forceClose(notify = true) {
        const wasOpen = this.isOpen;
        this._cancelTransitions();
        if (this._stageKeyId) {
            global.stage.disconnect(this._stageKeyId);
            this._stageKeyId = null;
        }
        if (this._grab) {
            Main.popModal(this._grab);
            this._grab = null;
        }
        if (this.actor) {
            Main.layoutManager.removeChrome(this.actor);
            this.actor.destroy();
        }
        this.actor = null;
        this._panelGroup = null;
        this._material = null;
        this._bridge = null;
        this._contentLayer = null;
        this._firstFocusable = null;
        this._state = nextPanelState(this._state, 'force-close');
        if (wasOpen && notify)
            this.onClose?.();
    }

    destroy() {
        this.forceClose(false);
    }
}
