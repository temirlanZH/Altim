"use client";
import { useEffect, useState } from "react";
import { ALTIM_GREETING } from "@/lib/niches";
import { ChatView } from "./ChatView";
import { useChat } from "./useChat";

const QUICK = ["Как работает ИИ-менеджер?", "Есть кейсы в моей нише?", "Хочу созвон"];

/** Плавающий чат сайта: собственный ИИ-ассистент altim записывает на разбор процесса. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const chat = useChat({ payload: () => ({ niche: "altim" }) });
  const { reset, lines } = chat;

  useEffect(() => {
    if (open && lines.length === 0) reset(ALTIM_GREETING);
  }, [open, lines.length, reset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="widget" role="dialog" aria-label="Чат с altim">
          <div className="ui-head">
            <div className="ava">A</div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <b>altim</b>
              <span className="online">{chat.booked ? "созвон назначен" : "ИИ-ассистент · онлайн"}</span>
            </div>
            <button type="button" aria-label="Закрыть чат" onClick={() => setOpen(false)}>×</button>
          </div>
          <ChatView
            lines={chat.lines}
            typing={chat.typing}
            quick={chat.booked || chat.lines.length > 1 ? [] : QUICK}
            note={chat.note}
            inputId="w-msg"
            onSend={chat.ask}
            placeholder="Напишите сообщение…"
          />
        </div>
      )}
      <button className="fab" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ava" aria-hidden="true">A</span>
        {open ? "Свернуть чат" : "Спросить altim"}
      </button>
    </>
  );
}
