"use client";
import { useState } from "react";

const fmt = (n: number) => Math.round(n).toLocaleString("ru-RU");

type Field = { id: string; label: string; min: number; max: number; step: number; unit: string };
const FIELDS: Field[] = [
  { id: "leads", label: "Заявок в месяц", min: 50, max: 3000, step: 50, unit: "" },
  { id: "after", label: "Приходят вне рабочего времени", min: 0, max: 80, step: 5, unit: "%" },
  { id: "lost", label: "Из них теряются без быстрого ответа", min: 0, max: 100, step: 5, unit: "%" },
  { id: "conv", label: "Конверсия заявки в оплату", min: 1, max: 60, step: 1, unit: "%" },
  { id: "check", label: "Средний чек", min: 5000, max: 1000000, step: 5000, unit: " ₸" },
];

/** Оценка выручки, которую бизнес теряет на заявках вне рабочего времени. Все значения задаёт посетитель. */
export function LossCalc() {
  const [v, setV] = useState<Record<string, number>>({ leads: 600, after: 35, lost: 50, conv: 15, check: 30000 });
  const lostLeads = (v.leads * v.after * v.lost) / 10000;
  const lostMoney = lostLeads * (v.conv / 100) * v.check;
  return (
    <div className="calc">
      <div className="tile" style={{ gap: 0 }}>
        {FIELDS.map((f) => (
          <div className="range" key={f.id}>
            <div className="row">
              <label htmlFor={`calc-${f.id}`} style={{ margin: 0, fontWeight: 400 }}>{f.label}</label>
              <output htmlFor={`calc-${f.id}`}>{fmt(v[f.id])}{f.unit}</output>
            </div>
            <input id={`calc-${f.id}`} type="range" min={f.min} max={f.max} step={f.step} value={v[f.id]} onChange={(e) => setV({ ...v, [f.id]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
      <div className="tile" style={{ gap: 0, justifyContent: "flex-start" }}>
        <div className="result"><span className="muted">Заявок теряется в месяц</span><b>{fmt(lostLeads)}</b></div>
        <div className="result"><span className="muted">Недополученная выручка в месяц</span><b>{fmt(lostMoney)} ₸</b></div>
        <div className="result" style={{ borderBottom: 0 }}><span className="muted">За год</span><b>{fmt(lostMoney * 12)} ₸</b></div>
        <p className="hint" style={{ marginTop: 12 }}>Это оценка по вашим вводным, а не обещание результата. Реальные цифры покажет пилот на ваших заявках.</p>
      </div>
    </div>
  );
}
