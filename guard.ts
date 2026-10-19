import "server-only";
import { NICHES, customNiche, isNicheId, MAX_CLIENT_MESSAGES, type Booking, type ChatTurn } from "@/lib/niches";
import { ALTIM_NICHE } from "./altim-agent";
import type { DemoCompany } from "./prompts";

/*
 * Ограничение частоты запросов по IP: скользящее окно в памяти процесса.
 * На Vercel у каждого экземпляра функции своя память, поэтому лимит
 * приблизительный. Для продакшена замените на Upstash Redis (см. README).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export class BadInput extends Error {}

const text = (v: unknown, max: number, field: string) => {
  if (typeof v !== "string") throw new BadInput(`Поле ${field} должно быть строкой`);
  return v.trim().slice(0, max);
};

export function parseCompany(body: Record<string, unknown>): DemoCompany {
  if (body.niche === "altim")
    return { niche: ALTIM_NICHE, company: ALTIM_NICHE.name, prices: ALTIM_NICHE.prices, info: ALTIM_NICHE.info, own: true };
  if (body.niche === "custom") {
    const niche = customNiche(text(body.label ?? "", 80, "label"), text(body.goal ?? "", 160, "goal"));
    return {
      niche,
      company: text(body.company ?? "", 80, "company") || "Компания",
      prices: text(body.prices ?? "", 4000, "prices"),
      info: text(body.info ?? "", 1500, "info"),
    };
  }
  if (!isNicheId(body.niche)) throw new BadInput("Неизвестная ниша");
  const niche = NICHES[body.niche];
  return {
    niche,
    company: text(body.company ?? "", 80, "company") || niche.name,
    prices: text(body.prices ?? "", 4000, "prices"),
    info: text(body.info ?? "", 800, "info"),
  };
}

export function parseHistory(v: unknown): ChatTurn[] {
  if (!Array.isArray(v) || v.length === 0 || v.length > MAX_CLIENT_MESSAGES * 2 + 2)
    throw new BadInput("Некорректная история диалога");
  const turns = v.map((m) => {
    const r = (m as ChatTurn)?.r;
    if (r !== "c" && r !== "m") throw new BadInput("Некорректная история диалога");
    return { r, t: text((m as ChatTurn).t, 1500, "history") };
  });
  if (turns.filter((m) => m.r === "c").length > MAX_CLIENT_MESSAGES)
    throw new BadInput(`Лимит демо — ${MAX_CLIENT_MESSAGES} сообщений. Начните диалог заново.`);
  return turns;
}

export function parseBooking(v: unknown): Booking | null {
  if (!v || typeof v !== "object") return null;
  const b = v as Record<string, unknown>;
  const f = (k: string) => (typeof b[k] === "string" ? (b[k] as string).slice(0, 200) : "");
  return { name: f("name"), phone: f("phone"), service: f("service"), datetime: f("datetime"), price: f("price") };
}
