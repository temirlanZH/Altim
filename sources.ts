import { BOOKED_STATUSES, STATUS_BY_ID, type Campaign, type Lead } from "./types";

/*
 * Единая модель данных для дашбордов. Каждый источник (CRM altim, Meta Ads, amoCRM,
 * Битрикс24, Google Таблица) приводится к двум видам строк: сделки и рекламные расходы.
 * Сервер отдаёт уже нормализованный снимок (см. app/api/connect), дашборды считают только по нему.
 */

export type Provider = "meta" | "amocrm" | "bitrix24" | "sheets";
export type SourceId = "altim" | Provider;

export type Deal = {
  source: SourceId;
  id: string;
  name: string;
  /** open — в работе, won — успешно, lost — отказ */
  status: "open" | "won" | "lost";
  stage: string;
  amount: number;
  channel: string;
  createdAt: number;
};

export type AdRow = {
  source: SourceId;
  campaign: string;
  channel: string;
  /** день в формате YYYY-MM-DD; пусто, если отчёт без разбивки по дням */
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  revenue: number;
};

export type Snapshot = { fetchedAt: number; account: string; deals: Deal[]; ads: AdRow[]; demo: boolean; note?: string };

export type Integration = {
  provider: Provider;
  /** настройки подключения: токены и адреса; хранятся у владельца кабинета */
  config: Record<string, string>;
  snapshot: Snapshot | null;
  error: string;
  connectedAt: number;
};

export type Integrations = Partial<Record<Provider, Integration>>;

export const SOURCE_LABEL: Record<SourceId, string> = {
  altim: "CRM altim",
  meta: "Meta Ads",
  amocrm: "amoCRM",
  bitrix24: "Битрикс24",
  sheets: "Google Таблица",
};

export type Field = { key: string; label: string; placeholder: string; secret?: boolean; hint?: string };

export const PROVIDERS: { id: Provider; name: string; what: string; fields: Field[]; help: string; kind: "ads" | "crm" | "any" }[] = [
  {
    id: "meta",
    name: "Meta Ads",
    kind: "ads",
    what: "Расход, показы, клики и лиды по кампаниям Instagram и Facebook за 30 дней, по дням.",
    fields: [
      { key: "account", label: "ID рекламного аккаунта", placeholder: "act_1234567890 или 1234567890" },
      { key: "token", label: "Токен доступа (ads_read)", placeholder: "EAAG…", secret: true, hint: "Business Manager → Системные пользователи → Сгенерировать токен с правом ads_read" },
    ],
    help: "Нужен токен системного пользователя Business Manager с правом ads_read и доступом к рекламному аккаунту.",
  },
  {
    id: "amocrm",
    name: "amoCRM",
    kind: "crm",
    what: "Сделки, этапы, суммы и источники. Успешно (142) и Закрыто (143) считаются автоматически.",
    fields: [
      { key: "domain", label: "Адрес аккаунта", placeholder: "company.amocrm.ru" },
      { key: "token", label: "Долгосрочный токен", placeholder: "eyJ0eXAiOiJKV1Qi…", secret: true, hint: "amoCRM → Настройки → Интеграции → Создать интеграцию → Ключи и доступы → Долгосрочный токен" },
    ],
    help: "Создайте внешнюю интеграцию в amoCRM и выпустите долгосрочный токен. Доступ только на чтение сделок.",
  },
  {
    id: "bitrix24",
    name: "Битрикс24",
    kind: "crm",
    what: "Сделки из CRM: стадия, сумма, источник. Успешные и проваленные определяются по семантике стадии.",
    fields: [
      { key: "webhook", label: "Входящий вебхук", placeholder: "https://company.bitrix24.kz/rest/1/abc123xyz/", secret: true, hint: "Битрикс24 → Разработчикам → Другое → Входящий вебхук, права: CRM" },
    ],
    help: "Создайте входящий вебхук с правом CRM и вставьте его адрес целиком.",
  },
  {
    id: "sheets",
    name: "Google Таблица",
    kind: "any",
    what: "Любой отчёт: выгрузка TikTok, Google Ads, 2GIS или сделки из другой CRM. Колонки распознаются по названиям.",
    fields: [
      { key: "url", label: "Ссылка на таблицу в CSV", placeholder: "https://docs.google.com/spreadsheets/d/…/pub?output=csv", hint: "Файл → Поделиться → Опубликовать в интернете → CSV" },
      { key: "channel", label: "Площадка (необязательно)", placeholder: "TikTok, Google Ads…" },
    ],
    help: "Опубликуйте лист в формате CSV и вставьте ссылку. Подойдёт отчёт с колонками «Кампания», «Расход», «Лиды».",
  },
];

/* ---------- данные самого кабинета ---------- */

export function altimDeals(leads: Lead[]): Deal[] {
  return leads.map((l) => ({
    source: "altim",
    id: l.id,
    name: l.name,
    status: l.status === "won" ? "won" : l.status === "lost" ? "lost" : "open",
    stage: STATUS_BY_ID[l.status]?.label ?? l.status,
    amount: l.amount || 0,
    channel: l.source || "—",
    createdAt: l.createdAt,
  }));
}

export function altimAds(campaigns: Campaign[]): AdRow[] {
  return campaigns.map((c) => ({ source: "altim", campaign: c.campaign, channel: c.platform, date: "", spend: c.spend, impressions: c.impressions, clicks: c.clicks, leads: c.leads, revenue: c.revenue }));
}

export const isBooked = (l: Lead) => BOOKED_STATUSES.includes(l.status);

/* ---------- агрегаты ---------- */

export type Data = { deals: Deal[]; ads: AdRow[] };

export function collect(source: SourceId | "all", leads: Lead[], campaigns: Campaign[], integ: Integrations): Data {
  const parts: Data[] = [];
  if (source === "all" || source === "altim") parts.push({ deals: altimDeals(leads), ads: altimAds(campaigns) });
  for (const p of Object.values(integ)) {
    if (!p?.snapshot) continue;
    if (source === "all" || source === p.provider) parts.push({ deals: p.snapshot.deals, ads: p.snapshot.ads });
  }
  return { deals: parts.flatMap((p) => p.deals), ads: parts.flatMap((p) => p.ads) };
}

export function totals(d: Data) {
  const spend = d.ads.reduce((s, a) => s + a.spend, 0);
  const adLeads = d.ads.reduce((s, a) => s + a.leads, 0);
  const clicks = d.ads.reduce((s, a) => s + a.clicks, 0);
  const impressions = d.ads.reduce((s, a) => s + a.impressions, 0);
  const won = d.deals.filter((x) => x.status === "won");
  const lost = d.deals.filter((x) => x.status === "lost");
  const revenue = won.reduce((s, x) => s + x.amount, 0);
  const pipeline = d.deals.filter((x) => x.status === "open").reduce((s, x) => s + x.amount, 0);
  return {
    deals: d.deals.length,
    won: won.length,
    lost: lost.length,
    open: d.deals.length - won.length - lost.length,
    revenue,
    pipeline,
    spend,
    adLeads,
    clicks,
    impressions,
    cpl: adLeads ? spend / adLeads : NaN,
    ctr: impressions ? clicks / impressions : NaN,
    conv: d.deals.length ? won.length / d.deals.length : NaN,
    check: won.length ? revenue / won.length : NaN,
    romi: spend && revenue ? (revenue - spend) / spend : NaN,
  };
}

const DAY = 86_400_000;
export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Лиды и расход по дням за последние n дней: сделки по дате создания, реклама по дате отчёта. */
export function byDay(d: Data, n = 14) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const days = Array.from({ length: n }, (_, i) => {
    const from = start.getTime() - (n - 1 - i) * DAY;
    return { key: dayKey(from), from, deals: 0, won: 0, adLeads: 0, spend: 0 };
  });
  const idx = new Map(days.map((x, i) => [x.key, i]));
  for (const x of d.deals) {
    const i = idx.get(dayKey(x.createdAt));
    if (i == null) continue;
    days[i].deals++;
    if (x.status === "won") days[i].won++;
  }
  for (const a of d.ads) {
    const i = a.date ? idx.get(a.date) : undefined;
    if (i == null) continue;
    days[i].adLeads += a.leads;
    days[i].spend += a.spend;
  }
  return days;
}

/** Группировка рекламы по кампании: расход, лиды, CPL. */
export function byCampaign(d: Data) {
  const m = new Map<string, { campaign: string; source: SourceId; channel: string; spend: number; leads: number; clicks: number; impressions: number; revenue: number }>();
  for (const a of d.ads) {
    const k = `${a.source}|${a.campaign}`;
    const v = m.get(k) ?? { campaign: a.campaign, source: a.source, channel: a.channel, spend: 0, leads: 0, clicks: 0, impressions: 0, revenue: 0 };
    v.spend += a.spend;
    v.leads += a.leads;
    v.clicks += a.clicks;
    v.impressions += a.impressions;
    v.revenue += a.revenue;
    m.set(k, v);
  }
  return [...m.values()].map((v) => ({ ...v, cpl: v.leads ? v.spend / v.leads : NaN })).sort((a, b) => b.spend - a.spend);
}

/** Сделки по каналу: сколько пришло, сколько оплатили, на какую сумму. */
export function byChannel(d: Data) {
  const m = new Map<string, { channel: string; n: number; won: number; sum: number }>();
  for (const x of d.deals) {
    const v = m.get(x.channel) ?? { channel: x.channel, n: 0, won: 0, sum: 0 };
    v.n++;
    if (x.status === "won") { v.won++; v.sum += x.amount; }
    m.set(x.channel, v);
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

/** Сделки по этапам воронки в порядке первого появления. */
export function byStage(d: Data) {
  const m = new Map<string, { stage: string; n: number; sum: number; status: Deal["status"] }>();
  for (const x of d.deals) {
    const v = m.get(x.stage) ?? { stage: x.stage, n: 0, sum: 0, status: x.status };
    v.n++;
    v.sum += x.amount;
    m.set(x.stage, v);
  }
  const rank = { open: 0, won: 1, lost: 2 };
  return [...m.values()].sort((a, b) => rank[a.status] - rank[b.status]);
}

/** Сколько заявок пришло по часам суток (по всем дням) и сколько из них вне рабочего времени. */
export function byHour(leads: Lead[], open = 9, close = 19) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ h, n: 0, booked: 0, night: h < open || h >= close }));
  for (const l of leads) {
    const h = new Date(l.createdAt).getHours();
    hours[h].n++;
    if (isBooked(l)) hours[h].booked++;
  }
  const night = hours.filter((x) => x.night);
  return { hours, nightTotal: night.reduce((s, x) => s + x.n, 0), nightBooked: night.reduce((s, x) => s + x.booked, 0) };
}

/* ---------- демо-снимки: показать дашборды без доступа к настоящим аккаунтам ---------- */

function rnd(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

export function demoSnapshot(p: Provider): Snapshot {
  const r = rnd(p.length * 7919 + 17);
  const now = Date.now();
  const deals: Deal[] = [];
  const ads: AdRow[] = [];
  if (p === "meta" || p === "sheets") {
    const camps = p === "meta"
      ? [["Check-up «Сердце» · 35+", 9000, 3.2], ["Лид-форма: УЗИ", 6000, 2.1], ["Ретаргет: сайт 30 дней", 3500, 1.6], ["Reels: врач отвечает", 5000, 0.9]]
      : [["TikTok: видео врача", 7000, 0.8], ["Google: поиск «кардиолог»", 5500, 1.9], ["2GIS: приоритет", 1500, 0.7]];
    for (let i = 29; i >= 0; i--) {
      const date = dayKey(now - i * DAY);
      for (const [name, base, rate] of camps as [string, number, number][]) {
        const spend = Math.round(base * (0.75 + r() * 0.5));
        const impressions = Math.round(spend * (2.6 + r() * 1.4));
        const clicks = Math.round(impressions * (0.009 + r() * 0.012));
        const leads = Math.max(0, Math.round(rate * (0.5 + r())));
        ads.push({ source: p, campaign: name, channel: p === "meta" ? "Instagram / Facebook" : name.split(":")[0], date, spend, impressions, clicks, leads, revenue: 0 });
      }
    }
  }
  if (p === "amocrm" || p === "bitrix24") {
    const stages = p === "amocrm"
      ? ["Первичный контакт", "Переговоры", "Записан", "Пришёл"]
      : ["Новая", "Подготовка документов", "Счёт выставлен", "В работе"];
    const channels = ["Instagram", "WhatsApp", "Сайт", "2GIS", "Рекомендация"];
    const items = ["Check-up «Сердце»", "УЗИ брюшной полости", "Приём кардиолога", "Анализы: комплекс", "Консультация терапевта"];
    const prices = [35000, 9000, 12000, 14500, 8000];
    for (let i = 0; i < 64; i++) {
      const k = Math.floor(r() * items.length);
      const x = r();
      const status: Deal["status"] = x < 0.34 ? "won" : x < 0.5 ? "lost" : "open";
      const stage = status === "won" ? (p === "amocrm" ? "Успешно реализовано" : "Сделка успешна") : status === "lost" ? (p === "amocrm" ? "Закрыто и не реализовано" : "Сделка провалена") : stages[Math.floor(r() * stages.length)];
      deals.push({ source: p, id: `${p}-${i}`, name: `${items[k]} #${1200 + i}`, status, stage, amount: prices[k] * (1 + Math.floor(r() * 2)), channel: channels[Math.floor(r() * channels.length)], createdAt: now - Math.floor(r() * 21) * DAY - Math.floor(r() * 20) * 3_600_000 });
    }
  }
  return { fetchedAt: now, account: "демо-данные", deals, ads, demo: true, note: "Пример данных, чтобы посмотреть дашборды. Подключите аккаунт, чтобы увидеть свои цифры." };
}

/* ---------- дашборды ---------- */

export type WidgetType = "kpi" | "days" | "funnel" | "campaigns" | "channels" | "stages" | "hours";
export type Metric = "deals" | "won" | "revenue" | "pipeline" | "spend" | "adLeads" | "cpl" | "conv" | "check" | "romi" | "ctr";

export type Widget = { id: string; type: WidgetType; source: SourceId | "all"; metric?: Metric; size: 1 | 2 | 3 | 4; title: string };
export type Dashboard = { id: string; name: string; widgets: Widget[] };

export const WIDGET_TYPES: { id: WidgetType; label: string; size: Widget["size"]; text: string }[] = [
  { id: "kpi", label: "Показатель", size: 1, text: "Одна цифра: выручка, CPL, конверсия…" },
  { id: "days", label: "По дням", size: 2, text: "Заявки и расход за 14 дней" },
  { id: "funnel", label: "Воронка", size: 2, text: "Все сделки → в работе → оплатили" },
  { id: "campaigns", label: "Кампании", size: 2, text: "Расход, лиды и цена лида по кампаниям" },
  { id: "channels", label: "Каналы", size: 2, text: "Откуда приходят клиенты и кто платит" },
  { id: "stages", label: "Этапы CRM", size: 2, text: "Сделки и суммы на каждом этапе" },
  { id: "hours", label: "Ночная смена", size: 4, text: "Заявки по часам: сколько пришло, пока офис закрыт" },
];

export const METRICS: { id: Metric; label: string; kind: "money" | "count" | "pct" }[] = [
  { id: "revenue", label: "Выручка", kind: "money" },
  { id: "won", label: "Оплатили", kind: "count" },
  { id: "deals", label: "Сделок", kind: "count" },
  { id: "pipeline", label: "В работе, сумма", kind: "money" },
  { id: "conv", label: "Конверсия в оплату", kind: "pct" },
  { id: "check", label: "Средний чек", kind: "money" },
  { id: "spend", label: "Расход на рекламу", kind: "money" },
  { id: "adLeads", label: "Лиды из рекламы", kind: "count" },
  { id: "cpl", label: "Цена лида", kind: "money" },
  { id: "ctr", label: "CTR", kind: "pct" },
  { id: "romi", label: "ROMI", kind: "pct" },
];

const wid = () => Math.random().toString(36).slice(2, 9);

export function defaultDashboards(): Dashboard[] {
  return [
    {
      id: "main",
      name: "Продажи и реклама",
      widgets: [
        { id: wid(), type: "kpi", source: "all", metric: "revenue", size: 1, title: "Выручка" },
        { id: wid(), type: "kpi", source: "all", metric: "spend", size: 1, title: "Расход на рекламу" },
        { id: wid(), type: "kpi", source: "all", metric: "cpl", size: 1, title: "Цена лида" },
        { id: wid(), type: "kpi", source: "all", metric: "conv", size: 1, title: "Конверсия в оплату" },
        { id: wid(), type: "days", source: "all", size: 2, title: "Заявки и расход по дням" },
        { id: wid(), type: "funnel", source: "all", size: 2, title: "Воронка по всем CRM" },
        { id: wid(), type: "campaigns", source: "all", size: 2, title: "Кампании: цена лида" },
        { id: wid(), type: "channels", source: "all", size: 2, title: "Каналы" },
      ],
    },
  ];
}

export const newWidget = (type: WidgetType, source: Widget["source"], metric?: Metric): Widget => {
  const t = WIDGET_TYPES.find((x) => x.id === type)!;
  const m = METRICS.find((x) => x.id === metric);
  return { id: wid(), type, source, metric, size: t.size, title: type === "kpi" && m ? m.label : t.label };
};
export const newDashboardId = wid;
