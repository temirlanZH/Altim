"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/content";
import { Wordmark } from "./Brand";
import { DiscussButton } from "./Discuss";
import { ThemeToggle } from "./ThemeToggle";

export function Logo() {
  return (
    <Link className="logo" href="/" aria-label="altim, на главную">
      <Wordmark height={26} />
    </Link>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const current = (href: string) => (path === href ? "page" : undefined);

  return (
    <header className="top">
      <div className="wrap">
        <Logo />
        <nav className="nav" aria-label="Разделы">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} aria-current={current(n.href)}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="top-ctas">
          <ThemeToggle />
          <Link className="btn btn-line btn-sm hide-m" href="/cabinet">
            Кабинет
          </Link>
          <DiscussButton className="btn btn-dark btn-sm" />
          <button
            className="burger"
            type="button"
            aria-label={open ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={open}
            aria-controls="mnav"
            onClick={() => setOpen((v) => !v)}
          >
            <span style={open ? { transform: "translateY(2.75px) rotate(45deg)" } : undefined} />
            <span style={open ? { transform: "translateY(-2.75px) rotate(-45deg)" } : undefined} />
          </button>
        </div>
      </div>
      <div id="mnav" className="mnav" hidden={!open}>
        <div className="wrap" style={{ display: "block", height: "auto" }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {n.label}
            </Link>
          ))}
          <Link href="/demo">Попробовать бота</Link>
          <Link href="/cabinet">Кабинет · 14 дней бесплатно</Link>
        </div>
      </div>
    </header>
  );
}
