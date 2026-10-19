"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TRIAL_DAYS, type Campaign, type Lead, type PriceItem, type Profile } from "./types";

/*
 * Хранилище кабинета. Если заданы NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY —
 * настоящие аккаунты и общая база Supabase (схема в supabase/schema.sql, доступ по RLS).
 * Без них — демо-режим: аккаунты и данные хранятся только в этом браузере.
 */

export type User = { id: string; email: string };
export type SignUpMeta = { company: string; phone: string; plan?: string };

export interface Backend {
  mode: "supabase" | "local";
  currentUser(): Promise<User | null>;
  signUp(email: string, password: string, meta: SignUpMeta): Promise<{ needsConfirm: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  getProfile(user: User): Promise<Profile>;
  updateProfile(user: User, patch: Partial<Profile>): Promise<void>;
  listLeads(): Promise<Lead[]>;
  createLead(l: Omit<Lead, "id">): Promise<Lead>;
  updateLead(id: string, patch: Partial<Lead>): Promise<void>;
  deleteLead(id: string): Promise<void>;
  getPrices(): Promise<PriceItem[]>;
  savePrices(items: PriceItem[]): Promise<void>;
  listCampaigns(): Promise<Campaign[]>;
  addCampaigns(items: Omit<Campaign, "id">[]): Promise<Campaign[]>;
  deleteCampaign(id: string): Promise<void>;
  /** Настройки кабинета произвольной формы: интеграции, дашборды. */
  getKV<T>(key: string, fallback: T): Promise<T>;
  setKV(key: string, value: unknown): Promise<void>;
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const trialEnd = () => Date.now() + TRIAL_DAYS * 86_400_000;

export class AuthError extends Error {}

/* ---------------- демо-режим: localStorage ---------------- */

type LocalAccount = { id: string; email: string; pass: string; profile: Profile };
type LocalData = { leads: Lead[]; prices: PriceItem[]; campaigns: Campaign[] };

const ls = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : d;
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      throw new Error("Браузер не дал сохранить данные. Отключите приватный режим или освободите место.");
    }
  },
};

async function hash(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("altim:" + s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

class LocalBackend implements Backend {
  mode = "local" as const;
  private accounts = () => ls.get<Record<string, LocalAccount>>("altim:accounts", {});
  private session = () => ls.get<string | null>("altim:session", null);
  private dataKey = () => `altim:data:${this.session()}`;
  private data = (): LocalData => ls.get<LocalData>(this.dataKey(), { leads: [], prices: [], campaigns: [] });
  private save = (d: LocalData) => ls.set(this.dataKey(), d);

  async currentUser() {
    const email = this.session();
    const acc = email ? this.accounts()[email] : null;
    return acc ? { id: acc.id, email: acc.email } : null;
  }
  async signUp(email: string, password: string, meta: SignUpMeta) {
    const all = this.accounts();
    const key = email.toLowerCase();
    if (all[key]) throw new AuthError("Аккаунт с такой почтой уже есть. Войдите.");
    const id = uid();
    all[key] = {
      id,
      email: key,
      pass: await hash(password),
      profile: { id, email: key, company: meta.company, phone: meta.phone, label: "", goal: "", info: "", source: "Тест-бот", targetCpl: 3000, plan: meta.plan || "trial", trialEndsAt: trialEnd(), createdAt: Date.now(), seeded: false, lastReport: null },
    };
    ls.set("altim:accounts", all);
    ls.set("altim:session", key);
    return { needsConfirm: false };
  }
  async signIn(email: string, password: string) {
    const acc = this.accounts()[email.toLowerCase()];
    if (!acc || acc.pass !== (await hash(password))) throw new AuthError("Неверная почта или пароль.");
    ls.set("altim:session", acc.email);
  }
  async signOut() {
    ls.set("altim:session", null);
  }
  async getProfile(user: User) {
    return this.accounts()[user.email].profile;
  }
  async updateProfile(user: User, patch: Partial<Profile>) {
    const all = this.accounts();
    all[user.email].profile = { ...all[user.email].profile, ...patch };
    ls.set("altim:accounts", all);
  }
  async listLeads() {
    return this.data().leads.slice().sort((a, b) => b.createdAt - a.createdAt);
  }
  async createLead(l: Omit<Lead, "id">) {
    const d = this.data();
    const lead = { ...l, id: uid() };
    d.leads.unshift(lead);
    this.save(d);
    return lead;
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    const d = this.data();
    d.leads = d.leads.map((x) => (x.id === id ? { ...x, ...patch } : x));
    this.save(d);
  }
  async deleteLead(id: string) {
    const d = this.data();
    d.leads = d.leads.filter((x) => x.id !== id);
    this.save(d);
  }
  async getPrices() {
    return this.data().prices;
  }
  async savePrices(items: PriceItem[]) {
    const d = this.data();
    d.prices = items;
    this.save(d);
  }
  async listCampaigns() {
    return this.data().campaigns;
  }
  async addCampaigns(items: Omit<Campaign, "id">[]) {
    const d = this.data();
    const added = items.map((c) => ({ ...c, id: uid() }));
    d.campaigns.push(...added);
    this.save(d);
    return added;
  }
  async deleteCampaign(id: string) {
    const d = this.data();
    d.campaigns = d.campaigns.filter((x) => x.id !== id);
    this.save(d);
  }
  async getKV<T>(key: string, fallback: T) {
    return ls.get<T>(`altim:kv:${this.session()}:${key}`, fallback);
  }
  async setKV(key: string, value: unknown) {
    ls.set(`altim:kv:${this.session()}:${key}`, value);
  }
}

/* ---------------- Supabase ---------------- */

type Row = Record<string, unknown>;
const ts = (v: unknown) => (typeof v === "string" ? Date.parse(v) : Date.now());
const iso = (n?: number) => new Date(n ?? Date.now()).toISOString();

const leadFromRow = (r: Row): Lead => ({
  id: r.id as string,
  name: (r.name as string) ?? "",
  phone: (r.phone as string) ?? "",
  service: (r.service as string) ?? "",
  datetime: (r.datetime as string) ?? "",
  price: (r.price as string) ?? "",
  amount: Number(r.amount) || 0,
  source: (r.source as string) ?? "",
  status: (r.status as Lead["status"]) ?? "new",
  temperature: (r.temperature as string) ?? "",
  score: Number(r.score) || 0,
  analysis: (r.analysis as Lead["analysis"]) ?? null,
  analysisState: (r.analysis_state as Lead["analysisState"]) ?? "none",
  notes: (r.notes as Lead["notes"]) ?? [],
  history: (r.history as Lead["history"]) ?? [],
  transcript: (r.transcript as Lead["transcript"]) ?? [],
  comment: (r.comment as string) ?? "",
  demo: !!r.demo,
  createdAt: ts(r.created_at),
});

const LEAD_COLS: Record<string, string> = { analysisState: "analysis_state", createdAt: "created_at" };
function leadToRow(p: Partial<Lead>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(p)) {
    if (k === "id") continue;
    out[LEAD_COLS[k] ?? k] = k === "createdAt" ? iso(v as number) : v;
  }
  return out;
}

const campaignFromRow = (r: Row): Campaign => ({
  id: r.id as string,
  platform: r.platform as string,
  campaign: r.campaign as string,
  period: (r.period as string) ?? "",
  spend: Number(r.spend) || 0,
  impressions: Number(r.impressions) || 0,
  clicks: Number(r.clicks) || 0,
  leads: Number(r.leads) || 0,
  sales: Number(r.sales) || 0,
  revenue: Number(r.revenue) || 0,
  demo: !!r.demo,
  createdAt: ts(r.created_at),
});

const PROFILE_COLS: Record<string, string> = { targetCpl: "target_cpl", trialEndsAt: "trial_ends_at", createdAt: "created_at", lastReport: "last_report" };

function authMessage(e: { message?: string; status?: number } | null) {
  const m = e?.message ?? "";
  if (/invalid login/i.test(m)) return "Неверная почта или пароль.";
  if (/already registered|already exists/i.test(m)) return "Аккаунт с такой почтой уже есть. Войдите.";
  if (/email not confirmed/i.test(m)) return "Подтвердите почту: мы отправили письмо со ссылкой.";
  if (/password/i.test(m)) return "Пароль слишком простой: минимум 8 символов.";
  if (/rate limit/i.test(m)) return "Слишком много попыток. Подождите минуту.";
  return m || "Не удалось выполнить вход. Попробуйте ещё раз.";
}

class SupabaseBackend implements Backend {
  mode = "supabase" as const;
  constructor(private sb: SupabaseClient) {}
  private async must<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>) {
    const { data, error } = await p;
    if (error) throw new Error(error.message);
    return data;
  }
  async currentUser() {
    const { data } = await this.sb.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email ?? "" } : null;
  }
  async signUp(email: string, password: string, meta: SignUpMeta) {
    const { data, error } = await this.sb.auth.signUp({
      email,
      password,
      options: { data: { company: meta.company, phone: meta.phone, plan: meta.plan ?? "trial" }, emailRedirectTo: `${location.origin}/cabinet` },
    });
    if (error) throw new AuthError(authMessage(error));
    return { needsConfirm: !data.session };
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new AuthError(authMessage(error));
  }
  async signOut() {
    await this.sb.auth.signOut();
  }
  async getProfile(user: User): Promise<Profile> {
    const r = (await this.must(this.sb.from("profiles").select("*").eq("id", user.id).maybeSingle())) as Row | null;
    if (!r) throw new Error("Профиль не найден. Проверьте, что выполнен supabase/schema.sql.");
    return {
      id: user.id,
      email: user.email,
      company: (r.company as string) ?? "",
      phone: (r.phone as string) ?? "",
      label: (r.label as string) ?? "",
      goal: (r.goal as string) ?? "",
      info: (r.info as string) ?? "",
      source: (r.source as string) ?? "Тест-бот",
      targetCpl: Number(r.target_cpl) || 3000,
      plan: (r.plan as string) ?? "trial",
      trialEndsAt: ts(r.trial_ends_at),
      createdAt: ts(r.created_at),
      seeded: !!r.seeded,
      lastReport: (r.last_report as Profile["lastReport"]) ?? null,
    };
  }
  async updateProfile(user: User, patch: Partial<Profile>) {
    const row: Row = {};
    for (const [k, v] of Object.entries(patch)) {
      if (k === "id" || k === "email" || k === "plan" || k === "trialEndsAt" || k === "createdAt") continue;
      row[PROFILE_COLS[k] ?? k] = v;
    }
    await this.must(this.sb.from("profiles").update(row).eq("id", user.id));
  }
  async listLeads() {
    const rows = (await this.must(this.sb.from("leads").select("*").order("created_at", { ascending: false }).limit(500))) as Row[];
    return rows.map(leadFromRow);
  }
  async createLead(l: Omit<Lead, "id">) {
    const r = (await this.must(this.sb.from("leads").insert(leadToRow(l)).select().single())) as Row;
    return leadFromRow(r);
  }
  async updateLead(id: string, patch: Partial<Lead>) {
    await this.must(this.sb.from("leads").update(leadToRow(patch)).eq("id", id));
  }
  async deleteLead(id: string) {
    await this.must(this.sb.from("leads").delete().eq("id", id));
  }
  async getPrices() {
    const rows = (await this.must(this.sb.from("price_items").select("*").order("position"))) as Row[];
    return rows.map((r) => ({ cat: (r.cat as string) ?? "", name: r.name as string, price: (r.price as string) ?? "", note: (r.note as string) ?? "" }));
  }
  async savePrices(items: PriceItem[]) {
    const user = await this.currentUser();
    if (!user) throw new Error("Сессия истекла. Войдите снова.");
    await this.must(this.sb.from("price_items").delete().eq("user_id", user.id));
    if (items.length) await this.must(this.sb.from("price_items").insert(items.map((p, i) => ({ ...p, position: i }))));
  }
  async listCampaigns() {
    const rows = (await this.must(this.sb.from("campaigns").select("*").order("spend", { ascending: false }))) as Row[];
    return rows.map(campaignFromRow);
  }
  async addCampaigns(items: Omit<Campaign, "id">[]) {
    const rows = (await this.must(
      this.sb.from("campaigns").insert(items.map(({ createdAt, ...c }) => ({ ...c, created_at: iso(createdAt) }))).select(),
    )) as Row[];
    return rows.map(campaignFromRow);
  }
  async deleteCampaign(id: string) {
    await this.must(this.sb.from("campaigns").delete().eq("id", id));
  }
  async getKV<T>(key: string, fallback: T) {
    const r = (await this.must(this.sb.from("settings").select("value").eq("key", key).maybeSingle())) as Row | null;
    return (r?.value as T) ?? fallback;
  }
  async setKV(key: string, value: unknown) {
    await this.must(this.sb.from("settings").upsert({ key, value, updated_at: iso() }, { onConflict: "user_id,key" }));
  }
}

let backend: Backend | null = null;
export function getBackend(): Backend {
  if (backend) return backend;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  backend = url && key ? new SupabaseBackend(createBrowserClient(url, key)) : new LocalBackend();
  return backend;
}
