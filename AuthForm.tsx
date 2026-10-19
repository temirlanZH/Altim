"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthError, getBackend } from "@/lib/cabinet/backend";
import { TRIAL_DAYS } from "@/lib/cabinet/types";
import { LogoMark } from "./Brand";

export function AuthForm({ mode, next = "/cabinet", plan = "" }: { mode: "login" | "signup"; next?: string; plan?: string }) {
  const router = useRouter();
  const [f, setF] = useState({ company: "", phone: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [local, setLocal] = useState(false);
  const safeNext = next.startsWith("/cabinet") ? next : "/cabinet";

  useEffect(() => {
    const b = getBackend();
    setLocal(b.mode === "local");
    b.currentUser().then((u) => u && router.replace(safeNext));
  }, [router, safeNext]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const email = f.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Проверьте почту: например, name@company.kz");
    if (f.password.length < 8) return setErr("Пароль — минимум 8 символов");
    if (mode === "signup" && !f.company.trim()) return setErr("Укажите название компании");
    setBusy(true);
    try {
      const b = getBackend();
      if (mode === "signup") {
        const r = await b.signUp(email, f.password, { company: f.company.trim(), phone: f.phone.trim(), plan });
        if (r.needsConfirm) {
          setConfirm(true);
          return;
        }
      } else await b.signIn(email, f.password);
      router.replace(safeNext);
    } catch (e) {
      setErr(e instanceof AuthError || e instanceof Error ? e.message : "Не получилось. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  if (confirm)
    return (
      <div className="auth-card">
        <svg className="check" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="33" /><path d="M22 37l9 9 19-20" /></svg>
        <h1 style={{ fontSize: 28 }}>Проверьте почту</h1>
        <p>Мы отправили письмо на {f.email}. Перейдите по ссылке из него, и кабинет откроется.</p>
      </div>
    );

  return (
    <form className="auth-card" onSubmit={submit} noValidate>
      <LogoMark size={44} />
      <h1 style={{ fontSize: 30 }}>{mode === "signup" ? `Кабинет altim — ${TRIAL_DAYS} дней бесплатно` : "Вход в кабинет"}</h1>
      <p className="muted">
        {mode === "signup"
          ? "Тестовый бот, CRM с карточками лидов, прайс-лист и дашборды. Банковская карта не нужна."
          : "Войдите, чтобы продолжить работу с CRM, ботом и дашбордами."}
      </p>
      {plan && mode === "signup" && <span className="chip acc" style={{ width: "fit-content" }}>выбран тариф «{plan}»</span>}
      <div style={{ width: "100%" }}>
        {mode === "signup" && (
          <div className="form-grid">
            <div><label htmlFor="a-company">Компания</label><input id="a-company" value={f.company} onChange={set("company")} autoComplete="organization" maxLength={80} /></div>
            <div><label htmlFor="a-phone">Телефон / WhatsApp</label><input id="a-phone" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" maxLength={40} /></div>
          </div>
        )}
        <label htmlFor="a-email">Почта</label>
        <input id="a-email" type="email" value={f.email} onChange={set("email")} autoComplete="email" maxLength={120} />
        <label htmlFor="a-pass">Пароль</label>
        <input id="a-pass" type="password" value={f.password} onChange={set("password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} maxLength={72} />
        {err && <p className="err-text" role="alert">{err}</p>}
        <button className="btn btn-brand" style={{ width: "100%", marginTop: 18 }} disabled={busy}>
          {busy ? "Секунду…" : mode === "signup" ? "Создать кабинет" : "Войти"}
        </button>
      </div>
      <p className="hint">
        {mode === "signup" ? <>Уже есть кабинет? <Link className="link" href="/login">Войти</Link></> : <>Нет кабинета? <Link className="link" href="/signup">Зарегистрироваться</Link></>}
      </p>
      {local && (
        <p className="hint" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          Демо-режим: база не подключена, аккаунт и данные хранятся только в этом браузере.
        </p>
      )}
    </form>
  );
}
