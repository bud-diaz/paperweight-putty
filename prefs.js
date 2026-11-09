import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {PALETTE_NAMES, PALETTES} from './theme.js';
import {addFavorite, moveFavorite, removeFavorite} from './favorites.js';

const MOTION_VALUES = ['system', 'reduced', 'off'];

function selectedIndex(values, current) {
    const index = values.indexOf(current);
    return index >= 0 ? index : 0;
}

export default class PuttyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const shellSettings = new Gio.Settings({schema_id: 'org.gnome.shell'});
        window.set_default_size(620, 720);

        const page = new Adw.PreferencesPage({
            title: 'Putty',
            icon_name: 'applications-graphics-symbolic',
        });
        window.add(page);

        const appearance = new Adw.PreferencesGroup({
            title: 'Appearance',
            description: 'Choose how the putty material looks and responds.',
        });
        page.add(appearance);

        const paletteModel = Gtk.StringList.new(PALETTE_NAMES.map(name => PALETTES[name].label));
        const paletteRow = new Adw.ComboRow({title: 'Putty palette', model: paletteModel});
        paletteRow.selected = selectedIndex(PALETTE_NAMES, settings.get_string('putty-palette'));
        paletteRow.connect('notify::selected', () => {
            settings.set_string('putty-palette', PALETTE_NAMES[paletteRow.selected]);
        });
        appearance.add(paletteRow);

        const scaleRow = new Adw.SpinRow({
            title: 'Node size',
            subtitle: 'Scales the material while keeping at least a 64 × 64 pixel target.',
            adjustment: new Gtk.Adjustment({
                lower: 0.85,
                upper: 1.5,
                step_increment: 0.05,
                page_increment: 0.1,
                value: settings.get_double('node-scale'),
            }),
            digits: 2,
        });
        scaleRow.connect('notify::value', () => settings.set_double('node-scale', scaleRow.value));
        appearance.add(scaleRow);

        const motionModel = Gtk.StringList.new(['Follow system', 'Reduced', 'Off']);
        const motionRow = new Adw.ComboRow({
            title: 'Motion',
            subtitle: 'Follow system honors GNOME Shell’s animation setting.',
            model: motionModel,
        });
        motionRow.selected = selectedIndex(MOTION_VALUES, settings.get_string('motion-style'));
        motionRow.connect('notify::selected', () => {
            settings.set_string('motion-style', MOTION_VALUES[motionRow.selected]);
        });
        appearance.add(motionRow);

        const favorites = new Adw.PreferencesGroup({
            title: 'Favorite applications',
            description: 'These are system-wide GNOME Favorites. Changes also affect the Overview and other components that use that list.',
        });
        page.add(favorites);
        this._buildFavoritesRows({favorites, shellSettings, window});

        const about = new Adw.PreferencesGroup({title: 'About and reset'});
        page.add(about);
        const reset = new Adw.ActionRow({
            title: 'Reset appearance',
            subtitle: 'Restore the Plum palette, default size, and system motion.',
            activatable: true,
        });
        reset.add_suffix(new Gtk.Image({icon_name: 'edit-undo-symbolic'}));
        reset.connect('activated', () => {
            settings.reset('putty-palette');
            settings.reset('node-scale');
            settings.reset('motion-style');
            paletteRow.selected = selectedIndex(PALETTE_NAMES, settings.get_string('putty-palette'));
            scaleRow.value = settings.get_double('node-scale');
            motionRow.selected = selectedIndex(MOTION_VALUES, settings.get_string('motion-style'));
        });
        about.add(reset);
    }

    _buildFavoritesRows({favorites, shellSettings, window}) {
        this._favoriteRows ??= [];
        for (const row of this._favoriteRows)
            favorites.remove(row);
        this._favoriteRows = [];

        const ids = shellSettings.get_strv('favorite-apps');
        ids.forEach((id, index) => {
            const app = GioUnix.DesktopAppInfo.new(id);
            const row = new Adw.ActionRow({
                title: app?.get_display_name() ?? id,
                subtitle: id,
            });
            if (app?.get_icon())
                row.add_prefix(new Gtk.Image({gicon: app.get_icon(), pixel_size: 32}));

            const up = new Gtk.Button({
                icon_name: 'go-up-symbolic',
                valign: Gtk.Align.CENTER,
                sensitive: index > 0,
                tooltip_text: 'Move up',
            });
            up.connect('clicked', () => {
                shellSettings.set_strv('favorite-apps', moveFavorite(ids, index, index - 1));
                this._buildFavoritesRows({favorites, shellSettings, window});
            });
            row.add_suffix(up);

            const down = new Gtk.Button({
                icon_name: 'go-down-symbolic',
                valign: Gtk.Align.CENTER,
                sensitive: index < ids.length - 1,
                tooltip_text: 'Move down',
            });
            down.connect('clicked', () => {
                shellSettings.set_strv('favorite-apps', moveFavorite(ids, index, index + 1));
                this._buildFavoritesRows({favorites, shellSettings, window});
            });
            row.add_suffix(down);

            const remove = new Gtk.Button({
                icon_name: 'list-remove-symbolic',
                valign: Gtk.Align.CENTER,
                tooltip_text: 'Remove from GNOME Favorites',
            });
            remove.add_css_class('destructive-action');
            remove.connect('clicked', () => {
                shellSettings.set_strv('favorite-apps', removeFavorite(ids, id));
                this._buildFavoritesRows({favorites, shellSettings, window});
            });
            row.add_suffix(remove);
            favorites.add(row);
            this._favoriteRows.push(row);
        });

        const add = new Adw.ActionRow({
            title: 'Add application',
            subtitle: 'Search installed desktop applications',
            activatable: true,
        });
        add.add_suffix(new Gtk.Image({icon_name: 'list-add-symbolic'}));
        add.connect('activated', () => this._showAppChooser({
            parent: window,
            excludedIds: new Set(ids),
            onChoose: id => {
                shellSettings.set_strv('favorite-apps', addFavorite(ids, id));
                this._buildFavoritesRows({favorites, shellSettings, window});
            },
        }));
        favorites.add(add);
        this._favoriteRows.push(add);
    }

    _showAppChooser({parent, excludedIds, onChoose}) {
        const chooser = new Gtk.Window({
            title: 'Add GNOME Favorite',
            transient_for: parent,
            modal: true,
            default_width: 520,
            default_height: 560,
        });
        const content = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 12,
            margin_bottom: 12,
            margin_start: 12,
            margin_end: 12,
        });
        chooser.set_child(content);
        const search = new Gtk.SearchEntry({placeholder_text: 'Search applications'});
        content.append(search);
        const list = new Gtk.ListBox({selection_mode: Gtk.SelectionMode.NONE});
        list.add_css_class('boxed-list');
        const scroller = new Gtk.ScrolledWindow({vexpand: true, child: list});
        content.append(scroller);

        const apps = Gio.AppInfo.get_all()
            .filter(app => app.should_show() && app.get_id() && !excludedIds.has(app.get_id()))
            .sort((a, b) => a.get_display_name().localeCompare(b.get_display_name()));
        for (const app of apps) {
            const box = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL, spacing: 12});
            box.append(new Gtk.Image({gicon: app.get_icon(), pixel_size: 32}));
            const label = new Gtk.Label({label: app.get_display_name(), xalign: 0, hexpand: true});
            box.append(label);
            const row = new Gtk.ListBoxRow({child: box, activatable: true});
            row._puttyAppId = app.get_id();
            row._puttySearch = `${app.get_display_name()} ${app.get_id()}`.toLocaleLowerCase();
            list.append(row);
        }
        list.set_filter_func(row => row._puttySearch.includes(search.text.toLocaleLowerCase()));
        search.connect('search-changed', () => list.invalidate_filter());
        list.connect('row-activated', (widget, row) => {
            onChoose(row._puttyAppId);
            chooser.destroy();
        });
        chooser.present();
    }
}
