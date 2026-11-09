import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Atk from 'gi://Atk';

import {
    DRAG_THRESHOLD_PX, NODE_WIDTH, NODE_HEIGHT, clampPosition, computeNodeGeometry,
} from './nodePosition.js';
import {normalizePaletteName} from './theme.js';
import {resolveMotionPolicy, motionDuration} from './motion.js';
import {selectDirectionalPose, nextInteractionState} from './nodeInteraction.js';

const POSE_INTERVAL_MS = 1000 / 12;

// The public actor is a stable position/input wrapper. All clay deformation is
// confined to the native-size visual child, keeping drag math deterministic.
export class Node {
    constructor({
        onActivate,
        onDragEnd,
        getWorkArea,
        palette = 'plum',
        scale = 1,
        motionStyle = 'system',
        systemAnimationsEnabled = true,
    }) {
        this.onActivate = onActivate;
        this.onDragEnd = onDragEnd;
        this.getWorkArea = getWorkArea;
        this._palette = normalizePaletteName(palette);
        this._motionStyle = motionStyle;
        this._systemAnimationsEnabled = systemAnimationsEnabled;
        this._geometry = computeNodeGeometry(scale);
        this._pose = 'neutral';
        this._interactionState = 'rest';
        this._animationGeneration = 0;
        this._lastPoseTime = -Infinity;

        this.actor = new St.Widget({
            style_class: 'putty-node-input',
            reactive: true,
            can_focus: true,
            track_hover: true,
            width: this._geometry.wrapperWidth,
            height: this._geometry.wrapperHeight,
            accessible_role: Atk.Role.PUSH_BUTTON,
            accessible_name: 'Putty application launcher',
        });
        this._visual = new St.Widget({
            reactive: false,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
        });
        this._visual.set_pivot_point(0.5, 0.5);
        this.actor.add_child(this._visual);
        this._layoutVisual();
        this._setPose('neutral');
        this._applyTransform({}, 0);

        this._pressPos = null;
        this._dragging = false;
        this._ids = [
            this.actor.connect('button-press-event', this._onPress.bind(this)),
            this.actor.connect('motion-event', this._onMotion.bind(this)),
            this.actor.connect('button-release-event', this._onRelease.bind(this)),
            this.actor.connect('enter-event', this._onEnter.bind(this)),
            this.actor.connect('leave-event', this._onLeave.bind(this)),
            this.actor.connect('key-press-event', this._onKeyPress.bind(this)),
        ];
    }

    get geometry() {
        return {...this._geometry};
    }

    get motionPolicy() {
        return resolveMotionPolicy(this._motionStyle, this._systemAnimationsEnabled);
    }

    setAppearance({palette, scale, motionStyle, systemAnimationsEnabled} = {}) {
        if (palette !== undefined)
            this._palette = normalizePaletteName(palette);
        if (motionStyle !== undefined)
            this._motionStyle = motionStyle;
        if (systemAnimationsEnabled !== undefined)
            this._systemAnimationsEnabled = systemAnimationsEnabled;
        if (scale !== undefined)
            this.setScale(scale);
        this._setPose(this._pose);
        if (this.motionPolicy === 'off') {
            this._cancelVisualAnimations();
            this._settleImmediately();
        }
    }

    setScale(scale) {
        this._geometry = computeNodeGeometry(scale);
        this.actor.set_size(this._geometry.wrapperWidth, this._geometry.wrapperHeight);
        this._layoutVisual();
        this._applyTransform({}, 0);
        return this.geometry;
    }

    _layoutVisual() {
        this._visual.set_position(this._geometry.visualX, this._geometry.visualY);
    }

    _setPose(pose) {
        this._pose = pose;
        this.actor.set_style_class_name(
            `putty-node-input putty-node-input-${this._palette}`);
        this._visual.set_style_class_name(
            `putty-node-visual putty-palette-${this._palette} putty-node-pose-${pose}`);
    }

    _cancelVisualAnimations() {
        this._animationGeneration++;
        this._visual.remove_all_transitions();
    }

    _applyTransform({scaleX = 1, scaleY = 1, x = 0, y = 0} = {}, duration = 0, onComplete = null) {
        const props = {
            scale_x: this._geometry.scale * scaleX,
            scale_y: this._geometry.scale * scaleY,
            translation_x: x,
            translation_y: y,
        };
        if (duration <= 0) {
            this._visual.set(props);
            onComplete?.();
            return;
        }
        this._visual.ease({
            ...props,
            duration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete,
        });
    }

    _settleImmediately() {
        this._interactionState = this.actor.hover ? 'hovered' : 'rest';
        this._setPose('neutral');
        this._applyTransform({scaleX: this.actor.hover ? 1.025 : 1}, 0);
    }

    _onEnter() {
        this._interactionState = nextInteractionState(this._interactionState, 'enter');
        if (!this._pressPos) {
            this._setPose('neutral');
            this._applyTransform({scaleX: 1.025, scaleY: 1.025},
                motionDuration(this.motionPolicy, 100, 70));
        }
        return Clutter.EVENT_PROPAGATE;
    }

    _onLeave() {
        if (this._pressPos)
            return Clutter.EVENT_PROPAGATE;
        this._interactionState = nextInteractionState(this._interactionState, 'leave');
        this._setPose('neutral');
        this._applyTransform({}, motionDuration(this.motionPolicy, 120, 70));
        return Clutter.EVENT_PROPAGATE;
    }

    _onPress(actor, event) {
        if (event.get_button() !== Clutter.BUTTON_PRIMARY)
            return Clutter.EVENT_PROPAGATE;
        this._cancelVisualAnimations();
        this._interactionState = nextInteractionState(this._interactionState, 'press');
        this._pressPos = event.get_coords();
        this._startActorPos = [this.actor.x, this.actor.y];
        this._dragWorkArea = this.getWorkArea?.();
        this._dragging = false;
        this._setPose(this.motionPolicy === 'full' ? 'pressed' : 'neutral');
        this._applyTransform({scaleX: 1.05, scaleY: 0.93, y: 1},
            motionDuration(this.motionPolicy, 70, 55));
        return Clutter.EVENT_STOP;
    }

    _updateDirectionalPose(event, curX, curY) {
        if (this.motionPolicy !== 'full')
            return;
        const time = event.get_time?.() ?? Date.now();
        if (time - this._lastPoseTime < POSE_INTERVAL_MS)
            return;
        this._lastPoseTime = time;
        const centerX = this.actor.x + this.actor.width / 2;
        const centerY = this.actor.y + this.actor.height / 2;
        const dx = curX - centerX;
        const dy = curY - centerY;
        this._setPose(selectDirectionalPose({dx, dy, previousPose: this._pose}));
        const length = Math.max(1, Math.hypot(dx, dy));
        this._applyTransform({
            scaleX: 1.025,
            scaleY: 1.025,
            x: Math.max(-2, Math.min(2, dx / length * 1.5)),
            y: Math.max(-2, Math.min(2, dy / length * 1.5)),
        }, 65);
    }

    _onMotion(actor, event) {
        const [curX, curY] = event.get_coords();
        if (!this._pressPos) {
            this._updateDirectionalPose(event, curX, curY);
            return Clutter.EVENT_PROPAGATE;
        }

        const [startX, startY] = this._pressPos;
        const dx = curX - startX;
        const dy = curY - startY;
        if (!this._dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
            this._dragging = true;
            this._interactionState = nextInteractionState(this._interactionState, 'drag-start');
            this._setPose(this.motionPolicy === 'full' ? 'lifted' : 'neutral');
            this._applyTransform({scaleX: 1.06, scaleY: 1.06, y: -3},
                motionDuration(this.motionPolicy, 85, 60));
        }
        if (this._dragging) {
            const [startActorX, startActorY] = this._startActorPos;
            const rawX = startActorX + dx;
            const rawY = startActorY + dy;
            if (this._dragWorkArea) {
                const clamped = clampPosition({
                    x: rawX,
                    y: rawY,
                    width: this._geometry.wrapperWidth,
                    height: this._geometry.wrapperHeight,
                    workArea: this._dragWorkArea,
                });
                this.actor.set_position(clamped.x, clamped.y);
            } else {
                this.actor.set_position(rawX, rawY);
            }
        }
        return Clutter.EVENT_STOP;
    }

    _runPlop() {
        this._cancelVisualAnimations();
        const generation = this._animationGeneration;
        if (this.motionPolicy !== 'full') {
            this._setPose('neutral');
            this._applyTransform({}, motionDuration(this.motionPolicy, 120, 80), () => {
                if (generation === this._animationGeneration)
                    this._interactionState = nextInteractionState(this._interactionState, 'settle');
            });
            return;
        }

        this._setPose('impact');
        this._applyTransform({scaleX: 1.07, scaleY: 0.9, y: 2}, 70, () => {
            if (generation !== this._animationGeneration)
                return;
            this._setPose('rebound');
            this._applyTransform({scaleX: 0.99, scaleY: 1.045, y: -1}, 80, () => {
                if (generation !== this._animationGeneration)
                    return;
                this._setPose('neutral');
                this._applyTransform({}, 115, () => {
                    if (generation === this._animationGeneration)
                        this._interactionState = nextInteractionState(this._interactionState, 'settle');
                });
            });
        });
    }

    _onRelease() {
        if (!this._pressPos)
            return Clutter.EVENT_PROPAGATE;
        const wasDragging = this._dragging;
        this._pressPos = null;
        this._dragging = false;
        this._interactionState = nextInteractionState(this._interactionState, 'release');
        if (wasDragging) {
            this.onDragEnd?.(this.actor.x, this.actor.y);
            this._runPlop();
        } else {
            this._setPose('neutral');
            this._applyTransform({scaleX: this.actor.hover ? 1.025 : 1, scaleY: this.actor.hover ? 1.025 : 1},
                motionDuration(this.motionPolicy, 100, 65));
            this.onActivate?.({focusFirst: false});
        }
        return Clutter.EVENT_STOP;
    }

    _onKeyPress(actor, event) {
        const symbol = event.get_key_symbol();
        if (symbol !== Clutter.KEY_Return && symbol !== Clutter.KEY_KP_Enter && symbol !== Clutter.KEY_space)
            return Clutter.EVENT_PROPAGATE;
        this.onActivate?.({focusFirst: true});
        return Clutter.EVENT_STOP;
    }

    getRect() {
        return {
            x: this.actor.x,
            y: this.actor.y,
            width: this._geometry.wrapperWidth,
            height: this._geometry.wrapperHeight,
        };
    }

    grabFocus() {
        this.actor?.grab_key_focus();
    }

    destroy() {
        this._cancelVisualAnimations();
        for (const id of this._ids)
            this.actor.disconnect(id);
        this._ids = [];
        this.actor.destroy();
    }
}
