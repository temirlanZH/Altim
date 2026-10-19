"use client";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NICHES } from "@/lib/niches";
import { getBackend, type Backend, type User } from "./backend";
import { defaultDashboards, type Dashboard, type Integrations } from "./sources";
import { newLead, type Campaign, type Lead, type PriceItem, type Profile } from "./types";

type Cabinet = {
  backend: Backend;
  user: User;
  profile: Profile;
  leads: Lead[];
  prices: PriceItem[];
  campaigns: Campaign[];
  integrations: Integrations;
  dashboards: Dashboard[];
  saveIntegrations: (next: Integrations) => Promise<boolean>;
  saveDashboards: (next: Dashboard[]) => Promise<boolean>;
  toast: (t: string) => void;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  createLead: (l: Partial<Lead>) => Promise<Lead | null>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<boolean>;
  deleteLead: (id: string) => Promise<boolean>;
  savePrices: (items: PriceItem[]) => Promise<boolean>;
  addCampaigns: (items: Omit<Campaign, "id">[]) => Promise<boolean>;
  deleteCampaign: (id: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Cabinet | null>(null);
export const useCabinet = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCabinet вне CabinetProvider");
  return c;
};

const DAY = 86_400_000;

/** Примеры, чтобы дашборды не были пустыми в первый день. Все помечены demo и удаляются одной кнопкой. */
function demoData(): { leads: Omit<Lead, "id">[]; campaigns: Omit<Campaign, "id">[]; prices: PriceItem[] } {
  const now = Date.now();
  const prices = NICHES.clinic.prices.split("\n").map((l) => {
    const [name, rest = ""] = l.split(" — ");
    const m = rest.match(/^(.*?)(?:\s*\((.*)\))?$/);
    return { cat: "", name, price: m?.[1] ?? rest, note: m?.[2] ?? "" };
  });
  const L = (d: number, o: Partial<Lead>) => newLead({ demo: true, createdAt: now - d * DAY, ...o });
  return {
    prices,
    leads: [
      L(0, { name: "Пример: Айгерим", phone: "+7 707 000 00 14", service: "Check-up «Сердце»", datetime: "суббота, 10:00", price: "35 000 ₸", amount: 35000, source: "Instagram / Facebook таргет", status: "booked", temperature: "горячий", score: 82, analysisState: "done", history: [{ at: now, text: "ИИ-бот записал клиента" }], analysis: { temperature: "горячий", score: 82, summary: "Женщина интересуется check-up сердца после рекламы. Сомневалась из-за цены, после аргумента про комплекс и рассрочку записалась на субботу.", need: "Проверить сердце за один визит", objections: [{ text: "Дороговато, подумаю", status: "снято" }], upsell: [{ item: "Общий анализ крови", price: "2 500 ₸" }], nextSteps: ["В пятницу до 18:00 позвонить и подтвердить запись", "Напомнить прийти натощак"], callScript: "Айгерим, здравствуйте! Это клиника «Шипагер». Напоминаю, что в субботу в 10:00 ждём вас на check-up «Сердце». Приходите, пожалуйста, натощак. Если удобнее оплатить в рассрочку Kaspi Red, оформим на месте." } }),
      L(1, { name: "Пример: Ержан", phone: "+7 701 000 00 22", service: "Приём кардиолога", datetime: "вторник, 17:00", price: "12 000 ₸", amount: 12000, source: "Google Ads", status: "won", temperature: "тёплый", score: 64, history: [{ at: now - DAY, text: "Статус: Оплатил" }] }),
      L(2, { name: "Пример: Дина", phone: "+7 705 000 00 31", service: "УЗИ брюшной полости", price: "9 000 ₸", amount: 9000, source: "2GIS", status: "new", temperature: "холодный", score: 30 }),
      L(4, { name: "Пример: Самат", phone: "+7 776 000 00 45", service: "Консультация терапевта", datetime: "четверг, 11:30", price: "8 000 ₸", amount: 8000, source: "Instagram / Facebook таргет", status: "came", temperature: "тёплый", score: 58 }),
      L(6, { name: "Пример: Мадина", phone: "+7 702 000 00 57", service: "Check-up «Сердце»", price: "35 000 ₸", amount: 35000, source: "TikTok таргет", status: "lost", temperature: "холодный", score: 20 }),
      ...extraDemo(now),
    ],
    campaigns: [
      { platform: "Meta (Instagram/Facebook)", campaign: "Check-up «Сердце» — 35+", period: "1–15 число", spend: 186000, impressions: 92400, clicks: 1310, leads: 54, sales: 17, revenue: 595000, demo: true, createdAt: now },
      { platform: "Google Ads", campaign: "Поиск: кардиолог", period: "1–15 число", spend: 98000, impressions: 12800, clicks: 860, leads: 41, sales: 19, revenue: 290000, demo: true, createdAt: now },
      { platform: "TikTok", campaign: "Видео врача", period: "1–15 число", spend: 120000, impressions: 214000, clicks: 1940, leads: 21, sales: 4, revenue: 48000, demo: true, createdAt: now },
      { platform: "2GIS", campaign: "Приоритет в карточке", period: "1–15 число", spend: 30000, impressions: 18500, clicks: 410, leads: 14, sales: 8, revenue: 96000, demo: true, createdAt: now },
    ],
  };
}

/** Ещё два десятка примеров с разным временем суток: видно, сколько заявок приходит, пока офис закрыт. */
function extraDemo(now: number): Omit<Lead, "id">[] {
  const names = ["Алия", "Нурлан", "Жанар", "Бекзат", "Асель", "Тимур", "Гульнара", "Арман", "Камила", "Данияр", "Сауле", "Ерлан"];
  const svc: [string, number][] = [["Check-up «Сердце»", 35000], ["УЗИ брюшной полости", 9000], ["Приём кардиолога", 12000], ["Консультация терапевта", 8000]];
  const src = ["Instagram / Facebook таргет", "WhatsApp напрямую", "Google Ads", "2GIS", "Сайт"];
  const hours = [23, 0, 1, 22, 7, 21, 10, 14, 23, 6, 20, 12, 2, 16, 22, 8, 11, 0, 19, 23, 15, 5];
  const st = ["booked", "won", "booked", "confirmed", "new", "came", "won", "lost", "booked", "won", "new", "confirmed", "booked", "won", "came", "lost", "new", "booked", "won", "booked", "confirmed", "new"] as const;
  const day0 = new Date(now);
  day0.setHours(0, 0, 0, 0);
  return hours.map((h, i) => {
    const [service, amount] = svc[i % svc.length];
    const createdAt = Math.min(now - 60_000, day0.getTime() - (i % 13) * DAY + h * 3_600_000 + ((i * 17) % 60) * 60_000);
    return newLead({ demo: true, createdAt, name: `Пример: ${names[i % names.length]}`, phone: `+7 70${i % 9} 000 ${String(10 + i).padStart(2, "0")} ${String(30 + i).padStart(2, "0")}`, service, amount, price: `${amount.toLocaleString("ru-RU")} ₸`, source: src[i % src.length], status: st[i], temperature: i % 3 ? "тёплый" : "горячий", score: 40 + ((i * 13) % 55) });
  });
}

type Loaded = { user: User; profile: Profile; leads: Lead[]; prices: PriceItem[]; campaigns: Campaign[]; integrations: Integrations; dashboards: Dashboard[] };

/** Одна загрузка на всех: повторный вызов во время загрузки (StrictMode, быстрые переходы) ждёт тот же запрос и не создаёт примеры дважды. */
let inflight: Promise<Loaded | null> | null = null;
function load(backend: Backend) {
  inflight ??= loadOnce(backend).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function loadOnce(backend: Backend): Promise<Loaded | null> {
  const user = await backend.currentUser();
  if (!user) return null;
  let profile = await backend.getProfile(user);
  let [leads, prices, campaigns] = await Promise.all([backend.listLeads(), backend.getPrices(), backend.listCampaigns()]);
  const [integrations, dashboards] = await Promise.all([backend.getKV<Integrations>("integrations", {}), backend.getKV<Dashboard[]>("dashboards", [])]);
  if (!profile.seeded) {
    await backend.updateProfile(user, { seeded: true });
    const demo = demoData();
    if (!leads.length) for (const l of demo.leads) leads.push(await backend.createLead(l));
    if (!campaigns.length) campaigns = await backend.addCampaigns(demo.campaigns);
    if (!prices.length) {
      await backend.savePrices(demo.prices);
      prices = demo.prices;
    }
    const patch = { seeded: true, company: profile.company || "Моя компания", label: profile.label || "клиника", goal: profile.goal || NICHES.clinic.goal, info: profile.info || NICHES.clinic.info };
    await backend.updateProfile(user, patch);
    profile = { ...profile, ...patch };
    leads = leads.sort((a, b) => b.createdAt - a.createdAt);
  }
  return { user, profile, leads, prices, campaigns, integrations, dashboards: dashboards.length ? dashboards : defaultDashboards() };
}

export function CabinetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [backend] = useState(getBackend);
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const toast = useCallback((t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2800);
  }, []);

  useEffect(() => {
    let alive = true;
    load(backend)
      .then((r) => {
        if (!alive) return;
        if (r) setState(r);
        else router.replace(`/login?next=${encodeURIComponent(path)}`);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Не удалось загрузить кабинет"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend]);

  const guard = async (fn: () => Promise<void>) => {
    try {
      await fn();
      return true;
    } catch (e) {
      toast(e instanceof Error ? `Не сохранилось: ${e.message}` : "Не удалось сохранить");
      return false;
    }
  };

  if (error)
    return (
      <div className="cab-center">
        <div className="box" style={{ maxWidth: 480 }}>
          <b className="ink">Не удалось открыть кабинет</b>
          <p>{error}</p>
          <button className="btn btn-dark" onClick={() => location.reload()}>Обновить страницу</button>
        </div>
      </div>
    );
  if (!state) return <div className="cab-center"><span className="dots"><i /><i /><i /></span></div>;

  const set = (patch: Partial<typeof state>) => setState((s) => (s ? { ...s, ...patch } : s));
  const value: Cabinet = {
    backend,
    ...state,
    toast,
    updateProfile: (patch) =>
      guard(async () => {
        await backend.updateProfile(state.user, patch);
        setState((s) => (s ? { ...s, profile: { ...s.profile, ...patch } } : s));
      }),
    createLead: async (l) => {
      try {
        const lead = await backend.createLead(newLead(l));
        setState((s) => (s ? { ...s, leads: [lead, ...s.leads] } : s));
        return lead;
      } catch (e) {
        toast(e instanceof Error ? `Лид не сохранился: ${e.message}` : "Лид не сохранился");
        return null;
      }
    },
    updateLead: (id, patch) =>
      guard(async () => {
        await backend.updateLead(id, patch);
        setState((s) => (s ? { ...s, leads: s.leads.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : s));
      }),
    deleteLead: (id) =>
      guard(async () => {
        await backend.deleteLead(id);
        setState((s) => (s ? { ...s, leads: s.leads.filter((x) => x.id !== id) } : s));
      }),
    savePrices: (items) =>
      guard(async () => {
        await backend.savePrices(items);
        set({ prices: items });
      }),
    addCampaigns: (items) =>
      guard(async () => {
        const added = await backend.addCampaigns(items);
        setState((s) => (s ? { ...s, campaigns: [...s.campaigns, ...added] } : s));
      }),
    deleteCampaign: (id) =>
      guard(async () => {
        await backend.deleteCampaign(id);
        setState((s) => (s ? { ...s, campaigns: s.campaigns.filter((x) => x.id !== id) } : s));
      }),
    saveIntegrations: (next) =>
      guard(async () => {
        await backend.setKV("integrations", next);
        set({ integrations: next });
      }),
    saveDashboards: (next) =>
      guard(async () => {
        set({ dashboards: next });
        await backend.setKV("dashboards", next);
      }),
    signOut: async () => {
      await backend.signOut();
      router.replace("/login");
    },
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}
