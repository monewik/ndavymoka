/**
 * Заявки с сайта в Telegram.
 * Форма «Обсудить задачу» на сайте отправляет сюда имя, контакт и текст задачи,
 * а скрипт присылает их вам сообщением от вашего бота.
 *
 * Установка (около 10 минут):
 * 1. В Telegram у @BotFather: /newbot, придумайте имя. Скопируйте токен.
 *    Напишите своему новому боту любое сообщение (например, /start) — иначе он не сможет вам писать.
 * 2. Откройте script.google.com → «Новый проект», вставьте этот код целиком, сохраните.
 * 3. «Настройки проекта» (шестерёнка) → «Свойства скрипта» → добавьте BOT_TOKEN со значением токена.
 * 4. Вверху выберите функцию findChatId → «Выполнить», разрешите доступ.
 *    В журнале появится строка вида «123456789 — ваш_ник». Добавьте свойство CHAT_ID с этим числом.
 * 5. Выберите функцию testSend → «Выполнить». Бот должен прислать тестовую заявку.
 * 6. «Начать развертывание → Новое развертывание → Веб-приложение».
 *    Выполнять от имени: «Я». У кого есть доступ: «Все». Скопируйте адрес (…/exec)
 *    и вставьте его в index.html в строку const LEAD_ENDPOINT = "";
 * После правки кода: «Управление развертываниями → карандаш → Новая версия» — адрес не изменится.
 */
const MAX_PER_HOUR = 20; // защита от спама: не больше заявок в час со всего сайта

/* Сайт отправляет заявку так: подключает этот адрес как скрипт (?callback=…&name=…&contact=…&text=…)
   и получает ответ вызовом функции. Так браузер не блокирует ответ. Без callback — просто надпись. */
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!p.callback) return ContentService.createTextOutput("Бот заявок работает. Сайт отправляет сюда заявки, открывать этот адрес не нужно.");
  const cb = String(p.callback).replace(/[^\w$.]/g, "").slice(0, 60);
  return ContentService.createTextOutput(cb + "(" + JSON.stringify(lead_(p)) + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

/* Тот же приём заявки обычным POST-запросом (на будущее, например из другой формы). */
function doPost(e) {
  let d = {};
  try { d = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) {}
  return out_(lead_(d));
}

function lead_(d) {
  try {
    const clean = (v, n) => String(v || "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, n);
    const name = clean(d.name, 80), contact = clean(d.contact, 80), text = clean(d.text, 2000), page = clean(d.page, 60);
    if (!name || !contact || text.length < 5) return { ok: false, error: "empty" };
    const cache = CacheService.getScriptCache(), n = Number(cache.get("leads") || 0);
    if (n >= MAX_PER_HOUR) return { ok: false, error: "rate" };
    cache.put("leads", String(n + 1), 3600);
    const msg = "🟢 Заявка с сайта\n\n" + name + "\nКонтакт: " + contact + "\n\n" + text + (page && page !== "/" ? "\n\nСтраница: " + page : "");
    return { ok: send_(msg) };
  } catch (err) {
    return { ok: false, error: "server" };
  }
}

/* Показывает в журнале чаты, которые писали боту: нужен номер вашего чата для CHAT_ID. */
function findChatId() {
  const r = tg_("getUpdates", {});
  if (!r.ok) return Logger.log("Telegram не принял токен: " + (r.description || "") + ". Проверьте свойство BOT_TOKEN.");
  if (!r.result.length) return Logger.log("Сообщений нет. Напишите боту /start и запустите снова.");
  r.result.forEach((u) => { const m = u.message || u.edited_message; if (m) Logger.log(m.chat.id + " — " + (m.chat.username || m.chat.first_name || "")); });
}

/* Проверка настройки: пишет в журнал, что именно не так. */
function testSend() {
  const p = PropertiesService.getScriptProperties(), keys = p.getKeys();
  if (!p.getProperty("BOT_TOKEN")) return Logger.log("Нет свойства BOT_TOKEN. Сейчас в свойствах: " + (keys.join(", ") || "пусто") + ". Название — латиницей, заглавными, без пробелов.");
  const me = tg_("getMe", {});
  if (!me.ok) return Logger.log("Telegram не принял токен: " + (me.description || "нет ответа") + ". Скопируйте токен у @BotFather заново, без пробелов и кавычек.");
  if (!p.getProperty("CHAT_ID")) return Logger.log("Токен верный (бот @" + me.result.username + "), но нет свойства CHAT_ID. Напишите боту /start и запустите findChatId.");
  const r = tg_("sendMessage", { chat_id: p.getProperty("CHAT_ID").trim(), text: "🟢 Тестовая заявка с сайта\n\nЕсли вы это видите, всё настроено." });
  Logger.log(r.ok ? "Отправлено: проверьте Telegram." : "Telegram ответил: " + (r.description || "нет ответа") + ". Если «chat not found» — напишите боту /start и проверьте число в CHAT_ID.");
}

function send_(text) {
  const chat = PropertiesService.getScriptProperties().getProperty("CHAT_ID");
  return !!(chat && tg_("sendMessage", { chat_id: chat.trim(), text: text.slice(0, 4000) }).ok);
}
function tg_(method, data) {
  const token = (PropertiesService.getScriptProperties().getProperty("BOT_TOKEN") || "").trim();
  const res = UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/" + method, { method: "post", contentType: "application/json", payload: JSON.stringify(data), muteHttpExceptions: true });
  try { return JSON.parse(res.getContentText()); } catch (e) { return { ok: false }; }
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
