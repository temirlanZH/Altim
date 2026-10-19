"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "altim-theme";

/** Скрипт для <head>: ставит тему до первой отрисовки, чтобы не было вспышки другого цвета. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}document.documentElement.classList.add("js")})();`;

type VT = { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

/** Переключатель светлой и тёмной темы: новая тема расходится кругом от кнопки. */
export function ThemeToggle({ className = "theme-toggle" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) || "light");
  }, []);

  function apply(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    setTheme(next);
  }

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const doc = document as unknown as VT;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce) return apply(next);
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const t = doc.startViewTransition(() => apply(next));
    t.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 560, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" },
      );
    });
  }

  const dark = theme === "dark";
  return (
    <button type="button" className={className} onClick={toggle} aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"} title={dark ? "Светлая тема" : "Тёмная тема"}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  );
}
