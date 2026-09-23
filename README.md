# MOGG School

Школьное приложение для МБОУ СОШ №4 и №7 (Новый Уренгой).

---

## Структура

```
mogg-school/
├── app/          ← React Native (Expo) → APK
│   └── assets/   ← Сюда кидай свою иконку (icon.png, adaptive-icon.png, splash.png)
├── server/       ← Node.js сервер для Termux
└── .github/
    └── workflows/build-apk.yml  ← GitHub Actions → APK
```

---

## Замени иконку

Положи свои файлы в `app/assets/`:
- `icon.png` — 1024×1024 (основная иконка)
- `adaptive-icon.png` — 1024×1024 (Android adaptive)
- `splash.png` — любой размер (сплэш-экран)

Сейчас там заглушки с "MG".

---

## Собрать APK (GitHub Actions)

1. Залей весь проект в репозиторий на GitHub
2. Перейди в репо → Actions → "Build APK" → "Run workflow"
3. Через ~10 минут в Artifacts будет `mogg-school-debug.apk`
4. Скачай, установи на телефон (нужно разрешить установку из неизвестных источников)

---

## Запустить сервер (Termux)

```bash
# 1. Установи Node.js (если нет)
pkg install nodejs

# 2. Скопируй папку server/ на телефон
# Через Telegram, ADB, или любым способом

# 3. Перейди в папку и установи зависимости
cd server
npm install

# 4. Запусти
node index.js
# Или через start.sh:
bash start.sh
```

После запуска в терминале появится IP твоего телефона (например `192.168.1.5`).

---

## Настройка IP в приложении

Открой `app/src/config.js` и замени:
```js
export const SERVER_URL = 'http://192.168.1.5:3000';
//                                   ^^^^^^^^^^^
//                          твой IP из Termux
```

После этого пересобери APK через Actions.

---

## Данные

Все данные хранятся в `server/db.json` (создаётся автоматически).  
Фотки — в `server/uploads/`.

---

## Админ-панель

Пароль: `19376`  
Доступ: Профиль → маленькая кнопка "a" внизу слева → ввести пароль.
