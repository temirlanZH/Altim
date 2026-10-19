import "server-only";
import type { AdRow, Deal, Provider, Snapshot } from "@/lib/cabinet/sources";
import { dayKey } from "@/lib/cabinet/sources";
import { num, parseAds } from "@/lib/cabinet/util";
import { BadInput } from "./guard";

/*
 * Коннекторы внешних систем для дашбордов кабинета.
 * Запросы идут только на адреса из белого списка (Graph API Meta, *.amocrm.ru / *.kommo.com,
 * *.bitrix24.*, docs.google.com), поэтому сервер нельзя заставить сходить во внутреннюю сеть.
 * Токены приходят в теле запроса, используются один раз и нигде не сохраняются на сервере.
 */

const TIMEOUT_MS = 15_000;
const META_VERSION = process.env.META_GRAPH_VERSION || "v21.0";

export class UpstreamError extends Error {}

async function getJson(url: string, init: RequestInit = {}, label: string): Promise<unknown> {
  let r: Response;
  try {
    r = await fetch(url, { ...init, redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (e) {
    throw new UpstreamError(`${label} не ответил${e instanceof Error && e.name === "TimeoutError" ? " за 15 секунд" : ""}. Проверьте адрес.`);
  }
  if (r.status === 204) return null;
  const text = await r.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new UpstreamError(`${label} вернул не JSON (код ${r.status}). Проверьте адрес.`);
  }
  if (!r.ok) {
    const b = body as { error?: { message?: string } | string; error_description?: string; title?: string; detail?: string } | null;
    const msg = typeof b?.error === "object" ? b.error?.message : b?.error_description || b?.detail || b?.title || (typeof b?.error === "string" ? b.error : "");
    if (r.status === 401 || r.status === 403) throw new UpstreamError(`${label}: нет доступа. Проверьте токен и права.${msg ? ` (${msg})` : ""}`);
    throw new UpstreamError(`${label}: ошибка ${r.status}${msg ? ` — ${msg}` : ""}`);
  }
  return body;
}

const str = (v: unknown, field: string, max = 600) => {
  if (typeof v !== "string" || !v.trim()) throw new BadInput(`Заполните поле «${field}»`);
  return v.trim().slice(0, max);
};

/* ---------------- Meta Ads ---------------- */

const LEAD_ACTIONS = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead", "onsite_conversion.messaging_conversation_started_7d"];

type MetaRow = { campaign_name?: string; date_start?: string; spend?: string; impressions?: string; clicks?: string; actions?: { action_type: string; value: string }[] };

async function meta(cfg: Record<string, unknown>): Promise<Snapshot> {
  const raw = str(cfg.account, "ID рекламного аккаунта", 40).replace(/^act_/, "");
  if (!/^\d{5,20}$/.test(raw)) throw new BadInput("ID аккаунта — это цифры, например act_1234567890");
  const token = str(cfg.token, "Токен доступа", 600);
  const q = new URLSearchParams({
    level: "campaign",
    fields: "campaign_name,spend,impressions,clicks,actions",
    date_preset: "last_30d",
    time_increment: "1",
    limit: "500",
  });
  let url: string | null = `https://graph.facebook.com/${META_VERSION}/act_${raw}/insights?${q}`;
  const ads: AdRow[] = [];
  for (let page = 0; url && page < 10; page++) {
    const body = (await getJson(url, { headers: { Authorization: `Bearer ${token}` } }, "Meta")) as { data?: MetaRow[]; paging?: { next?: string } } | null;
    for (const r of body?.data ?? []) {
      const leads = (r.actions ?? []).filter((a) => LEAD_ACTIONS.includes(a.action_type)).reduce((s, a) => Math.max(s, num(a.value) || 0), 0);
      ads.push({ source: "meta", campaign: r.campaign_name || "Без названия", channel: "Instagram / Facebook", date: r.date_start || "", spend: num(r.spend) || 0, impressions: num(r.impressions) || 0, clicks: num(r.clicks) || 0, leads, revenue: 0 });
    }
    const next = body?.paging?.next;
    url = next && next.startsWith("https://graph.facebook.com/") ? next : null;
  }
  return { fetchedAt: Date.now(), account: `act_${raw}`, deals: [], ads, demo: false, note: ads.length ? undefined : "За последние 30 дней в аккаунте нет показов." };
}

/* ---------------- amoCRM ---------------- */

type AmoLead = { id: number; name?: string; price?: number; status_id?: number; pipeline_id?: number; created_at?: number };
type AmoPipeline = { id: number; _embedded?: { statuses?: { id: number; name: string }[] } };

async function amocrm(cfg: Record<string, unknown>): Promise<Snapshot> {
  const domain = str(cfg.domain, "Адрес аккаунта", 120).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  if (!/^[a-z0-9-]{2,63}\.(amocrm\.ru|amocrm\.com|kommo\.com)$/.test(domain)) throw new BadInput("Адрес вида company.amocrm.ru или company.kommo.com");
  const token = str(cfg.token, "Долгосрочный токен", 2000);
  const headers = { Authorization: `Bearer ${token}` };
  const base = `https://${domain}/api/v4`;

  const pipes = (await getJson(`${base}/leads/pipelines`, { headers }, "amoCRM")) as { _embedded?: { pipelines?: AmoPipeline[] } } | null;
  const statusName = new Map<number, string>();
  for (const p of pipes?._embedded?.pipelines ?? []) for (const s of p._embedded?.statuses ?? []) statusName.set(s.id, s.name);

  const deals: Deal[] = [];
  for (let page = 1; page <= 20; page++) {
    const body = (await getJson(`${base}/leads?limit=250&page=${page}&with=source&order[created_at]=desc`, { headers }, "amoCRM")) as { _embedded?: { leads?: AmoLead[] }; _links?: { next?: unknown } } | null;
    const list = body?._embedded?.leads ?? [];
    for (const l of list) {
      const st = l.status_id ?? 0;
      const status: Deal["status"] = st === 142 ? "won" : st === 143 ? "lost" : "open";
      deals.push({ source: "amocrm", id: String(l.id), name: l.name || `Сделка #${l.id}`, status, stage: statusName.get(st) ?? (status === "won" ? "Успешно реализовано" : status === "lost" ? "Закрыто и не реализовано" : `Этап ${st}`), amount: l.price || 0, channel: "amoCRM", createdAt: (l.created_at ?? 0) * 1000 });
    }
    if (!body?._links?.next || list.length < 250) break;
  }
  return { fetchedAt: Date.now(), account: domain, deals, ads: [], demo: false, note: deals.length ? undefined : "В аккаунте нет сделок." };
}

/* ---------------- Битрикс24 ---------------- */

type BxDeal = { ID: string; TITLE?: string; OPPORTUNITY?: string; STAGE_ID?: string; STAGE_SEMANTIC_ID?: "P" | "S" | "F"; SOURCE_ID?: string; DATE_CREATE?: string };

async function bitrix24(cfg: Record<string, unknown>): Promise<Snapshot> {
  let u: URL;
  try {
    u = new URL(str(cfg.webhook, "Входящий вебхук", 400));
  } catch {
    throw new BadInput("Вставьте адрес вебхука целиком, начиная с https://");
  }
  if (u.protocol !== "https:" || u.port || u.username || !/^[a-z0-9-]+\.bitrix24\.(ru|kz|by|ua|com|de|eu|es|fr|it|pl|uk|in|br|tr|vn|id|jp|cn|ae)$/i.test(u.hostname) || !/^\/rest\/\d+\/[A-Za-z0-9_]+\/?$/.test(u.pathname))
    throw new BadInput("Адрес вида https://company.bitrix24.kz/rest/1/код/");
  const base = `https://${u.hostname}${u.pathname.replace(/\/?$/, "/")}`;

  const stages = (await getJson(`${base}crm.status.list.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filter: { ENTITY_ID: "DEAL_STAGE" } }) }, "Битрикс24")) as { result?: { STATUS_ID: string; NAME: string }[] } | null;
  const stageName = new Map((stages?.result ?? []).map((s) => [s.STATUS_ID, s.NAME]));

  const deals: Deal[] = [];
  let start: number | undefined = 0;
  for (let page = 0; start != null && page < 20; page++) {
    const body = (await getJson(
      `${base}crm.deal.list.json`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: { DATE_CREATE: "DESC" }, select: ["ID", "TITLE", "OPPORTUNITY", "STAGE_ID", "STAGE_SEMANTIC_ID", "SOURCE_ID", "DATE_CREATE"], start }) },
      "Битрикс24",
    )) as { result?: BxDeal[]; next?: number; error_description?: string } | null;
    for (const d of body?.result ?? []) {
      const status: Deal["status"] = d.STAGE_SEMANTIC_ID === "S" ? "won" : d.STAGE_SEMANTIC_ID === "F" ? "lost" : "open";
      deals.push({ source: "bitrix24", id: d.ID, name: d.TITLE || `Сделка #${d.ID}`, status, stage: stageName.get(d.STAGE_ID ?? "") ?? d.STAGE_ID ?? "—", amount: num(d.OPPORTUNITY) || 0, channel: d.SOURCE_ID || "Битрикс24", createdAt: d.DATE_CREATE ? Date.parse(d.DATE_CREATE) || 0 : 0 });
    }
    start = body?.next;
  }
  return { fetchedAt: Date.now(), account: u.hostname, deals, ads: [], demo: false, note: deals.length ? undefined : "В CRM нет сделок." };
}

/* ---------------- Google Таблица (CSV) ---------------- */

async function sheets(cfg: Record<string, unknown>): Promise<Snapshot> {
  let u: URL;
  try {
    u = new URL(str(cfg.url, "Ссылка на таблицу", 600));
  } catch {
    throw new BadInput("Вставьте ссылку целиком, начиная с https://");
  }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com" || !u.pathname.startsWith("/spreadsheets/")) throw new BadInput("Нужна ссылка docs.google.com/spreadsheets на опубликованный CSV");
  const channel = typeof cfg.channel === "string" ? cfg.channel.trim().slice(0, 60) : "";

  // Google отдаёт опубликованный CSV через редирект на googleusercontent.com — проверяем каждый шаг.
  let url = u.toString();
  let text = "";
  for (let hop = 0; hop < 4; hop++) {
    let r: Response;
    try {
      r = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    } catch {
      throw new UpstreamError("Google Таблица не ответила. Проверьте ссылку.");
    }
    if (r.status >= 300 && r.status < 400) {
      const next = new URL(r.headers.get("location") ?? "", url);
      if (next.protocol !== "https:" || !/(^|\.)(docs\.google\.com|googleusercontent\.com)$/.test(next.hostname)) throw new UpstreamError("Таблица перенаправила на неожиданный адрес");
      url = next.toString();
      continue;
    }
    if (!r.ok) throw new UpstreamError(`Таблица недоступна (код ${r.status}). Опубликуйте лист: Файл → Поделиться → Опубликовать в интернете → CSV.`);
    if (/text\/html/.test(r.headers.get("content-type") ?? "")) throw new UpstreamError("По ссылке страница, а не CSV. Выберите формат CSV при публикации.");
    text = (await r.text()).slice(0, 2_000_000);
    break;
  }
  const rows = parseAds(text, channel);
  if (!rows.length) throw new UpstreamError("Не нашли колонки «Кампания» и «Расход». Проверьте заголовки таблицы.");
  const ads: AdRow[] = rows.map((c) => {
    const t = Date.parse(c.period);
    return { source: "sheets", campaign: c.campaign, channel: c.platform, date: Number.isFinite(t) ? dayKey(t) : "", spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads, revenue: c.revenue };
  });
  return { fetchedAt: Date.now(), account: "Google Таблица", deals: [], ads, demo: false };
}

export const CONNECTORS: Record<Provider, (cfg: Record<string, unknown>) => Promise<Snapshot>> = { meta, amocrm, bitrix24, sheets };
