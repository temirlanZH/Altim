import type { Metadata } from "next";
import { LogoMark, Wordmark } from "@/components/Brand";
import { PageHero, Shead } from "@/components/Sections";

export const metadata: Metadata = { title: "Бренд и логотип", description: "Логотип altim, цвета и правила использования." };

const COLORS = [
  ["Бирюза", "#0A93AD", "основной цвет, кнопки, ссылки"],
  ["Небо", "#22CBDC", "градиенты, подсветка"],
  ["Солнце", "#F6B21E", "акцент знака, выделения"],
  ["Коралл", "#F26B4F", "вторичный акцент"],
  ["Глубина", "#0A3F52", "тёмные блоки"],
  ["Графит", "#1D2226", "текст"],
];

export default function Brand() {
  return (
    <>
      <PageHero
        kicker="Бренд"
        title="Логотип altim"
        lead="Название строчными буквами, нарисованными одной линией. Точка над «i» — бирюзовая: это новое сообщение от клиента, на которое altim уже отвечает. Знак для иконок — буква «а» с той же точкой."
      >
        <div className="ctas">
          <a className="btn btn-dark" href="/logo-mark.svg" download>Скачать знак SVG</a>
          <a className="btn btn-line" href="/logo.svg" download>Скачать логотип SVG</a>
        </div>
      </PageHero>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="brand-row">
            <div className="brand-tile" style={{ background: "var(--soft)" }}>
              <Wordmark height={72} />
            </div>
            <div className="brand-tile t-deep">
              <LogoMark size={120} />
            </div>
            <div className="brand-tile" style={{ background: "linear-gradient(135deg, #22CBDC, #0A93AD 55%, #0A3F52)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", background: "#fff", color: "#1D2226", padding: "16px 22px", borderRadius: 18 }}>
                <Wordmark height={40} />
              </span>
            </div>
          </div>
          <div className="brand-row">
            {[16, 32, 48].map((s) => (
              <div key={s} className="brand-tile" style={{ background: "var(--soft)", minHeight: 140 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}><LogoMark size={s} /><span className="mono muted">{s} px</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          <Shead kicker="Цвета" title="Палитра степного неба" />
          <div className="swatches">
            {COLORS.map(([name, hex, use]) => (
              <div className="swatch" key={hex}>
                <div style={{ background: hex }} />
                <p><b className="ink">{name}</b><span className="mono">{hex}</span><span className="muted">{use}</span></p>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 24, maxWidth: "70ch" }}>Не меняйте пропорции знака и цвета градиента, не кладите знак на пёстрые фотографии без белой подложки. Минимальный размер знака — 16 px, отступ вокруг — не меньше четверти его ширины. Шрифт словесной части — Onest 600.</p>
        </div>
      </section>
    </>
  );
}
