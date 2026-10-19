// Логотип altim: строчные буквы из одной геометрической линии; точка над «i» — новое сообщение,
// цвет акцента. Знак — та же «a» с точкой. Цвета берутся из темы (currentColor и --accent).

const LETTERS =
  "M19.5 17.5V32.5M29 4.5V32.5M40 9V27.5Q40 32.5 45 32.5M35.5 17.5H45.5M54.5 17.5V32.5M63.5 32.5V22.5Q63.5 17.5 68.5 17.5Q73.5 17.5 73.5 22.5V32.5M73.5 22.5Q73.5 17.5 78.5 17.5Q83.5 17.5 83.5 22.5V32.5";

export function Wordmark({ height = 28, title = "altim" }: { height?: number; title?: string }) {
  return (
    <svg className="wordmark" height={height} width={(height * 90) / 40} viewBox="0 0 90 40" role="img" aria-label={title}>
      <g fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="25" r="7.5" />
        <path d={LETTERS} />
      </g>
      <circle className="wordmark-dot" cx="54.5" cy="7" r="4" fill="var(--accent)" />
    </svg>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" fill="var(--ink)" />
      <g fill="none" stroke="var(--bg)" strokeWidth="7" strokeLinecap="round">
        <circle cx="28" cy="36" r="11" />
        <path d="M39 25V47" />
      </g>
      <circle cx="48" cy="15" r="6" fill="var(--accent-bright)" />
    </svg>
  );
}
