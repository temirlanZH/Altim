"use client";
import { useCallback, useRef, useState } from "react";
import { MAX_CLIENT_MESSAGES, type Booking, type ChatTurn } from "@/lib/niches";

export type Line = { r: "c" | "m" | "sys"; t: string; skip?: boolean };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) return { ok: false, error: data.error || "Не удалось получить ответ. Отправьте сообщение ещё раз." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Проверьте интернет и отправьте ещё раз." };
  }
}

export const historyOf = (ls: Line[]): ChatTurn[] =>
  ls.filter((l) => !l.skip && l.r !== "sys").map((l) => ({ r: l.r as "c" | "m", t: l.t }));

type Options = {
  /** Поля компании, которые уходят на сервер вместе с историей. */
  payload: () => Record<string, unknown>;
  onBooked?: (b: Booking, history: ChatTurn[], run: number) => void;
};

/** Состояние диалога с ботом: сообщения, «печатает», запись, лимит. */
export function useChat(opts: Options) {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState<Booking | null>(null);
  const [note, setNote] = useState("");
  const runId = useRef(0);

  const reset = useCallback((greeting: string) => {
    runId.current++;
    setLines([{ r: "m", t: greeting }]);
    setBooked(null);
    setTyping(false);
    setBusy(false);
    setNote("");
  }, []);

  async function ask(text: string) {
    if (busy) return;
    if (lines.filter((l) => l.r === "c" && !l.skip).length >= MAX_CLIENT_MESSAGES) {
      setNote(`Лимит демо — ${MAX_CLIENT_MESSAGES} сообщений. Начните диалог заново.`);
      return;
    }
    const run = runId.current;
    const next: Line[] = [...lines, { r: "c", t: text }];
    setLines(next);
    setBusy(true);
    setTyping(true);
    const res = await post<{ messages: string[]; booked: boolean; booking: Booking }>("/api/chat", {
      ...opts.payload(),
      history: historyOf(next),
      booked,
    });
    if (run !== runId.current) return;
    if (!res.ok) {
      setTyping(false);
      setLines((ls) => [...ls.slice(0, -1), { ...ls[ls.length - 1], skip: true }, { r: "m", t: res.error, skip: true }]);
      setBusy(false);
      return;
    }
    const { messages, booking } = res.data;
    await wait(300 + Math.min(messages[0].length * 11, 1500));
    for (let i = 0; i < messages.length; i++) {
      if (run !== runId.current) return;
      if (i > 0) {
        setTyping(true);
        await wait(450 + Math.min(messages[i].length * 11, 1500));
      }
      setTyping(false);
      setLines((ls) => [...ls, { r: "m", t: messages[i] }]);
    }
    if (run !== runId.current) return;
    if (!booked && res.data.booked) {
      setBooked(booking);
      opts.onBooked?.(booking, historyOf([...next, ...messages.map((t) => ({ r: "m" as const, t }))]), run);
    } else if (booked && res.data.booked) setBooked(booking);
    setBusy(false);
  }

  const addSystem = (t: string) => setLines((ls) => [...ls, { r: "sys", t, skip: true }]);

  return { lines, typing, busy, booked, note, ask, reset, addSystem, runId };
}
