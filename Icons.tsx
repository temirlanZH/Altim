// Линейные иконки 24×24, цвет берётся из currentColor.

const P: Record<string, React.ReactNode> = {
  chat: <path d="M4 5h16v11H9l-5 4V5Z" />,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  card: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9h6M7 13h10M7 16h6" /></>,
  kanban: <><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="10" rx="1.5" /><rect x="17" y="4" width="4" height="13" rx="1.5" /></>,
  phone: <path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3Z" />,
  doc: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  megaphone: <><path d="M4 10v4h3l8 4V6L7 10H4Z" /><path d="M18 9a4 4 0 0 1 0 6" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  inbox: <><path d="M4 13 6 5h12l2 8v6H4v-6Z" /><path d="M4 13h5l1 2h4l1-2h5" /></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12h2M3 9h18" /></>,
  call: <><path d="M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3Z" /><path d="M15 3h6v6M21 3l-6 6" /></>,
  building: <><path d="M4 21V5l8-2v18M12 8h8v13" /><path d="M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2M3 21h18" /></>,
  bot: <><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4M9 13h.01M15 13h.01" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
  plug: <><path d="M9 3v5M15 3v5" /><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" /><path d="M12 17v4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22 }: { name: IconName | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] ?? P.chat}
    </svg>
  );
}
