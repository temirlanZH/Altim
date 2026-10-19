"use client";
import Link from "next/link";
import { useState } from "react";
import { ALWAYS_INCLUDED, PLANS, QUARTER_DISCOUNT } from "@/lib/content";
import { DiscussButton } from "./Discuss";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

export function PricingPlans() {
  const [quarter, setQuarter] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="tabs" role="tablist" aria-label="Период оплаты">
        <button role="tab" aria-selected={!quarter} onClick={() => setQuarter(false)}>Месяц</button>
        <button role="tab" aria-selected={quarter} onClick={() => setQuarter(true)}>
          Квартал <span className="chip acc" style={{ marginLeft: 6 }}>−{Math.round(QUARTER_DISCOUNT * 100)}%</span>
        </button>
      </div>
      <div className="plans">
        {PLANS.map((p) => {
          const price = p.price == null ? null : quarter ? p.price * (1 - QUARTER_DISCOUNT) : p.price;
          return (
            <article key={p.name} className={p.popular ? "plan pop" : "plan"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <h3>{p.name}</h3>
                {p.popular && <span className="chip acc">популярный</span>}
              </div>
              <div className="price num">
                {price == null ? "По запросу" : `${fmt(price)} ₸`} {price != null && <small>/мес</small>}
              </div>
              <span className="mono muted">{p.volume}</span>
              <p>{p.text}</p>
              <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
              {p.price == null ? (
                <DiscussButton className="btn btn-line">{p.cta}</DiscussButton>
              ) : (
                <Link className={p.popular ? "btn btn-brand" : "btn btn-line"} href={`/signup?plan=${encodeURIComponent(p.name)}`}>{p.cta}</Link>
              )}
            </article>
          );
        })}
      </div>
      <div className="tile t-teal" style={{ gap: 12 }}>
        <span className="kicker">Входит в каждый тариф</span>
        <div className="tags" style={{ gap: 8 }}>
          {ALWAYS_INCLUDED.map((x) => <span key={x} style={{ background: "var(--bg)", fontSize: 13 }}>{x}</span>)}
        </div>
        <p className="hint">{quarter ? "Цена за месяц при оплате за квартал." : "Цена при помесячной оплате."} Сообщения сверх объёма тарифа и подключение дополнительных каналов считаем отдельно.</p>
      </div>
    </div>
  );
}
