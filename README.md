# Air Alert Monitor GNOME Extension

Розширення GNOME Shell для моніторингу повітряних тривог в Україні. Відображає поточний статус повітряної тривоги у вибраному регіоні прямо на панелі GNOME.

## Можливості

- 🚨 Моніторинг статусу повітряних тривог у вибраному регіоні України
- 🔔 Візуальне сповіщення на панелі GNOME Shell
- 🎯 Зручний двосторінковий інтерфейс налаштувань:
  - 📍 Основні налаштування (регіон та інтервал оновлення)
- 🔧 Налаштування сповіщень (мигання іконки, екранні та звукові сповіщення)
- ⚙️ Налаштовуваний інтервал оновлення (5-60 секунд)
- 🗺️ Підтримка всіх областей України
- 🌍 Інтерфейс українською мовою
- 🔄 Автоматичне оновлення статусу
- 🎯 Анімація мигання іконки під час тривоги (з можливістю відключення)
- 📱 Екранні сповіщення (OSD) при зміні статусу тривоги:
  - Повідомлення про запуск розширення 
  - Повідомлення про початок тривоги 
  - Повідомлення про відбій тривоги 
- 🎨 Звукові сповіщення при зміні статусу тривоги:
  - Звук початку тривоги
  - Звук відбою тривоги
- 🎨 Стандартні іконки GNOME в налаштуваннях

## Вимоги

- GNOME Shell 42 і вище
- Доступ до інтернету для отримання даних про тривогу
- GSound для відтворення звуку (gir1.2-gsound-1.0)
- glib-compile-schemas (зазвичай входить до пакету glib2.0-dev або glib2-devel)

## Встановлення

### З вихідного коду

1. Клонуйте репозиторій:

```bash
git clone https://github.com/MaksymLeiber/air-alert-monitor
cd air-alert-monitor
```

2. Встановіть розширення:

```bash
mkdir -p ~/.local/share/gnome-shell/extensions/air-alert-monitor@banny.dev.icloud.com
cp -r * ~/.local/share/gnome-shell/extensions/air-alert-monitor@banny.dev.icloud.com/
cd ~/.local/share/gnome-shell/extensions/air-alert-monitor@banny.dev.icloud.com
glib-compile-schemas schemas/
```

3. Перезапустіть GNOME Shell:
   - На X11: Alt+F2, введіть 'r', натисніть Enter
   - На Wayland: Вийдіть із системи та увійдіть знову

4. Увімкніть розширення через GNOME Extensions або за допомогою команди:

```bash
gnome-extensions enable air-alert-monitor@banny.dev.icloud.com
```

### Встановлення залежностей

#### Ubuntu/Debian:

```bash
sudo apt install glib-2.0-dev gir1.2-gsound-1.0
```

#### Fedora:

```bash
sudo dnf install glib2-devel gsound
```

#### Arch Linux:

```bash
sudo pacman -S glib2 gsound
```

### Видалення

```bash
rm -rf ~/.local/share/gnome-shell/extensions/air-alert-monitor@banny.dev.icloud.com
```

## Налаштування

### Основні налаштування
1. Відкрийте налаштування розширення через GNOME Extensions
2. Виберіть свій регіон зі списку
3. Налаштуйте інтервал оновлення (від 5 до 60 секунд)

### Налаштування сповіщень
- 👁️ Увімкнення/вимкнення мигання іконки під час тривоги
- 🔔 Увімкнення/вимкнення екранних сповіщень
- 🔊 Увімкнення/вимкнення звукових сповіщень
- 🎵 Тестування звуків тривоги та відбою

### Доступні регіони:
- Всі області України
- місто Київ

## Розробка

### Структура проекту
```
air-alert-monitor/
├── extension.js          # Основний код розширення
├── prefs.js             # Налаштування розширення
├── metadata.json        # Метадані розширення
├── schemas/             # Схеми налаштувань
│   └─ org.gnome.shell.extensions.air-alert-monitor.gschema.xml
├── icons/               # Іконки розширення
│   ├── alert.svg        # Іконка тривоги
│   └── ok.svg          # Іконка спокою
├── res/                 # Звукові файли
│   ├── male_air_on.wav  # Звук початку тривоги
│   └── male_air_off.wav # Звук відбою тривоги
├── screenshots/         # Скріншоти для README
│   ├── alert.png
│   └── ok.png
└── LICENSE             # Ліцензія GPL-3.0
```


### Збірка та налагодження

Для розробки рекомендується:
1. Створити символічне посилання з репозиторію в директорію розширень:

```bash
ln -s $(pwd) ~/.local/share/gnome-shell/extensions/air-alert-monitor@banny.dev.icloud.com
```

2. Скомпілювати схеми:

```bash
glib-compile-schemas schemas/
```

3. Перегляд логів:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

### Відлагодження
Для відлагодження розширення можна використовувати Looking Glass:
1. Натисніть Alt+F2
2. Введіть 'lg'
3. Перейдіть на вкладку 'Extensions'

## Джерело даних

Дані про повітряні тривоги надані API: https://ubilling.net.ua/aerialalerts/


## Ліцензія

[GPL-3.0](LICENSE)

## Автор
Максим Лейбер
banny.dev@icloud.com

## Співпраця

Якщо ви знайшли помилку або у вас є пропозиції щодо покращення, будь ласка:
1. Створіть Issue
2. Надішліть Pull Request

### Як зробити внесок:
1. Зробіть форк репозиторію
2. Створіть гілку для ваших змін
3. Внесіть зміни та протестуйте їх
4. Відправте Pull Request

## Подяки

- [UBilling](https://ubilling.net.ua/) за надання API повітряних тривог
- Спільноті GNOME за чудову платформу
- Всім користувачам за відгуки та пропозиції
