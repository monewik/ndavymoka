# Сайт-портфолио

Статический сайт: `index.html` и `assets/`. Публикуется через GitHub Pages (Settings → Pages → Deploy from a branch → `main`, папка `/`).

- Контакты задаются в начале скрипта в `index.html`: `const CONTACTS = { telegram: "..." }` (можно добавить `email` и `phone`).
- Сайт закрыт от поисковиков строкой `<meta name="robots" content="noindex, nofollow">`. Чтобы он появился в Яндексе и Google, удалите её.
- Все примеры на сайте на вымышленных данных.
- Форма «Обсудить задачу» в правом нижнем углу отправляет заявку в Telegram через Google Apps Script: код и инструкция в `bot/lead-bot.gs`. Адрес веб-приложения вставляется в `index.html` в строку `const LEAD_ENDPOINT = "";`. Пока он пустой, форма предлагает написать в Telegram напрямую.
