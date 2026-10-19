"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCabinet } from "@/lib/cabinet/state";
import { daysLeft } from "@/lib/cabinet/types";
import { Wordmark } from "../Brand";
import { DiscussButton } from "../Discuss";
import { Icon } from "../Icons";
import { ThemeToggle } from "../ThemeToggle";

const GROUPS = [
  {
    label: "Продажи",
    items: [
      { href: "/cabinet", label: "Обзор", icon: "home" },
      { href: "/cabinet/crm", label: "CRM", icon: "kanban" },
      { href: "/cabinet/bot", label: "Тест-бот", icon: "bot" },
      { href: "/cabinet/prices", label: "Прайс-лист", icon: "tag" },
    ],
  },
  {
    label: "Аналитика",
    items: [
      { href: "/cabinet/dashboards", label: "Дашборды", icon: "grid" },
      { href: "/cabinet/ads", label: "Реклама", icon: "chart" },
      { href: "/cabinet/integrations", label: "Интеграции", icon: "plug" },
    ],
  },
  {
    label: "Аккаунт",
    items: [{ href: "/cabinet/settings", label: "Настройки", icon: "settings" }],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { profile, user, backend, signOut, leads, integrations } = useCabinet();
  const left = daysLeft(profile);
  const fresh = leads.filter((l) => l.status === "new").length;
  const connected = Object.values(integrations).filter((x) => x?.snapshot).length;
  const current = ALL.find((n) => n.href === path) ?? ALL[0];

  return (
    <div className="cab">
      <aside className="cab-side">
        <Link className="cab-logo" href="/" aria-label="На сайт altim">
          <Wordmark height={22} />
        </Link>
        <nav className="cab-nav" aria-label="Разделы кабинета">
          {GROUPS.map((g) => (
            <div key={g.label} className="nav-group">
              <span className="nav-label">{g.label}</span>
              {g.items.map((n) => (
                <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}>
                  <Icon name={n.icon} size={18} />
                  <span>{n.label}</span>
                  {n.href === "/cabinet/crm" && fresh > 0 && <em className="num">{fresh}</em>}
                  {n.href === "/cabinet/integrations" && connected > 0 && <em className="num">{connected}</em>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="cab-user">
          <span className="who">{profile.company}</span>
          <span className="mail">{user.email}</span>
          <button type="button" className="cab-btn ghost" onClick={signOut}><Icon name="logout" size={16} /> Выйти</button>
        </div>
      </aside>
      <div className="cab-main">
        <header className="cab-top">
          <div className="crumb">
            <span className="crumb-co">{profile.company}</span>
            <span className="crumb-sep">/</span>
            <b>{current.label}</b>
          </div>
          <span className="live" title="Тест-бот работает в кабинете; WhatsApp подключается после верификации в Meta"><i />бот на тесте</span>
          {profile.plan === "trial" && (
            <span className={left > 3 ? "trial-pill" : "trial-pill warn"}>
              {left > 0 ? <>пробный период · <b className="num">{left}</b> {left === 1 ? "день" : left < 5 ? "дня" : "дней"}</> : "пробный период закончился"}
            </span>
          )}
          <div className="top-actions">
            <ThemeToggle className="cab-icon" />
            <Link className="cab-btn ghost hide-s" href="/pricing">Тарифы</Link>
            <DiscussButton className="cab-btn primary">Подключить WhatsApp</DiscussButton>
          </div>
        </header>
        {backend.mode === "local" && <p className="cab-note">Демо-режим: аккаунт и данные хранятся только в этом браузере. Для общей базы подключите Supabase (см. README).</p>}
        <div className="cab-content">{children}</div>
      </div>
    </div>
  );
}

export function CabHead({ title, lead, children }: { title: string; lead?: string; children?: React.ReactNode }) {
  return (
    <div className="cab-head">
      <div className="cab-head-text">
        <h1>{title}</h1>
        {lead && <p>{lead}</p>}
      </div>
      {children && <div className="cab-actions">{children}</div>}
    </div>
  );
}
