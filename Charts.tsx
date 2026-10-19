"use client";
import type { Lead } from "@/lib/cabinet/types";
import { byChannel, byCampaign, byDay, byHour, byStage, totals, METRICS, SOURCE_LABEL, type Data, type Metric, type Widget } from "@/lib/cabinet/sources";
import { fmt, money, pct } from "@/lib/cabinet/util";

/* Графики кабинета: чистый SVG и разметка, цвета из токенов темы, цифры табличные. */

export function formatMetric(m: Metric, v: number) {
  const kind = METRICS.find((x) => x.id === m)?.kind;
  return kind === "money" ? money(v) : kind === "pct" ? pct(v) : fmt(v);
}

/** Столбики по дням: высота — заявки, тонкая линия сверху — расход. */
export function DayBars({ data, days = 14 }: { data: Data; days?: number }) {
  const rows = byDay(data, days);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.deals, r.adLeads)));
  const maxSpend = Math.max(1, ...rows.map((r) => r.spend));
  const hasSpend = rows.some((r) => r.spend > 0);
  const W = 100 / rows.length;
  const line = rows.map((r, i) => `${(i + 0.5) * W},${100 - (r.spend / maxSpend) * 92}`).join(" ");
  return (
    <figure className="chart">
      <div className="bars" role="img" aria-label={`Заявки по дням за ${days} дней`}>
        {rows.map((r) => {
          const n = Math.max(r.deals, r.adLeads);
          return (
            <div key={r.key} className="bar" title={`${new Date(r.from).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}: заявок ${n}, оплат ${r.won}${r.spend ? `, расход ${money(r.spend)}` : ""}`}>
              <span className="b-total" style={{ height: `${(n / max) * 100}%` }} />
              <span className="b-won" style={{ height: `${(r.won / max) * 100}%` }} />
            </div>
          );
        })}
        {hasSpend && (
          <svg className="spend-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <polyline points={line} />
          </svg>
        )}
      </div>
      <div className="bar-axis" aria-hidden="true">
        {rows.map((r, i) => <span key={r.key}>{i % 2 === rows.length % 2 ? new Date(r.from).getDate() : ""}</span>)}
      </div>
      <figcaption className="legend">
        <span><i className="sw-total" />заявки</span>
        <span><i className="sw-won" />оплатили</span>
        {hasSpend && <span><i className="sw-line" />расход</span>}
      </figcaption>
    </figure>
  );
}

export function Funnel({ data }: { data: Data }) {
  const t = totals(data);
  const steps: [string, number][] = [["Сделки", t.deals], ["В работе и оплачены", t.open + t.won], ["Оплатили", t.won]];
  return (
    <div className="funnel">
      {steps.map(([label, n], i) => (
        <div key={label} className="f-row">
          <div className="f-label"><span>{label}</span><b className="num">{fmt(n)}</b></div>
          <div className="f-track"><span style={{ width: `${t.deals ? (n / t.deals) * 100 : 0}%` }} /></div>
          {i > 0 && <small className="num">{steps[i - 1][1] ? pct(n / steps[i - 1][1]) : "—"} от предыдущего шага</small>}
        </div>
      ))}
      <p className="f-foot num">Отказ: {fmt(t.lost)} · в работе на {money(t.pipeline)}</p>
    </div>
  );
}

export function Campaigns({ data, limit = 6 }: { data: Data; limit?: number }) {
  const rows = byCampaign(data).slice(0, limit);
  const max = Math.max(1, ...rows.map((r) => (Number.isFinite(r.cpl) ? r.cpl : 0)));
  if (!rows.length) return <Empty text="Нет рекламных данных. Подключите Meta Ads или загрузите отчёт." />;
  return (
    <table className="t">
      <thead><tr><th>Кампания</th><th className="r">Расход</th><th className="r">Лиды</th><th className="r w-40">Цена лида</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.source + r.campaign}>
            <td><span className="cell-main">{r.campaign}</span><span className="cell-sub">{SOURCE_LABEL[r.source]} · {r.channel}</span></td>
            <td className="r num">{money(r.spend)}</td>
            <td className="r num">{fmt(r.leads)}</td>
            <td className="r">
              <span className="inline-bar"><i style={{ width: `${Number.isFinite(r.cpl) ? (r.cpl / max) * 100 : 0}%` }} /></span>
              <span className="num">{Number.isFinite(r.cpl) ? money(r.cpl) : "нет лидов"}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Channels({ data, limit = 6 }: { data: Data; limit?: number }) {
  const rows = byChannel(data).slice(0, limit);
  if (!rows.length) return <Empty text="Нет сделок. Подключите CRM или проведите диалог в тест-боте." />;
  return (
    <table className="t">
      <thead><tr><th>Канал</th><th className="r">Сделки</th><th className="r">Оплатили</th><th className="r">Сумма</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.channel}><td className="cell-main">{r.channel}</td><td className="r num">{fmt(r.n)}</td><td className="r num">{fmt(r.won)}</td><td className="r num">{money(r.sum)}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

export function Stages({ data }: { data: Data }) {
  const rows = byStage(data);
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <Empty text="Нет сделок. Подключите amoCRM или Битрикс24." />;
  return (
    <div className="hlist">
      {rows.map((r) => (
        <div key={r.stage} className={`h-row s-${r.status}`}>
          <span className="h-label">{r.stage}</span>
          <span className="h-track"><i style={{ width: `${(r.n / max) * 100}%` }} /></span>
          <span className="num h-n">{fmt(r.n)}</span>
          <span className="num h-sum">{money(r.sum)}</span>
        </div>
      ))}
    </div>
  );
}

/** Ночная смена: 24 часа, тёмная зона — офис закрыт. */
export function HourStrip({ leads, open = 9, close = 19 }: { leads: Lead[]; open?: number; close?: number }) {
  const { hours, nightTotal, nightBooked } = byHour(leads, open, close);
  const max = Math.max(1, ...hours.map((h) => h.n));
  return (
    <figure className="night">
      <figcaption className="night-cap">
        <b className="num">{fmt(nightTotal)}</b>
        <span>заявок пришло, пока офис закрыт ({String(close).padStart(2, "0")}:00–{String(open).padStart(2, "0")}:00). Бот записал <b className="num">{fmt(nightBooked)}</b> из них.</span>
      </figcaption>
      <div className="hours" role="img" aria-label={`Заявки по часам суток: ночью ${nightTotal}, записано ${nightBooked}`}>
        {hours.map((h) => (
          <div key={h.h} className={h.night ? "hr off" : "hr"} title={`${h.h}:00 — заявок ${h.n}, записано ${h.booked}`}>
            <span className="hr-n" style={{ height: `${(h.n / max) * 100}%` }}>
              <span className="hr-b" style={{ height: h.n ? `${(h.booked / h.n) * 100}%` : 0 }} />
            </span>
            <small>{h.h % 3 === 0 ? String(h.h).padStart(2, "0") : ""}</small>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function Kpi({ label, value, sub, sign }: { label: string; value: string; sub?: string; sign?: "+" | "−" | "" }) {
  return (
    <div className="kpi">
      <span className="kpi-l">{label}</span>
      <b className="kpi-v num">{value}</b>
      {sub && <small className={`kpi-s num${sign === "+" ? " up" : sign === "−" ? " down" : ""}`}>{sign ? `${sign} ` : ""}{sub}</small>}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

export function WidgetBody({ w, data, leads }: { w: Widget; data: Data; leads: Lead[] }) {
  switch (w.type) {
    case "kpi": {
      const t = totals(data);
      const m = w.metric ?? "revenue";
      const v = t[m];
      const sub = m === "cpl" ? `${fmt(t.adLeads)} лидов на ${money(t.spend)}` : m === "revenue" ? `${fmt(t.won)} оплат · чек ${money(t.check)}` : m === "conv" ? `${fmt(t.won)} из ${fmt(t.deals)} сделок` : m === "spend" ? `CTR ${pct(t.ctr)}` : m === "romi" ? `выручка ${money(t.revenue)}` : undefined;
      return <div className="w-kpi"><b className="num">{Number.isFinite(v) ? formatMetric(m, v) : "—"}</b>{sub && <small className="num">{sub}</small>}</div>;
    }
    case "days": return <DayBars data={data} />;
    case "funnel": return <Funnel data={data} />;
    case "campaigns": return <Campaigns data={data} />;
    case "channels": return <Channels data={data} />;
    case "stages": return <Stages data={data} />;
    case "hours": return <HourStrip leads={leads} />;
  }
}
