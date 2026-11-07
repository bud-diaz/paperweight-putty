import St from 'gi://St';
import Clutter from 'gi://Clutter';
import {DRAG_THRESHOLD_PX, NODE_SIZE} from './nodePosition.js';

// The floating circular button. Plain (non-GObject-registered) wrapper
// class, matching this user's existing gnomad-dock-placement@gnomad style
// of keeping extension code lightweight rather than defining new GObject
// subclasses. Relies on Clutter's implicit grab: once button-press-event
// returns Clutter.EVENT_STOP, motion/release events for that pointer keep
// being delivered to this actor even after the pointer leaves its bounds,
// so no explicit stage grab is needed for a same-actor drag.
export class Node {
    constructor({onActivate, onDragEnd}) {
        this.onActivate = onActivate;
        this.onDragEnd = onDragEnd;

        this.actor = new St.Bin({
            style_class: 'putty-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            width: NODE_SIZE,
            height: NODE_SIZE,
        });
        this.actor.child = new St.Icon({
            icon_name: 'view-grid-symbolic',
            icon_size: NODE_SIZE * 0.5,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._pressPos = null;
        this._dragging = false;

        this._ids = [
            this.actor.connect('button-press-event', this._onPress.bind(this)),
            this.actor.connect('motion-event', this._onMotion.bind(this)),
            this.actor.connect('button-release-event', this._onRelease.bind(this)),
        ];
    }

    _onPress(actor, event) {
        if (event.get_button() !== Clutter.BUTTON_PRIMARY)
            return Clutter.EVENT_PROPAGATE;
        this._pressPos = event.get_coords();
        this._startActorPos = [this.actor.x, this.actor.y];
        this._dragging = false;
        return Clutter.EVENT_STOP;
    }

    _onMotion(actor, event) {
        if (!this._pressPos)
            return Clutter.EVENT_PROPAGATE;
        const [curX, curY] = event.get_coords();
        const [startX, startY] = this._pressPos;
        const dx = curX - startX;
        const dy = curY - startY;
        if (!this._dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX)
            this._dragging = true;
        if (this._dragging) {
            const [startActorX, startActorY] = this._startActorPos;
            this.actor.set_position(startActorX + dx, startActorY + dy);
        }
        return Clutter.EVENT_STOP;
    }

    _onRelease(actor, event) {
        if (!this._pressPos)
            return Clutter.EVENT_PROPAGATE;
        const wasDragging = this._dragging;
        this._pressPos = null;
        this._dragging = false;
        if (wasDragging)
            this.onDragEnd?.(this.actor.x, this.actor.y);
        else
            this.onActivate?.();
        return Clutter.EVENT_STOP;
    }

    getRect() {
        return {
            x: this.actor.x, y: this.actor.y,
            width: this.actor.width, height: this.actor.height,
        };
    }

    destroy() {
        for (const id of this._ids)
            this.actor.disconnect(id);
        this._ids = [];
        this.actor.destroy();
    }
}
