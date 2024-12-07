const GETTEXT_DOMAIN = 'air-alert-monitor';

const { GObject, St, Gio, GLib, GSound } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;

// Инициализируем переводы до использования gettext
ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
const _ = ExtensionUtils.gettext;

const API_URL = 'https://ubilling.net.ua/aerialalerts/';

let settings;
const Me = ExtensionUtils.getCurrentExtension();

const BLINK_INTERVAL = 1000; // интервал мигания в миллисекундах

// Создаем класс AirAlertIndicator
const AirAlertIndicator = GObject.registerClass(
class AirAlertIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Air Alert Monitor'));

        this._blinkTimeout = null;

        // Инициализируем GSound контекст
        this._soundContext = new GSound.Context();
        this._soundContext.init(null);

        // Создаем иконку
        this.icon = new St.Icon({
            gicon: this._createIcon('ok'),
            style_class: 'system-status-icon'
        });
        this.add_child(this.icon);

        // Создаем меню
        this._createMenu();

        // Показываем приветственное уведомление
        this._showNotification(
            _('Air Alert Monitor'),
            _('Монітор повітряних тривог запущено'),
            'ok'
        );

        // Запускаем периодическое обновление
        this._startMonitoring();

        // Подписываемся на изменение интервала обновления
        this._settingsChangedId = settings.connect('changed::refresh-interval', 
            () => this._restartMonitoring());

        // Подписываемся на изменение настройки мигания
        this._blinkingSettingChangedId = settings.connect('changed::enable-blinking', 
            () => this._onBlinkingSettingChanged());

        // Добавляем обработчик изменения настройки отображения списка тревог
        this._showAllAlertsChangedId = settings.connect('changed::show-all-alerts', 
            async () => {
                try {
                    const response = await this._makeRequest(API_URL);
                    const data = JSON.parse(response);
                    this._updateActiveAlerts(data);
                } catch (error) {
                    log(`Error updating alerts list: ${error.message}`);
                }
            });
    }

    _createMenu() {
        // Создаем устой элемент меню
        this.statusItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        this.menu.addMenuItem(this.statusItem);

        // Разделитель перед списком тревог
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Элемент для списка активных тревог
        this.activeAlertsItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false
        });
        this.menu.addMenuItem(this.activeAlertsItem);
    }

    _startMonitoring() {
        this._checkAlert().catch(error => {
            log(`Error in monitoring: ${error.message}`);
        });
        
        const interval = settings.get_int('refresh-interval');
        this._timeout = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            interval,
            () => {
                this._checkAlert().catch(error => {
                    log(`Error in monitoring: ${error.message}`);
                });
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    async _checkAlert() {
        try {
            const response = await this._makeRequest(API_URL);
            const data = JSON.parse(response);
            
            // Получаем выбранный регион из настроек
            const selectedRegion = settings.get_string('selected-region');
            const regionStatus = data?.states?.[selectedRegion];
            
            if (regionStatus) {
                const isAlert = regionStatus.alertnow;
                this._updateStatus(isAlert, regionStatus);
                this._updateActiveAlerts(data);
            } else {
                this._setError(_('Регіон не знайдено'));
            }
        } catch (error) {
            this._setError(error.message);
        }
    }

    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            const request = Gio.File.new_for_uri(url).load_contents_async(null,
                (file, result) => {
                    try {
                        const [success, contents] = file.load_contents_finish(result);
                        if (success) {
                            resolve(new TextDecoder().decode(contents));
                        } else {
                            reject(new Error('Failed to load contents'));
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
        });
    }

    _updateStatus(isAlert, data) {
        // Сохраняем предыдущий статус перед обновлением
        const previousAlert = this._isCurrentlyInAlert;
        
        // Сохраняем текущий статус тревоги
        this._isCurrentlyInAlert = isAlert;

        // Показываем уведомление и проигрываем звук только при изменении статуса
        const selectedRegion = settings.get_string('selected-region');
        if (previousAlert !== undefined && previousAlert !== isAlert) {
            // Проигрываем соответствующий звук
            this._playSound(isAlert ? 'alert' : 'ok');
            
            if (isAlert) {
                this._showNotification(
                    _('Повітряна тривога'),
                    _(`УВАГА! Повітряна тривога у ${selectedRegion}`),
                    'alert'
                );
            } else {
                this._showNotification(
                    _('Відбій тривоги'),
                    _(`${selectedRegion}: відбій тривоги`),
                    'ok'
                );
            }
        }

        // Обновляем иконку в панели
        this.icon.set_gicon(
            this._createIcon(isAlert ? 'alert' : 'ok')
        );

        // Управляем анимацией только если она включена в настройках
        if (isAlert && settings.get_boolean('enable-blinking')) {
            this._startBlinking();
        } else {
            this._stopBlinking();
        }

        // Создаем вертикальный бокс для всего содержимого
        const box = new St.BoxLayout({
            style_class: 'popup-menu-item-box',
            vertical: true  // Делаем бокс вертикальным
        });

        // Создаем горизонтальный бокс для иконки и основного текста
        const mainBox = new St.BoxLayout({
            style_class: 'popup-menu-item-box'
        });

        // Добавляем иконку в горизонтальный бокс
        this.menuIcon = new St.Icon({
            gicon: this._createIcon(isAlert ? 'alert' : 'ok'),
            style_class: 'popup-menu-icon',
            icon_size: 16
        });
        mainBox.add_child(this.menuIcon);

        // Добавляем основной текст в горизонтальный бокс
        const text = isAlert ? 
            _(`УВАГА! Повітряна тривога у ${selectedRegion}`) : 
            _(`${selectedRegion}: тривоги немає`);
        
        const label = new St.Label({ text: text });
        mainBox.add_child(label);

        // Добавляем горизонтальный бокс в вертикальный
        box.add_child(mainBox);

        // Добавляем время в вертикальный бокс
        if (data.changed) {
            // Создаем горизонтальный бокс для иконки и времени
            const timeBox = new St.BoxLayout({
                style_class: 'popup-menu-item-box'
            });

            // Добавляем иконку обновления
            const reloadIcon = new St.Icon({
                gicon: Gio.Icon.new_for_string(
                    Me.dir.get_child('icons').get_child('reload.svg').get_path()
                ),
                style_class: 'popup-menu-icon',
                icon_size: 16
            });
            timeBox.add_child(reloadIcon);

            // Добавляем текст времени
            const timeLabel = new St.Label({
                text: `Останнє оновлення: ${data.changed}`,
                style_class: 'popup-menu-item-time'
            });
            timeBox.add_child(timeLabel);

            // Добавляем бокс с временем в основной вертикальный бокс
            box.add_child(timeBox);
        }

        // Очищаем и обновляем содержимое statusItem
        this.statusItem.actor.remove_all_children();
        this.statusItem.actor.add_child(box);
    }

    _setError(message) {
        this.icon.icon_name = 'dialog-warning-symbolic';
        
        // Создаем бокс для ошибки
        const box = new St.BoxLayout({
            style_class: 'popup-menu-item-box'
        });

        const errorIcon = new St.Icon({
            icon_name: 'dialog-warning-symbolic',
            style_class: 'popup-menu-icon',
            icon_size: 16
        });
        box.add_child(errorIcon);

        const label = new St.Label({ text: `Помилка: ${message}` });
        box.add_child(label);

        this.statusItem.actor.remove_all_children();
        this.statusItem.actor.add_child(box);
    }

    _createIcon(type) {
        const path = Me.dir.get_child('icons').get_child(`${type}.svg`).get_path();
        return Gio.icon_new_for_string(path);
    }

    _restartMonitoring() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
        }
        this._startMonitoring();
    }

    _startBlinking() {
        if (this._blinkTimeout) {
            return; // Анимация уже запущена
        }

        let isVisible = true;
        this._blinkTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, BLINK_INTERVAL, () => {
            isVisible = !isVisible;
            this.icon.set_opacity(isVisible ? 255 : 0);
            if (this.menuIcon) {
                this.menuIcon.set_opacity(isVisible ? 255 : 0);
            }
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopBlinking() {
        if (this._blinkTimeout) {
            GLib.source_remove(this._blinkTimeout);
            this._blinkTimeout = null;
        }
        this.icon.set_opacity(255);
        if (this.menuIcon) {
            this.menuIcon.set_opacity(255);
        }
    }

    _onBlinkingSettingChanged() {
        // Если мигание выключено, останавливаем его
        if (!settings.get_boolean('enable-blinking')) {
            this._stopBlinking();
        } else if (this._isCurrentlyInAlert) {
            // Если включено и есть тревога, запускаем мигание
            this._startBlinking();
        }
    }

    _playSound(type) {
        if (!settings.get_boolean('enable-sound')) {
            return;
        }

        const soundFile = type === 'alert' ? 'male_air_on.wav' : 'male_air_off.wav';
        const soundPath = GLib.build_filenamev([Me.path, 'res', soundFile]);

        try {
            this._soundContext.play_full({
                'media.filename': soundPath,
                'media.name': type === 'alert' ? 'Alert Sound' : 'All Clear Sound',
                'media.role': 'event'
            }, null);
        } catch (e) {
            log(`Failed to play sound: ${e.message}`);
            // Fallback to paplay if GSound fails
            try {
                GLib.spawn_command_line_async(`paplay "${soundPath}"`);
            } catch (e2) {
                log(`Fallback sound playback failed: ${e2.message}`);
            }
        }
    }

    _showNotification(title, message, type = 'alert') {
        // Создаем источник уведомлений если его еще нет
        if (!this._notificationSource) {
            this._notificationSource = new MessageTray.Source('Air Alert Monitor',
                                                            type === 'alert' ? 'dialog-warning-symbolic' : 'dialog-information-symbolic');
            // Добавляем источник в трей уведомлений
            Main.messageTray.add(this._notificationSource);
        }

        // Создаем уведомление
        const notification = new MessageTray.Notification(this._notificationSource, title, message);
        
        // Делаем уведомление срочным для тревоги
        notification.setUrgency(type === 'alert' ? MessageTray.Urgency.CRITICAL : MessageTray.Urgency.NORMAL);
        
        // Показываем уведомление
        this._notificationSource.showNotification(notification);
    }

    _updateActiveAlerts(data) {
        if (!settings.get_boolean('show-all-alerts')) {
            this.activeAlertsItem.actor.hide();
            return;
        }

        const activeAlerts = [];
        for (const [region, status] of Object.entries(data.states)) {
            if (status.alertnow) {
                activeAlerts.push(region);
            }
        }

        if (activeAlerts.length > 0) {
            const box = new St.BoxLayout({
                vertical: true,
                style_class: 'active-alerts-box'
            });

            const titleLabel = new St.Label({
                text: _('Поточні тривоги:'),
                style_class: 'active-alerts-title'
            });
            box.add_child(titleLabel);

            activeAlerts.forEach(region => {
                const label = new St.Label({
                    text: `• ${region}`,
                    style_class: 'active-alerts-item'
                });
                box.add_child(label);
            });

            this.activeAlertsItem.actor.remove_all_children();
            this.activeAlertsItem.actor.add_child(box);
            this.activeAlertsItem.actor.show();
        } else {
            this.activeAlertsItem.actor.hide();
        }
    }

    destroy() {
        // Очищаем все таймеры
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        
        if (this._blinkTimeout) {
            GLib.source_remove(this._blinkTimeout);
            this._blinkTimeout = null;
        }

        // Отключаем обработчики настроек
        if (this._settingsChangedId) {
            settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._blinkingSettingChangedId) {
            settings.disconnect(this._blinkingSettingChangedId);
            this._blinkingSettingChangedId = null;
        }

        // Удаляем источник уведомлений
        if (this._notificationSource) {
            this._notificationSource.destroy();
            this._notificationSource = null;
        }

        // Отключаем обработчик при уничтожении
        if (this._showAllAlertsChangedId) {
            settings.disconnect(this._showAllAlertsChangedId);
            this._showAllAlertsChangedId = null;
        }

        super.destroy();
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
        settings = ExtensionUtils.getSettings();
    }

    enable() {
        this._indicator = new AirAlertIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
        
        this._settingsChangedId = settings.connect('changed::selected-region', () => {
            this._indicator._checkAlert().catch(error => {
                log(`Error checking alert: ${error.message}`);
            });
        });
    }

    disable() {
        // Отключаем слушатель при деактивации расширения
        if (this._settingsChangedId) {
            settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}