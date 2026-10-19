"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_CLIENT_MESSAGES, NICHES, NICHE_IDS, customNiche, greeting, type BuiltAgent, type Booking, type ChatTurn, type LeadCard, type NicheId } from "@/lib/niches";
import { ChatView } from "./ChatView";
import { post, useChat } from "./useChat";

type Mode = NicheId | "custom";
type CardState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; text: string } | { kind: "ready"; card: LeadCard };
type Build = { kind: "idle" } | { kind: "loading"; url: string } | { kind: "error"; text: string } | { kind: "ready"; agent: BuiltAgent & { found: boolean } };

const initial = (name: string) => name.replace(/[«»"]/g, "").replace(/^Клиника\s+/i, "").trim().charAt(0).toUpperCase() || "A";

export function DemoBot({ initialUrl = "" }: { initialUrl?: string }) {
  const [mode, setMode] = useState<Mode>("clinic");
  const [agent, setAgent] = useState<(BuiltAgent & { found: boolean }) | null>(null);
  const [name, setName] = useState(NICHES.clinic.name);
  const [prices, setPrices] = useState(NICHES.clinic.prices);
  const [info, setInfo] = useState(NICHES.clinic.info);
  const [title, setTitle] = useState(NICHES.clinic.name);
  const [url, setUrl] = useState(initialUrl);
  const [build, setBuild] = useState<Build>({ kind: "idle" });
  const [card, setCard] = useState<CardState>({ kind: "idle" });
  const auto = useRef(false);

  const payload = () =>
    mode === "custom"
      ? { niche: "custom", label: agent?.label ?? "", goal: agent?.goal ?? "", company: title, prices, info }
      : { niche: mode, company: title, prices, info };

  const chat = useChat({
    payload,
    onBooked: (b, history, run) => {
      chat.addSystem("Клиент записан. ИИ собирает карточку лида…");
      void buildCard(b, history, run);
    },
  });
  const { reset } = chat;

  useEffect(() => {
    reset(greeting(NICHES.clinic.name));
  }, [reset]);

  function restart(company: string) {
    const n = company.trim() || "Компания";
    setTitle(n);
    setCard({ kind: "idle" });
    reset(greeting(n));
  }

  function pick(id: NicheId) {
    const c = NICHES[id];
    setMode(id);
    setName(c.name);
    setPrices(c.prices);
    setInfo(c.info);
    restart(c.name);
  }

  function applyAgent(a: BuiltAgent & { found: boolean }) {
    setAgent(a);
    setMode("custom");
    setName(a.company);
    setPrices(a.prices);
    setInfo(a.info);
    restart(a.company);
  }

  async function buildAgent(raw = url) {
    const u = raw.trim();
    if (!u) {
      setBuild({ kind: "error", text: "Вставьте ссылку на сайт, например clinic.kz" });
      return;
    }
    setBuild({ kind: "loading", url: u });
    const res = await post<BuiltAgent & { found: boolean }>("/api/agent", { url: u });
    if (!res.ok) {
      setBuild({ kind: "error", text: res.error });
      return;
    }
    setBuild({ kind: "ready", agent: res.data });
    applyAgent(res.data);
  }

  useEffect(() => {
    if (initialUrl && !auto.current) {
      auto.current = true;
      void buildAgent(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  async function buildCard(booking: Booking, history: ChatTurn[], run: number) {
    setCard({ kind: "loading" });
    const res = await post<LeadCard>("/api/lead", { ...payload(), booking, history });
    if (run !== chat.runId.current) return;
    setCard(res.ok ? { kind: "ready", card: res.data } : { kind: "error", text: res.error });
  }

  const niche = mode === "custom" ? customNiche(agent?.label ?? "", agent?.goal ?? "") : NICHES[mode];
  const quick = chat.booked ? niche.qa : niche.q;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="tile" style={{ gap: 14 }}>
        <div className="t-head">
          <span className="kicker">Шаг 1 · соберите агента</span>
          <h3 style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.02em" }}>Вставьте ссылку на сайт — ИИ прочитает его, найдёт цены и условия</h3>
        </div>
        <form
          className="urlbar"
          onSubmit={(e) => {
            e.preventDefault();
            void buildAgent();
          }}
        >
          <input id="d-url" type="url" inputMode="url" aria-label="Ссылка на сайт" placeholder="https://ваш-сайт.kz" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn btn-dark" disabled={build.kind === "loading"}>
            {build.kind === "loading" ? "Читаю сайт…" : "Собрать агента"}
          </button>
        </form>
        {build.kind === "error" && <p className="hint" style={{ color: "var(--bad)" }}>{build.text}</p>}
        {build.kind === "loading" && <p className="hint">Открываю {build.url}, ищу страницы с ценами и условиями. Обычно 10–30 секунд.</p>}
        {build.kind === "ready" && (
          <p className="hint">
            Агент собран по {build.agent.source}. {build.agent.found ? "Цены найдены и перенесены в прайс." : "Цен на сайте не нашлось — допишите прайс в поле ниже."} Проверьте данные и пишите боту.
          </p>
        )}
        <div className="seg" role="group" aria-label="Или выберите шаблон">
          <span className="mono muted" style={{ alignSelf: "center", marginRight: 4 }}>или шаблон:</span>
          {agent && (
            <button type="button" aria-pressed={mode === "custom"} onClick={() => applyAgent(agent)}>
              {agent.company || "Ваш сайт"}
            </button>
          )}
          {NICHE_IDS.map((id) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => pick(id)}>
              {NICHES[id].tab}
            </button>
          ))}
        </div>
      </div>

      <div className="demo">
        <div className="panel">
          <span className="kicker">Шаг 2 · проверьте данные</span>
          <label htmlFor="d-name">Название компании</label>
          <input id="d-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <label htmlFor="d-prices">Прайс-лист</label>
          <textarea id="d-prices" value={prices} onChange={(e) => setPrices(e.target.value)} maxLength={4000} style={{ minHeight: 160 }} />
          <p className="hint">Каждая позиция с новой строки: «Услуга — цена». Бот называет только эти цены.</p>
          <label htmlFor="d-info">Адрес, график, условия</label>
          <textarea id="d-info" style={{ minHeight: 80 }} value={info} onChange={(e) => setInfo(e.target.value)} maxLength={1500} />
          <button className="btn btn-line" type="button" style={{ width: "100%", marginTop: 16 }} onClick={() => restart(name)}>
            Применить и начать заново
          </button>
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="chat">
            <div className="ui-head">
              <div className="ava">{initial(title)}</div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, minWidth: 0 }}>
                <b style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</b>
                <span className="online">{chat.booked ? "клиент записан" : "ИИ-менеджер · онлайн"}</span>
              </div>
              <span className="mono muted" style={{ marginLeft: "auto" }}>Шаг 3 · напишите боту</span>
            </div>
            <ChatView
              lines={chat.lines}
              typing={chat.typing}
              quick={quick}
              note={chat.note || `Демо: до ${MAX_CLIENT_MESSAGES} сообщений в диалоге.`}
              inputId="d-msg"
              onSend={chat.ask}
              sysText={(l) => (card.kind === "ready" ? "Клиент записан. Карточка лида готова ниже." : l.t)}
            />
          </div>
          <LeadCardView state={card} booking={chat.booked} />
        </div>
      </div>
    </div>
  );
}

function LeadCardView({ state, booking }: { state: CardState; booking: Booking | null }) {
  if (state.kind === "idle") return null;
  if (state.kind !== "ready")
    return (
      <div className="card-out">
        <div className="box">
          <b className="ink">{state.kind === "loading" ? "Карточка лида готовится…" : "Не удалось собрать карточку"}</b>
          <span className="muted">{state.kind === "loading" ? "ИИ разбирает переписку: потребность, возражения, допродажи." : state.text}</span>
        </div>
      </div>
    );
  const a = state.card;
  const bk = booking ?? { name: "", phone: "", service: "", datetime: "", price: "" };
  const list = <T,>(arr: T[], f: (x: T) => string) =>
    arr?.length ? <ul>{arr.map((x, i) => <li key={i}>{f(x)}</li>)}</ul> : <span className="muted">не выяснено</span>;
  return (
    <div className="card-out">
      <div className="box">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span className="mono">Карточка лида · создана ИИ</span>
          <span className="chip hot">{a.temperature || "тёплый"} · {a.score}%</span>
        </div>
        <h3>{[bk.name, bk.service].filter(Boolean).join(" · ")}</h3>
        <span className="muted num">{[bk.datetime, bk.price, bk.phone].filter(Boolean).join(" · ")}</span>
        <div className="meter"><i style={{ width: `${a.score}%` }} /></div>
        <p>{a.summary}</p>
      </div>
      <div className="grid g2">
        <div className="box">
          <span className="mono">Потребность</span>
          <p className="ink">{a.need || "не выяснено"}</p>
          <span className="mono">Возражения</span>
          {list(a.objections, (o) => `«${o.text}» — ${o.status}`)}
        </div>
        <div className="box">
          <span className="mono">Допродажи из прайса</span>
          {list(a.upsell, (u) => `${u.item}${u.price ? " — " + u.price : ""}`)}
          <span className="mono">Следующие шаги</span>
          {list(a.nextSteps, (s) => s)}
        </div>
      </div>
      <div className="box">
        <span className="mono">Скрипт звонка-подтверждения</span>
        <p className="ink">{a.callScript}</p>
      </div>
    </div>
  );
}
