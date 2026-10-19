"use client";
import { useState } from "react";

export function CopyPhone({ phone, display }: { phone: string; display: string }) {
  const [msg, setMsg] = useState("");
  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2600);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      flash("Номер скопирован");
    } catch {
      const node = document.getElementById("phone");
      if (node) {
        const r = document.createRange();
        r.selectNodeContents(node);
        const s = getSelection();
        s?.removeAllRanges();
        s?.addRange(r);
      }
      flash(`Номер выделен, скопируйте его: ${display}`);
    }
  };
  return (
    <>
      <button className="btn btn-line" type="button" onClick={copy}>
        Копировать номер
      </button>
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </>
  );
}
