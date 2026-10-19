"use client";
import { useEffect, useRef, useState } from "react";
import type { Line } from "./useChat";

type Props = {
  lines: Line[];
  typing: boolean;
  quick: string[];
  note: string;
  inputId: string;
  onSend: (text: string) => void;
  sysText?: (l: Line) => string;
  placeholder?: string;
};

export function ChatView({ lines, typing, quick, note, inputId, onSend, sysText, placeholder = "Напишите как клиент…" }: Props) {
  const [input, setInput] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [lines, typing]);

  return (
    <>
      <div className="msgs" ref={log} aria-live="polite">
        {lines.map((l, i) =>
          l.r === "sys" ? (
            <div key={i} className="sysmsg">{sysText ? sysText(l) : l.t}</div>
          ) : (
            <div key={i} className={l.r === "c" ? "msg me" : l.skip ? "msg err" : "msg"}>{l.t}</div>
          ),
        )}
        {typing && (
          <div className="msg" aria-label="печатает">
            <span className="dots"><i /><i /><i /></span>
          </div>
        )}
      </div>
      {quick.length > 0 && (
        <div className="quick">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => onSend(q)}>{q}</button>
          ))}
        </div>
      )}
      <form
        className="send"
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (t) {
            setInput("");
            onSend(t);
          }
        }}
      >
        <input id={inputId} aria-label="Сообщение" placeholder={placeholder} autoComplete="off" value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-dark btn-sm" style={{ height: 42 }}>Отправить</button>
      </form>
      {note && <p className="note">{note}</p>}
    </>
  );
}
