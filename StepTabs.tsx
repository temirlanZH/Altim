"use client";
import { useState } from "react";
import { STEPS } from "@/lib/content";
import { CallMock, ChatMock, LeadCardMock, ReportMock } from "./Mockups";

const VISUALS = [<CallMock key="a" />, <ChatMock key="b" lines={[["c", "А если спросят то, чего нет в прайсе?", "12:04"], ["m", "Отвечу, что уточню у коллег, и передам вопрос менеджеру. Цены называю только из вашего прайса.", "12:04"]]} title="Тестовый чат" letter="A" />, <LeadCardMock key="c" />, <ReportMock key="d" />];

export function StepTabs() {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Этапы запуска">
        {STEPS.map((st, k) => (
          <button key={st.tab} role="tab" id={`step-${k}`} aria-selected={i === k} aria-controls="step-panel" onClick={() => setI(k)}>
            <span className="mono muted" style={{ marginRight: 6 }}>0{k + 1}</span>
            {st.tab}
          </button>
        ))}
      </div>
      <div className="tabpanel" id="step-panel" role="tabpanel" aria-labelledby={`step-${i}`}>
        <div className="tile">
          <div className="t-head">
            <span className="kicker">Шаг {i + 1} из {STEPS.length}</span>
            <h3 style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.02em" }}>{s.title}</h3>
          </div>
          <p>{s.text}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <div className="tile">{VISUALS[i]}</div>
      </div>
    </div>
  );
}
