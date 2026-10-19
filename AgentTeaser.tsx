"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Поле «ссылка на сайт» на главной: переводит в демо и сразу собирает агента. */
export function AgentTeaser() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  return (
    <form
      className="urlbar"
      onSubmit={(e) => {
        e.preventDefault();
        const u = url.trim();
        router.push(u ? `/demo?url=${encodeURIComponent(u)}` : "/demo");
      }}
    >
      <input id="t-url" type="url" inputMode="url" aria-label="Ссылка на сайт" placeholder="https://ваш-сайт.kz" value={url} onChange={(e) => setUrl(e.target.value)} />
      <button className="btn btn-dark">Собрать агента <span className="arr">→</span></button>
    </form>
  );
}
