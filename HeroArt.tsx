// Иллюстрация героя: степь на рассвете и живой интерфейс поверх неё. Все данные в карточках — пример.

const mix = (c: string, p: number, base = "var(--bg)") => `color-mix(in srgb, ${c} ${p}%, ${base})`;

export function SteppeScene({ id = "s" }: { id?: string }) {
  return (
    <svg className="scene" viewBox="0 0 600 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: mix("var(--aqua)", 34) }} />
          <stop offset="0.55" style={{ stopColor: mix("var(--aqua)", 12) }} />
          <stop offset="1" style={{ stopColor: mix("var(--sun)", 26) }} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="0.55" stopColor="#FFCF4D" />
          <stop offset="1" stopColor="#F6B21E" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: "var(--sun)", stopOpacity: 0.45 }} />
          <stop offset="1" style={{ stopColor: "var(--sun)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="600" height="560" fill={`url(#${id}-sky)`} />
      <circle cx="455" cy="300" r="190" fill={`url(#${id}-glow)`} />
      <circle cx="455" cy="300" r="74" fill={`url(#${id}-sun)`} />
      <g fill="none" style={{ stroke: mix("var(--teal)", 30) }} strokeWidth="1.5" strokeLinecap="round">
        <path d="M60 120c30-14 60-14 90 0M110 92c18-8 36-8 54 0" />
        <path d="M250 70c22-10 44-10 66 0" />
      </g>
      <path d="M0 360C90 320 170 330 250 350s170 40 260 10 90-30 90-30v220H0Z" style={{ fill: mix("var(--teal)", 38) }} />
      <path d="M0 410c80-30 180-40 280-15s200 40 320 5v160H0Z" style={{ fill: mix("var(--teal)", 62) }} />
      <path d="M0 470c110-25 220-30 330-10s190 20 270 5v95H0Z" style={{ fill: mix("var(--deep)", 85, "var(--teal)") }} />
      <g style={{ fill: mix("var(--sun)", 70) }}>
        <circle cx="96" cy="250" r="3" /><circle cx="168" cy="210" r="2" /><circle cx="530" cy="120" r="2.5" /><circle cx="300" cy="160" r="2" />
      </g>
    </svg>
  );
}

export function HeroArt() {
  return (
    <div className="art" role="img" aria-label="ИИ-менеджер записывает клиента, а в CRM появляется карточка лида">
      <SteppeScene id="hero" />
      <div className="float f-chat bob">
        <div className="ui">
          <div className="ui-head">
            <div className="ava" style={{ background: "var(--teal)", color: "#fff" }}>Ш</div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <b>Клиника «Шипагер»</b>
              <span className="online">ИИ-менеджер · онлайн</span>
            </div>
          </div>
          <div className="msgs">
            <div className="msg me">Здравствуйте, сколько стоит check-up сердца?<time>23:41</time></div>
            <div className="msg">35 000 ₸: ЭКГ, УЗИ сердца, анализы и приём кардиолога за один визит. Удобнее в субботу в 10:00 или в понедельник в 17:00?<time>23:41</time></div>
            <div className="msg me">Суббота подойдёт, записывайте<time>23:42</time></div>
          </div>
        </div>
      </div>
      <div className="float f-toast bob slow">
        <span className="toastcard"><i>+1</i>Новая запись · сб 10:00</span>
      </div>
      <div className="float f-lead bob slow">
        <div className="ui">
          <div className="ui-head"><b>Карточка лида</b><span className="chip hot" style={{ marginLeft: "auto" }}>горячий · 82%</span></div>
          <dl className="kv" style={{ fontSize: 13 }}>
            <dt>Клиент</dt><dd>Айгерим</dd>
            <dt>Услуга</dt><dd>Check-up «Сердце»</dd>
            <dt>Шаг</dt><dd>подтвердить в пятницу</dd>
          </dl>
          <div style={{ padding: "0 14px 14px" }}><div className="meter"><i style={{ width: "82%" }} /></div></div>
        </div>
      </div>
    </div>
  );
}

/** Небольшие иллюстрации для карточек выбора в окне «Обсудить проект». */
export function ChoiceArt({ kind }: { kind: "fast" | "demo" }) {
  if (kind === "fast")
    return (
      <svg viewBox="0 0 300 110" aria-hidden="true">
        <rect width="300" height="110" style={{ fill: mix("var(--sun)", 18) }} />
        <circle cx="236" cy="56" r="34" fill="#FFCF4D" />
        <circle cx="236" cy="56" r="26" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M236 40v16l11 7" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <rect x="26" y="28" width="150" height="16" rx="8" style={{ fill: "var(--bg)" }} />
        <rect x="26" y="52" width="120" height="16" rx="8" style={{ fill: mix("var(--teal)", 30) }} />
        <rect x="26" y="76" width="90" height="10" rx="5" style={{ fill: mix("var(--teal)", 18) }} />
      </svg>
    );
  return (
    <svg viewBox="0 0 300 110" aria-hidden="true">
      <rect width="300" height="110" style={{ fill: mix("var(--teal)", 14) }} />
      <rect x="40" y="16" width="220" height="86" rx="10" style={{ fill: "var(--bg)" }} />
      <rect x="40" y="16" width="220" height="16" rx="8" style={{ fill: mix("var(--teal)", 22) }} />
      <circle cx="52" cy="24" r="3" fill="#F26B4F" /><circle cx="62" cy="24" r="3" fill="#F6B21E" /><circle cx="72" cy="24" r="3" fill="#23A26D" />
      <rect x="56" y="42" width="110" height="14" rx="7" style={{ fill: mix("var(--teal)", 18) }} />
      <rect x="120" y="62" width="122" height="14" rx="7" style={{ fill: mix("var(--teal)", 45) }} />
      <rect x="56" y="82" width="80" height="12" rx="6" style={{ fill: mix("var(--teal)", 18) }} />
    </svg>
  );
}
