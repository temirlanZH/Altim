import Link from "next/link";
import { CASES, COMPARE, FAQ, INTEGRATIONS, STATUS_LABEL, TOOLS, type Case } from "@/lib/content";
import { Icon } from "./Icons";

const TOOL_ICONS = ["chat", "tag", "card", "kanban", "call", "doc", "megaphone", "chart", "inbox", "wallet", "phone", "building"];
const HUES = ["teal", "sun", "coral", "leaf"];
const CASE_COLORS = ["var(--teal)", "var(--sun)", "var(--coral)", "var(--leaf)", "var(--aqua)", "var(--teal)", "var(--sun)"];

export function Shead({ kicker, title, lead, center }: { kicker: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={center ? "shead center" : "shead"}>
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      {lead && <p className="lead">{lead}</p>}
    </div>
  );
}

export function PageHero({ kicker, title, lead, back, children }: { kicker: string; title: string; lead: string; back?: [string, string]; children?: React.ReactNode }) {
  return (
    <section className="hero page-hero">
      <div className="wrap">
        <div className="hero-copy">
          {back && <Link className="back" href={back[0]}>← {back[1]}</Link>}
          <span className="kicker rise">{kicker}</span>
          <h1 className="rise d1">{title}</h1>
          <p className="lead rise d2">{lead}</p>
          {children && <div className="rise d3">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <div className="stats">
      <div><b className="c-teal">50+</b><span>внедрений автоматизации</span></div>
      <div><b className="c-sun">100 000+</b><span>диалогов обработано ботами</span></div>
      <div><b className="c-coral">44%</b><span>конверсия из диалога во встречу · Next Leaders</span></div>
      <div><b className="c-leaf">24/7</b><span>ответ клиенту за секунды, без выходных</span></div>
    </div>
  );
}

export function CaseCard({ c }: { c: Case }) {
  const color = CASE_COLORS[CASES.indexOf(c) % CASE_COLORS.length];
  return (
    <article className="case" style={{ ["--case-c" as string]: color }}>
      <span className="ind">{c.ind}</span>
      <h3>{c.name}</h3>
      <p>{c.text}</p>
      {c.metrics.length > 0 && (
        <div className="metrics">
          {c.metrics.map(([v, l]) => (
            <div key={l}><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
      )}
      <div className="tags">{c.did.map((d) => <span key={d}>{d}</span>)}</div>
    </article>
  );
}

export function CasesGrid({ limit }: { limit?: number }) {
  const list = limit ? CASES.slice(0, limit) : CASES;
  return <div className="grid g3">{list.map((c) => <CaseCard key={c.name} c={c} />)}</div>;
}

export function ToolsGrid({ only }: { only?: "on" | "soon" }) {
  const list = only ? TOOLS.filter((t) => t.status === only) : TOOLS;
  return (
    <div className="grid g3">
      {list.map((t) => {
        const k = TOOLS.indexOf(t);
        const inner = (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className={`ico ${HUES[k % HUES.length]}`}><Icon name={TOOL_ICONS[k]} /></span>
              <span className={`chip ${t.status}`}>{STATUS_LABEL[t.status]}</span>
            </div>
            <h3>{t.title}</h3>
            <p>{t.text}</p>
            {t.points && <ul>{t.points.map((p) => <li key={p}>{p}</li>)}</ul>}
            {t.href && <span className="more">Подробнее →</span>}
          </>
        );
        return t.href ? (
          <Link key={t.title} className="feat" href={t.href}>{inner}</Link>
        ) : (
          <article key={t.title} className="feat">{inner}</article>
        );
      })}
    </div>
  );
}

function Cmp({ v, us }: { v: string; us?: boolean }) {
  const cls = v === "y" ? "yes" : v === "n" ? "no" : "part";
  return <td className={`c ${us ? "us " : ""}${cls}`}>{v === "y" ? "да" : v === "n" ? "нет" : v}</td>;
}

export function CompareTable() {
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr><th>Возможность</th><th className="c us">altim</th><th className="c">Обычный чат-бот</th><th className="c">Менеджер на окладе</th></tr>
        </thead>
        <tbody>
          {COMPARE.map(([row, a, b, c]) => (
            <tr key={row}><td className="ink">{row}</td><Cmp v={a} us /><Cmp v={b} /><Cmp v={c} /></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IntegrationsGrid({ limit }: { limit?: number }) {
  const list = limit ? INTEGRATIONS.slice(0, limit) : INTEGRATIONS;
  return (
    <div className="logos">
      {list.map((i) => (
        <div key={i.name}>
          <span className="mono">{i.partner ? "официальный партнёр" : i.group}</span>
          <b>{i.name}</b>
          <span>{i.note}</span>
          {i.status === "soon" && <span className="chip soon" style={{ width: "fit-content" }}>{STATUS_LABEL.soon}</span>}
        </div>
      ))}
    </div>
  );
}

export function Faq() {
  return (
    <div className="faq">
      {FAQ.map(([q, a], i) => (
        <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>
      ))}
    </div>
  );
}
