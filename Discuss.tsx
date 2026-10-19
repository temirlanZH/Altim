"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CONTACT, waLink } from "@/lib/content";
import { ChoiceArt } from "./HeroArt";
import { post } from "./useChat";

const Ctx = createContext<() => void>(() => {});

/** Кнопка, открывающая окно «Обсудить проект». */
export function DiscussButton({ className = "btn btn-dark", children = "Обсудить проект" }: { className?: string; children?: React.ReactNode }) {
  const open = useContext(Ctx);
  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  );
}

type Step = "choose" | "form" | "done";

export function DiscussProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", niche: "", site: "", comment: "" });
  const lastFocus = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const show = () => {
    lastFocus.current = document.activeElement as HTMLElement;
    setStep("choose");
    setError("");
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    lastFocus.current?.focus?.();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button, input")?.focus();
    return () => {
      removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.phone.replace(/\D/g, "").length < 9) {
      setError("Укажите имя и номер телефона или WhatsApp");
      return;
    }
    setSending(true);
    setError("");
    const res = await post<{ ok: boolean }>("/api/request", form);
    setSending(false);
    if (res.ok) setStep("done");
    else setError(res.error);
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const waText = `Здравствуйте! Хочу ИИ-бота за 30 минут. Меня зовут ${form.name}${form.niche ? ", ниша: " + form.niche : ""}${form.site ? ", сайт: " + form.site : ""}.`;

  return (
    <Ctx.Provider value={show}>
      {children}
      {open && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="discuss-title" ref={dialog}>
            <button className="modal-x" type="button" aria-label="Закрыть" onClick={close}>×</button>
            {step === "choose" && (
              <>
                <div className="modal-head">
                  <span className="kicker">Обсудить проект</span>
                  <h2 id="discuss-title" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>С чего начнём?</h2>
                  <p>Выберите удобный формат. Оба варианта бесплатные.</p>
                </div>
                <div className="modal-body">
                  <div className="choices">
                    <button type="button" className="choice" onClick={() => setStep("form")}>
                      <div className="choice-art"><ChoiceArt kind="fast" /></div>
                      <span className="badge">созвон с командой</span>
                      <h3>Разработка ИИ-бота за 30 минут</h3>
                      <p>Созвонимся, разберём ваш процесс и на ваших данных соберём ИИ-менеджера, который продаёт.</p>
                    </button>
                    <Link href="/demo" className="choice" onClick={close}>
                      <div className="choice-art"><ChoiceArt kind="demo" /></div>
                      <span className="badge">сами, прямо сейчас</span>
                      <h3>Тестовый ИИ-бот на нашем сайте</h3>
                      <p>Вставьте ссылку на сайт или прайс — и проверьте, как бот отвечает и записывает клиентов.</p>
                    </Link>
                  </div>
                  <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
                    Хотите весь функционал? <Link className="link" href="/signup" onClick={close}>Откройте кабинет — 14 дней бесплатно</Link>
                  </p>
                </div>
              </>
            )}
            {step === "form" && (
              <>
                <div className="modal-head">
                  <button type="button" className="back" style={{ border: 0, background: "none", padding: 0, cursor: "pointer", textAlign: "left" }} onClick={() => setStep("choose")}>← Назад</button>
                  <h2 id="discuss-title" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>ИИ-бот за 30 минут</h2>
                  <p>Оставьте контакты — напишем в WhatsApp и договоримся о времени созвона.</p>
                </div>
                <form className="modal-body" onSubmit={submit} noValidate>
                  <div className="form-grid">
                    <div><label htmlFor="r-name">Имя</label><input id="r-name" value={form.name} onChange={set("name")} autoComplete="name" maxLength={80} /></div>
                    <div><label htmlFor="r-phone">Телефон или WhatsApp</label><input id="r-phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="+7 7__ ___ __ __" maxLength={40} /></div>
                    <div><label htmlFor="r-niche">Ниша бизнеса</label><input id="r-niche" value={form.niche} onChange={set("niche")} placeholder="клиника, салон, онлайн-школа…" maxLength={120} /></div>
                    <div><label htmlFor="r-site">Сайт или Instagram</label><input id="r-site" value={form.site} onChange={set("site")} placeholder="необязательно" maxLength={200} /></div>
                  </div>
                  <label htmlFor="r-comment">Что хотите автоматизировать</label>
                  <textarea id="r-comment" value={form.comment} onChange={set("comment")} style={{ minHeight: 80 }} maxLength={1000} placeholder="Например: отвечать на заявки из Instagram ночью и записывать на приём" />
                  {error && <p className="err-text" role="alert">{error}</p>}
                  <div className="ctas" style={{ marginTop: 18 }}>
                    <button className="btn btn-brand" disabled={sending}>{sending ? "Отправляем…" : "Отправить заявку"}</button>
                    <a className="btn btn-line" href={waLink(waText)} target="_blank" rel="noopener">Сразу в WhatsApp ↗</a>
                  </div>
                  <p className="hint" style={{ marginTop: 12 }}>Нажимая «Отправить», вы соглашаетесь, что мы свяжемся с вами по указанному номеру.</p>
                </form>
              </>
            )}
            {step === "done" && (
              <div className="modal-body" style={{ paddingTop: 36 }}>
                <div className="success">
                  <svg className="check" viewBox="0 0 72 72" aria-hidden="true">
                    <circle cx="36" cy="36" r="33" />
                    <path d="M22 37l9 9 19-20" />
                  </svg>
                  <h2 id="discuss-title" style={{ fontSize: 28 }}>Заявка отправлена</h2>
                  <p style={{ maxWidth: "44ch" }}>Напишем в WhatsApp в рабочее время. Если удобнее, напишите нам сами: {CONTACT.phoneDisplay}.</p>
                  <div className="ctas" style={{ justifyContent: "center" }}>
                    <a className="btn btn-dark" href={waLink(waText)} target="_blank" rel="noopener">Написать в WhatsApp ↗</a>
                    <Link className="btn btn-line" href="/demo" onClick={close}>Пока попробовать бота</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
