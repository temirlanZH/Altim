"use client";
import { useEffect, useState } from "react";
import { useCabinet } from "@/lib/cabinet/state";
import { SOURCES, STATUSES, STATUS_BY_ID, type Lead, type LeadStatus, type PriceItem, type Profile } from "@/lib/cabinet/types";
import { dt, money, num, priceText } from "@/lib/cabinet/util";
import type { LeadCard } from "@/lib/niches";
import { post } from "../useChat";

/** Запрос карточки лида у ИИ по переписке или комментарию менеджера. */
export async function analyzeLead(lead: Lead, profile: Profile, prices: PriceItem[]) {
  const history = lead.transcript.length ? lead.transcript : [{ r: "c" as const, t: lead.comment || `Клиент оставил заявку: ${lead.service || "услуга не указана"}` }];
  return post<LeadCard>("/api/lead", {
    niche: "custom",
    label: profile.label,
    goal: profile.goal,
    company: profile.company,
    prices: priceText(prices),
    info: profile.info,
    booking: { name: lead.name, phone: lead.phone, service: lead.service, datetime: lead.datetime, price: lead.price },
    history,
  });
}

export function LeadDrawer({ lead, onClose }: { lead: Lead | "new"; onClose: () => void }) {
  const cab = useCabinet();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Карточка лида">
        {lead === "new" ? <NewLead onDone={onClose} /> : <LeadView lead={cab.leads.find((l) => l.id === lead.id) ?? lead} onClose={onClose} />}
      </aside>
    </div>
  );
}

function LeadView({ lead: x, onClose }: { lead: Lead; onClose: () => void }) {
  const { updateLead, deleteLead, profile, prices, toast } = useCabinet();
  const [note, setNote] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const a = x.analysis;

  const setStatus = (s: LeadStatus) => updateLead(x.id, { status: s, history: [...x.history, { at: Date.now(), text: `Статус: ${STATUS_BY_ID[s].label}` }] });
  async function runAnalysis() {
    await updateLead(x.id, { analysisState: "pending" });
    const r = await analyzeLead(x, profile, prices);
    if (r.ok) await updateLead(x.id, { analysis: r.data, analysisState: "done", temperature: r.data.temperature, score: r.data.score });
    else {
      await updateLead(x.id, { analysisState: "error" });
      toast(r.error);
    }
  }
  const list = (arr: string[] | undefined) => (arr?.length ? <ul>{arr.map((s, i) => <li key={i}>{s}</li>)}</ul> : <span className="muted">не выяснено</span>);

  return (
    <div className="drawer-body">
      <div className="drawer-top">
        <div style={{ minWidth: 0 }}>
          <span className="mono muted">{x.demo ? "пример · " : ""}лид от {dt(x.createdAt)}</span>
          <h2 style={{ fontSize: 26 }}>{x.name}</h2>
        </div>
        <button className="modal-x" style={{ position: "static" }} aria-label="Закрыть" onClick={onClose}>×</button>
      </div>
      <div className="ctas" style={{ alignItems: "center" }}>
        <select aria-label="Статус" className="select" value={x.status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <label htmlFor="l-amount" style={{ margin: 0 }}>Сумма, ₸</label>
        <input id="l-amount" className="num" style={{ width: 130 }} inputMode="numeric" defaultValue={x.amount || ""} key={x.id + x.amount} onBlur={(e) => { const v = num(e.target.value); updateLead(x.id, { amount: Number.isFinite(v) ? v : 0 }); }} />
      </div>
      <div className="box">
        <dl className="kv" style={{ padding: 0 }}>
          <dt>Телефон</dt><dd className="num">{x.phone || "—"}</dd>
          <dt>Услуга</dt><dd>{x.service || "—"}</dd>
          <dt>Когда</dt><dd>{x.datetime || "—"}</dd>
          <dt>Цена</dt><dd>{x.price || money(x.amount)}</dd>
          <dt>Источник</dt><dd>{x.source || "—"}</dd>
          {x.comment && <><dt>Комментарий</dt><dd>{x.comment}</dd></>}
        </dl>
      </div>

      {x.analysisState === "pending" ? (
        <div className="box"><b className="ink">ИИ разбирает переписку…</b><span className="dots"><i /><i /><i /></span></div>
      ) : a ? (
        <>
          <div className="box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="mono">Оценка лида</span>
              <span className={`chip ${a.temperature === "горячий" ? "hot" : a.temperature === "тёплый" ? "soon" : "acc"}`}>{a.temperature} · {a.score}%</span>
            </div>
            <div className="meter"><i style={{ width: `${a.score}%` }} /></div>
            <p className="ink">{a.summary}</p>
          </div>
          <div className="grid g2">
            <div className="box"><span className="mono">Потребность</span><p className="ink">{a.need || "не выяснено"}</p><span className="mono">Возражения</span>{list(a.objections?.map((o) => `«${o.text}» — ${o.status}`))}</div>
            <div className="box"><span className="mono">Допродажи из прайса</span>{list(a.upsell?.map((u) => `${u.item}${u.price ? " — " + u.price : ""}`))}<span className="mono">Следующие шаги</span>{list(a.nextSteps)}</div>
          </div>
          <div className="box">
            <span className="mono">Скрипт звонка</span>
            <p className="ink" style={{ whiteSpace: "pre-wrap" }}>{a.callScript}</p>
            <button className="btn btn-line btn-sm" style={{ width: "fit-content" }} onClick={async () => { try { await navigator.clipboard.writeText(a.callScript); toast("Скрипт скопирован"); } catch { toast("Выделите текст и скопируйте вручную"); } }}>Копировать</button>
          </div>
        </>
      ) : (
        <div className="box">
          <b className="ink">{x.analysisState === "error" ? "Не удалось собрать анализ" : "Анализа ещё нет"}</b>
          <span className="muted">ИИ разберёт переписку или комментарий: потребность, возражения, допродажи и скрипт звонка.</span>
          <button className="btn btn-brand btn-sm" style={{ width: "fit-content" }} onClick={runAnalysis}>Сделать анализ</button>
        </div>
      )}

      <div className="box">
        <span className="mono">Заметки отдела продаж</span>
        {x.notes.map((n, i) => <div key={i}><span className="mono muted">{dt(n.at)}</span> {n.text}</div>)}
        <textarea id="l-note" aria-label="Новая заметка" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например: перезвонить в 18:00, просит рассрочку" style={{ minHeight: 70 }} />
        <button className="btn btn-dark btn-sm" style={{ width: "fit-content" }} disabled={!note.trim()} onClick={async () => { if (await updateLead(x.id, { notes: [...x.notes, { at: Date.now(), text: note.trim() }] })) setNote(""); }}>Добавить заметку</button>
      </div>

      {x.history.length > 0 && (
        <div className="box"><span className="mono">История</span>{x.history.slice().reverse().map((h, i) => <div key={i} style={{ fontSize: 13.5 }}><span className="mono muted">{dt(h.at)}</span> {h.text}</div>)}</div>
      )}
      {x.transcript.length > 0 && (
        <details className="box"><summary className="ink" style={{ cursor: "pointer" }}>Переписка · {x.transcript.length} сообщений</summary>
          <div className="msgs" style={{ marginTop: 10, borderRadius: 12 }}>{x.transcript.map((m, i) => <div key={i} className={m.r === "c" ? "msg me" : "msg"}>{m.t}</div>)}</div>
        </details>
      )}

      <div className="ctas" style={{ justifyContent: "space-between" }}>
        {a ? <button className="btn btn-line btn-sm" onClick={runAnalysis}>Обновить анализ</button> : <span />}
        {confirmDel ? (
          <span className="ctas" style={{ alignItems: "center" }}>
            <span className="muted">Удалить без восстановления?</span>
            <button className="btn btn-sm" style={{ background: "var(--bad)", color: "#fff" }} onClick={async () => { if (await deleteLead(x.id)) onClose(); }}>Удалить</button>
            <button className="btn btn-line btn-sm" onClick={() => setConfirmDel(false)}>Отмена</button>
          </span>
        ) : (
          <button className="btn btn-line btn-sm" style={{ color: "var(--bad)" }} onClick={() => setConfirmDel(true)}>Удалить лида</button>
        )}
      </div>
    </div>
  );
}

function NewLead({ onDone }: { onDone: () => void }) {
  const { createLead, updateLead, prices, profile } = useCabinet();
  const [f, setF] = useState({ name: "", phone: "", service: "", datetime: "", source: SOURCES[0], comment: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.name.trim() && !f.phone.trim()) return setErr("Укажите имя или телефон");
    const p = prices.find((x) => f.service && x.name.toLowerCase().includes(f.service.toLowerCase()));
    const amount = p ? num(p.price) : NaN;
    const lead = await createLead({ ...f, name: f.name || "Без имени", price: p?.price ?? "", amount: Number.isFinite(amount) ? amount : 0, status: f.datetime ? "booked" : "new", history: [{ at: Date.now(), text: "Лид добавлен вручную" }], analysisState: f.comment ? "pending" : "none" });
    if (!lead) return;
    onDone();
    if (f.comment) {
      const r = await analyzeLead(lead, profile, prices);
      await updateLead(lead.id, r.ok ? { analysis: r.data, analysisState: "done", temperature: r.data.temperature, score: r.data.score } : { analysisState: "error" });
    }
  }
  return (
    <div className="drawer-body">
      <div className="drawer-top"><h2 style={{ fontSize: 26 }}>Новый лид</h2><button className="modal-x" style={{ position: "static" }} aria-label="Закрыть" onClick={onDone}>×</button></div>
      <div className="box">
        <div className="form-grid">
          <div><label htmlFor="n-name">Имя</label><input id="n-name" value={f.name} onChange={set("name")} /></div>
          <div><label htmlFor="n-phone">Телефон</label><input id="n-phone" type="tel" value={f.phone} onChange={set("phone")} /></div>
          <div><label htmlFor="n-service">Услуга или товар</label><input id="n-service" value={f.service} onChange={set("service")} list="n-prices" /></div>
          <div><label htmlFor="n-date">Дата и время записи</label><input id="n-date" value={f.datetime} onChange={set("datetime")} placeholder="суббота, 10:00" /></div>
        </div>
        <datalist id="n-prices">{prices.map((p) => <option key={p.name} value={p.name} />)}</datalist>
        <label htmlFor="n-source">Источник</label>
        <select id="n-source" className="select" value={f.source} onChange={set("source")}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        <label htmlFor="n-comment">Что известно о клиенте</label>
        <textarea id="n-comment" value={f.comment} onChange={set("comment")} placeholder="Звонил по рекламе, переживает за цену, спрашивал рассрочку" style={{ minHeight: 80 }} />
        <p className="hint">Если заполнить это поле, ИИ сразу соберёт карточку лида.</p>
        {err && <p className="err-text">{err}</p>}
        <button className="btn btn-brand" style={{ marginTop: 12, width: "fit-content" }} onClick={save}>Сохранить лида</button>
      </div>
    </div>
  );
}
