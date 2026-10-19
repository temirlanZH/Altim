import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { BadInput } from "./guard";

/*
 * Загрузка публичной страницы сайта для сборки агента.
 * Защита от SSRF: только http(s) на стандартных портах, все IP хоста проверяются
 * на внутренние диапазоны, редиректы проверяются заново, ограничены время и размер.
 */

const MAX_BYTES = 1_500_000;
const TIMEOUT_MS = 8000;

function isPrivateIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224
    );
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
  return v === "::" || v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("ff");
}

export function normalizeUrl(raw: string) {
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new BadInput("Не похоже на адрес сайта. Пример: clinic.kz");
  }
  if (!["http:", "https:"].includes(u.protocol)) throw new BadInput("Поддерживаются только ссылки http и https");
  if (u.port && !["80", "443"].includes(u.port)) throw new BadInput("Адрес с нестандартным портом не поддерживается");
  if (u.username || u.password) throw new BadInput("Ссылка не должна содержать логин и пароль");
  if (/(^|\.)(instagram\.com|facebook\.com|tiktok\.com|wa\.me|t\.me)$/i.test(u.hostname))
    throw new BadInput("Соцсети закрыты для чтения. Вставьте ссылку на сайт или прайс текстом в поле ниже.");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new BadInput("Этот адрес недоступен");
  u.hash = "";
  return u;
}

async function assertPublicHost(host: string) {
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new BadInput("Сайт не найден. Проверьте адрес.");
  if (addrs.some((a) => isPrivateIp(a.address))) throw new BadInput("Этот адрес недоступен");
}

async function fetchPage(start: URL): Promise<{ url: URL; html: string }> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHost(url.hostname);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "altim-AgentBuilder/1.0 (+demo)", Accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      url = normalizeUrl(new URL(loc, url).toString());
      continue;
    }
    if (!res.ok) throw new BadInput(`Сайт ответил ошибкой ${res.status}`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) throw new BadInput("По ссылке не веб-страница");
    const reader = res.body?.getReader();
    if (!reader) return { url, html: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      chunks.push(value);
      if (size > MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    return { url, html: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)) };
  }
  throw new BadInput("Слишком много перенаправлений");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…" };

function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/article)[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : " ";
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t\f\v ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const meta = (html: string, re: RegExp) => html.match(re)?.[1]?.trim() ?? "";

/** Ссылки на страницы с ценами и услугами того же сайта. */
function priceLinks(html: string, base: URL) {
  const out: URL[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const label = htmlToText(m[2]).toLowerCase();
    const href = m[1];
    if (!/(цен|прайс|стоимост|тариф|услуг|price|pricing|services|menu|меню|каталог|catalog)/i.test(label + " " + href)) continue;
    try {
      const u = new URL(href, base);
      u.hash = "";
      if (u.hostname === base.hostname && /^https?:$/.test(u.protocol) && u.href !== base.href && !out.some((x) => x.href === u.href)) out.push(u);
    } catch {}
    if (out.length >= 2) break;
  }
  return out;
}

/** Текст главной страницы и до двух страниц с ценами. */
export async function readSite(raw: string) {
  const start = normalizeUrl(raw);
  const main = await fetchPage(start);
  const title = meta(main.html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = meta(main.html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const parts = [`URL: ${main.url.href}`, title && `Заголовок: ${title}`, desc && `Описание: ${desc}`, htmlToText(main.html).slice(0, 30_000)];
  for (const link of priceLinks(main.html, main.url)) {
    try {
      const page = await fetchPage(link);
      parts.push(`\n--- Страница ${page.url.pathname} ---\n` + htmlToText(page.html).slice(0, 20_000));
    } catch {}
  }
  const text = parts.filter(Boolean).join("\n");
  if (text.length < 200) throw new BadInput("На странице почти нет текста. Возможно, сайт собран на JavaScript. Вставьте прайс вручную.");
  return { url: main.url.href, text: text.slice(0, 70_000) };
}
