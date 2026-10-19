import { PLATFORMS, type Campaign, type PriceItem } from "./types";

export const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("ru-RU") : "—");
export const money = (n: number) => (Number.isFinite(n) ? `${fmt(n)} ₸` : "—");
export const pct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(Math.abs(n) < 0.1 ? 1 : 0).replace(".", ",")}%` : "—");
export const dt = (ts: number) => new Date(ts).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Число из строки вида «35 000 ₸», «1,310», «12,5». */
export function num(s: unknown): number {
  if (typeof s === "number") return s;
  let t = String(s ?? "").replace(/[  ]/g, " ").trim();
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t.replace(/\s/g, ""))) t = t.replace(/,/g, "");
  const m = t.match(/-?\d[\d ]*(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(/ /g, "").replace(",", ".")) : NaN;
}

export function splitCells(line: string, d: string) {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === d) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const PRICE_RE = /^(?:от\s*)?\d[\d\s .,]*\s*(?:₸|тг\.?|тенге|kzt|руб\.?|₽|\$|сом|%)?$|^бесплатно$/i;
const normPrice = (s: string) => {
  s = s.trim();
  if (/^\d[\d\s .,]*$/.test(s)) {
    const n = num(s);
    if (Number.isFinite(n)) return `${fmt(n)} ₸`;
  }
  return s.replace(/\s*(тг\.?|тенге|kzt)$/i, " ₸");
};

/** Прайс из текста: строки «Услуга — цена», таблицы через Tab или «;», заголовки разделов. */
export function parsePrices(text: string): PriceItem[] {
  const rows: PriceItem[] = [];
  let cat = "";
  for (const raw of text.replace(/\r/g, "").split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    const d = l.includes("\t") ? "\t" : l.split(";").length > 1 ? ";" : null;
    if (d) {
      const cells = splitCells(l, d);
      const pi = cells.findIndex((c, i) => i > 0 && PRICE_RE.test(c));
      if (pi < 0) {
        if (!/цена|price|стоимость/i.test(l) && cells.filter(Boolean).length === 1) cat = cells.find(Boolean)!.replace(/:$/, "");
        continue;
      }
      const before = cells.slice(0, pi).filter(Boolean);
      const name = before.at(-1) || "";
      if (name) rows.push({ cat: before.length > 1 ? before[0] : cat, name, price: normPrice(cells[pi]), note: cells.slice(pi + 1).filter(Boolean).join(", ") });
      continue;
    }
    const m = l.match(/^(.+?)\s*(?:[—–:|]|\s-\s|\.{2,})\s*((?:от\s*)?\d[\d\s .,]*\s*(?:₸|тг\.?|тенге|kzt|руб\.?|₽|\$|сом)?|бесплатно)\s*(?:[(,;.]\s*(.+?)\)?\s*)?$/i);
    if (m) rows.push({ cat, name: m[1].replace(/^[-•*\d.)\s]+/, "").trim(), price: normPrice(m[2]), note: (m[3] || "").trim() });
    else if (!/\d/.test(l) && l.length < 60) cat = l.replace(/[:：]$/, "");
  }
  return rows;
}

export const priceText = (p: PriceItem[]) =>
  p.filter((r) => r.name).map((r) => `${r.cat ? r.cat + " · " : ""}${r.name} — ${r.price || "цена по запросу"}${r.note ? ` (${r.note})` : ""}`).join("\n");

export const platformOf = (s: string) => {
  const v = s.toLowerCase();
  if (/meta|facebook|instagram|fb|инста|фейсб/.test(v)) return PLATFORMS[0];
  if (/tik/.test(v)) return PLATFORMS[1];
  if (/google|гугл/.test(v)) return PLATFORMS[2];
  if (/2gis|2гис/.test(v)) return PLATFORMS[3];
  if (/яндекс|yandex/.test(v)) return PLATFORMS[4];
  if (/vk|вк/.test(v)) return PLATFORMS[5];
  return s || PLATFORMS[6];
};

const AD_COLS: [keyof Campaign, RegExp][] = [
  ["campaign", /кампан|campaign|назван|объявлен|ad set|группа|креатив/i],
  ["platform", /площад|platform|канал|источник|source|network|сеть/i],
  ["period", /период|дата|date|day|день|reporting|начал/i],
  ["spend", /расход|потрач|spent|spend|cost|затрат|бюджет|сумма/i],
  ["impressions", /показ|impress/i],
  ["clicks", /клик|click|переход/i],
  ["leads", /лид|lead|заявк|результат|result|конверс|conversion|обращ/i],
  ["sales", /продаж|sale|покуп|purchase|оплат|сделк/i],
  ["revenue", /выручк|revenue|доход|ценност|value/i],
];
const SKIP = /( за |per |cp[cmla]\b|ctr|частот|frequency|охват|reach|%|стоимость за|цена за)/i;

/** Отчёт рекламного кабинета (CSV/TSV, скопированная таблица) → кампании. */
export function parseAds(text: string, plat: string): Omit<Campaign, "id">[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const d = ["\t", ";", ","].map((s) => [s, splitCells(lines[0], s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows = lines.map((l) => splitCells(l, d));
  let hi = -1;
  let map: Partial<Record<keyof Campaign, number>> = {};
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const mp: Partial<Record<keyof Campaign, number>> = {};
    rows[i].forEach((h, j) => {
      if (!h || SKIP.test(h)) return;
      for (const [k, re] of AD_COLS) if (!(k in mp) && re.test(h)) { mp[k] = j; break; }
    });
    if (Object.keys(mp).length >= 3 && "spend" in mp) { hi = i; map = mp; break; }
  }
  if (hi < 0) return [];
  const out: Omit<Campaign, "id">[] = [];
  for (const r of rows.slice(hi + 1)) {
    const g = (k: keyof Campaign) => (map[k] != null ? r[map[k]!] ?? "" : "");
    const name = g("campaign");
    if (!name || /^(итого|всего|total)/i.test(name)) continue;
    const spend = num(g("spend"));
    if (!Number.isFinite(spend)) continue;
    const n = (k: keyof Campaign) => { const v = num(g(k)); return Number.isFinite(v) ? v : 0; };
    out.push({ platform: plat || platformOf(g("platform")), campaign: name, period: g("period"), spend, impressions: n("impressions"), clicks: n("clicks"), leads: n("leads"), sales: n("sales"), revenue: n("revenue"), demo: false, createdAt: Date.now() });
  }
  return out;
}

export function metrics(c: Pick<Campaign, "spend" | "impressions" | "clicks" | "leads" | "sales" | "revenue">) {
  return {
    ctr: c.impressions ? c.clicks / c.impressions : NaN,
    cpc: c.clicks ? c.spend / c.clicks : NaN,
    cpl: c.leads ? c.spend / c.leads : NaN,
    cr: c.leads ? c.sales / c.leads : NaN,
    romi: c.spend && c.revenue > 0 ? (c.revenue - c.spend) / c.spend : NaN,
  };
}

export function grade(c: Campaign, target: number): [tone: string, label: string] {
  const { cpl } = metrics(c);
  if (!c.leads && c.spend > 0) return ["hot", "нет лидов"];
  if (cpl <= target * 0.8) return ["on", "масштабировать"];
  if (cpl <= target * 1.2) return ["acc", "в норме"];
  return ["hot", "дорогой лид"];
}
