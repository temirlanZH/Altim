import Link from "next/link";
import { CONTACT } from "@/lib/content";
import { CopyPhone } from "./CopyPhone";
import { DiscussButton } from "./Discuss";
import { Logo } from "./Header";

export function CtaBand({ title = "Покажем, как ИИ-менеджер будет продавать за вас" }: { title?: string }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="cta-band t-deep">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h2>{title}</h2>
            <p className="lead">Напишите, какой процесс хотите автоматизировать. Предложим решение и покажем бота на ваших данных.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="kicker">WhatsApp</span>
            <span className="phone" id="phone">{CONTACT.phoneDisplay}</span>
            <span className="muted" style={{ color: "inherit", opacity: .8 }}>{CONTACT.email}</span>
            <div className="ctas">
              <DiscussButton className="btn btn-brand">Обсудить проект</DiscussButton>
              <a className="btn btn-line" href={CONTACT.wa} target="_blank" rel="noopener">
                WhatsApp <span className="arr">↗</span>
              </a>
              <CopyPhone phone={CONTACT.phone} display={CONTACT.phoneDisplay} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Logo />
            <p className="muted" style={{ maxWidth: "32ch" }}>ИИ-продажи, CRM и автоматизация бизнеса в Казахстане и Кыргызстане.</p>
            <a className="link" href={CONTACT.wa} target="_blank" rel="noopener" style={{ width: "fit-content" }}>
              WhatsApp {CONTACT.phoneDisplay}
            </a>
            <span className="muted" style={{ userSelect: "all" }}>{CONTACT.email}</span>
          </div>
          <div>
            <h4>Продукт</h4>
            <ul>
              <li><Link href="/features">Все инструменты</Link></li>
              <li><Link href="/features/whatsapp">WhatsApp</Link></li>
              <li><Link href="/features/broadcasts">Рассылки</Link></li>
              <li><Link href="/integrations">Интеграции</Link></li>
            </ul>
          </div>
          <div>
            <h4>Компания</h4>
            <ul>
              <li><Link href="/cases">Кейсы</Link></li>
              <li><Link href="/pricing">Тарифы</Link></li>
              <li><Link href="/demo">Попробовать бота</Link></li>
              <li><Link href="/cabinet">Кабинет</Link></li>
              <li><Link href="/brand">Бренд и логотип</Link></li>
            </ul>
          </div>
          <div>
            <h4>Партнёрство</h4>
            <ul>
              <li><Link href="/integrations">Официальный партнёр amoCRM</Link></li>
              <li><Link href="/integrations">Официальный партнёр Битрикс24</Link></li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 altim</span>
          <span>50+ внедрений · 100 000+ диалогов</span>
        </div>
      </div>
    </footer>
  );
}
