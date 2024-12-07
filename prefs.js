'use strict';

const { Adw, Gio, Gtk, GLib, GSound } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const REGIONS = [
    'Вінницька область',
    'Волинська область',
    'Дніпропетровська область',
    'Донецька область',
    'Житомирська область',
    'Закарпатська область',
    'Запорізька область',
    'Івано-Франківська область',
    'Київська область',
    'Кіровоградська область',
    'Луганська область',
    'Львівська область',
    'Миколаївська область',
    'Одеська область',
    'Полтавська область',
    'Рівненська область',
    'Сумська область',
    'Тернопільська область',
    'Харківська область',
    'Херсонська область',
    'Хмельницька область',
    'Черкаська облас��ь',
    'Чернівецька область',
    'Чернігівська область',
    'м. Київ'
];


function init() {}

function fillPreferencesWindow(window) {
    const settings = ExtensionUtils.getSettings();

    // Создаем первую страницу для основных настроек
    const mainPage = new Adw.PreferencesPage({
        title: 'Основні',
        icon_name: 'preferences-system-symbolic'
    });
    
    const mainGroup = new Adw.PreferencesGroup({
        title: 'Налаштування моніторингу'
    });
    mainPage.add(mainGroup);

    // Создаем модель для списка регионов
    const model = Gtk.StringList.new(REGIONS);

    // Создаем выпадающий список для выбора региона
    const regionRow = new Adw.ComboRow({
        title: 'Регіон',
        subtitle: 'Виберіть регіон для моніторингу',
        model: model,
        icon_name: 'mark-location-symbolic'
    });

    // Устанавливаем текущее значение
    const currentRegion = settings.get_string('selected-region');
    regionRow.selected = REGIONS.indexOf(currentRegion);

    // Обработчик изменения значения
    regionRow.connect('notify::selected', (widget) => {
        settings.set_string('selected-region', REGIONS[widget.selected]);
    });

    // Добавляем настройку интервала обновления
    const spinButton = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 5,
            upper: 60,
            step_increment: 1,
            value: settings.get_int('refresh-interval')
        }),
        digits: 0,
        valign: Gtk.Align.CENTER,
    });

    const intervalRow = new Adw.ActionRow({
        title: 'Інтервал оновлення',
        subtitle: 'Як часто перевіряти статус (в секундах)',
        icon_name: 'preferences-system-time-symbolic'
    });
    intervalRow.add_suffix(spinButton);

    spinButton.connect('value-changed', (widget) => {
        settings.set_int('refresh-interval', widget.get_value());
    });

    mainGroup.add(regionRow);
    mainGroup.add(intervalRow);

    // Создаем вторую страницу для настроек уведомлений
    const notifyPage = new Adw.PreferencesPage({
        title: 'Сповіщення',
        icon_name: 'preferences-system-notifications-symbolic'
    });
    
    const notifyGroup = new Adw.PreferencesGroup({
        title: 'Налаштування сповiщень'
    });
    notifyPage.add(notifyGroup);

    // Добавляем переключатель для мигания
    const blinkingRow = new Adw.ActionRow({
        title: 'Мигання іконки',
        subtitle: 'Увімкнути або вимкнути мигання іконки під час тривоги',
        icon_name: 'eye-open-negative-filled-symbolic'
    });

    const blinkingSwitch = new Gtk.Switch({
        active: settings.get_boolean('enable-blinking'),
        valign: Gtk.Align.CENTER,
    });

    blinkingSwitch.connect('notify::active', (widget) => {
        settings.set_boolean('enable-blinking', widget.get_active());
    });

    blinkingRow.add_suffix(blinkingSwitch);

    // Добавляем переключатель для OSD
    const osdRow = new Adw.ActionRow({
        title: 'Екранні сповіщення',
        subtitle: 'Показувати сповіщення при зміні статусу тривоги',
        icon_name: 'notification-symbolic'
    });

    const osdSwitch = new Gtk.Switch({
        active: settings.get_boolean('enable-osd'),
        valign: Gtk.Align.CENTER,
    });

    osdSwitch.connect('notify::active', (widget) => {
        settings.set_boolean('enable-osd', widget.get_active());
    });

    osdRow.add_suffix(osdSwitch);

    // Добавляем переключатель для звука
    const soundRow = new Adw.ActionRow({
        title: 'Звукові сповіщення',
        subtitle: 'Програвати звук при зміні статусу тривоги',
        icon_name: 'audio-speakers-symbolic'
    });

    const soundSwitch = new Gtk.Switch({
        active: settings.get_boolean('enable-sound'),
        valign: Gtk.Align.CENTER,
    });

    soundSwitch.connect('notify::active', (widget) => {
        settings.set_boolean('enable-sound', widget.get_active());
    });

    soundRow.add_suffix(soundSwitch);

    // В группу уведомлений добавляем новый переключатель
    const allAlertsRow = new Adw.ActionRow({
        title: 'Список активних тривог',
        subtitle: 'Показувати список усіх областей, де зараз тривога',
        icon_name: 'view-list-symbolic'
    });

    const allAlertsSwitch = new Gtk.Switch({
        active: settings.get_boolean('show-all-alerts'),
        valign: Gtk.Align.CENTER,
    });

    allAlertsSwitch.connect('notify::active', (widget) => {
        settings.set_boolean('show-all-alerts', widget.get_active());
    });

    allAlertsRow.add_suffix(allAlertsSwitch);
    notifyGroup.add(allAlertsRow);

    notifyGroup.add(blinkingRow);
    notifyGroup.add(osdRow);
    notifyGroup.add(soundRow);

    // Добавляем кнопки тестирования звука
    const soundTestGroup = new Adw.PreferencesGroup({
        title: 'Тестування звуку'
    });
    notifyPage.add(soundTestGroup);

    // Создаем GSound контекст для тестовых кнопок
    const soundContext = new GSound.Context();
    soundContext.init(null);

    // Кнопка для тестирования звука начала тревоги
    const alertOnTestRow = new Adw.ActionRow({
        title: 'Тест звуку початку тривоги',
        subtitle: 'Натисніть для програвання звуку початку тривоги',
        icon_name: 'audio-speakers-symbolic'
    });

    const alertOnButton = new Gtk.Button({
        icon_name: 'media-playback-start-symbolic',
        valign: Gtk.Align.CENTER
    });

    alertOnButton.connect('clicked', () => {
        const soundPath = GLib.build_filenamev([Me.path, 'res', 'male_air_on.wav']);
        try {
            soundContext.play_full({
                'media.filename': soundPath,
                'media.name': 'Test Alert Sound',
                'media.role': 'event'
            }, null);
        } catch (e) {
            log(`Failed to play test sound: ${e.message}`);
            try {
                GLib.spawn_command_line_async(`paplay "${soundPath}"`);
            } catch (e2) {
                log(`Fallback sound playback failed: ${e2.message}`);
            }
        }
    });

    alertOnTestRow.add_suffix(alertOnButton);
    soundTestGroup.add(alertOnTestRow);

    // Кнопка для тестирования звука окончания тревоги
    const alertOffTestRow = new Adw.ActionRow({
        title: 'Тест звуку відбою тривоги',
        subtitle: 'Натисніть для програвання звуку відбою тривоги',
        icon_name: 'audio-speakers-symbolic'
    });

    const alertOffButton = new Gtk.Button({
        icon_name: 'media-playback-start-symbolic',
        valign: Gtk.Align.CENTER
    });

    alertOffButton.connect('clicked', () => {
        const soundPath = GLib.build_filenamev([Me.path, 'res', 'male_air_off.wav']);
        try {
            soundContext.play_full({
                'media.filename': soundPath,
                'media.name': 'Test All Clear Sound',
                'media.role': 'event'
            }, null);
        } catch (e) {
            log(`Failed to play test sound: ${e.message}`);
            try {
                GLib.spawn_command_line_async(`paplay "${soundPath}"`);
            } catch (e2) {
                log(`Fallback sound playback failed: ${e2.message}`);
            }
        }
    });

    alertOffTestRow.add_suffix(alertOffButton);
    soundTestGroup.add(alertOffTestRow);

    // Добавляем страницы в окно
    window.add(mainPage);
    window.add(notifyPage);
} 