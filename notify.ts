import "server-only";
import type { Booking, ChatTurn } from "@/lib/niches";

/**
 * Отправляет заявку с сайта в Telegram, если заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
 * Без них заявка только пишется в лог сервера.
 */
export async function notifyLead(b: Booking, history: ChatTurn[]) {
  const text = [
    "Новая заявка с сайта altim",
    `Имя: ${b.name || "—"}`,
    `Контакт: ${b.phone || "—"}`,
    `Бизнес: ${b.service || "—"}`,
    `Время созвона: ${b.datetime || "—"}`,
    "",
    "Диалог:",
    ...history.slice(-12).map((m) => (m.r === "c" ? "Клиент: " : "Бот: ") + m.t),
  ].join("\n").slice(0, 3900);

  await sendTelegram(text);
}

/** Отправка текста в Telegram-чат команды; без настроек — только лог. */
export async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.info("[lead]", text);
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[lead] Telegram ответил", res.status);
  } catch (e) {
    console.error("[lead] не удалось отправить в Telegram", e);
  }
}
