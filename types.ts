import type { ChatTurn, LeadCard } from "@/lib/niches";

export const TRIAL_DAYS = 14;

export type LeadStatus = "new" | "booked" | "confirmed" | "came" | "won" | "lost";
export const STATUSES: { id: LeadStatus; label: string; tone: string }[] = [
  { id: "new", label: "Новый", tone: "" },
  { id: "booked", label: "Записан", tone: "acc" },
  { id: "confirmed", label: "Подтверждён", tone: "acc" },
  { id: "came", label: "Пришёл", tone: "soon" },
  { id: "won", label: "Оплатил", tone: "on" },
  { id: "lost", label: "Отказ", tone: "hot" },
];
export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<LeadStatus, (typeof STATUSES)[number]>;
export const BOOKED_STATUSES: LeadStatus[] = ["booked", "confirmed", "came", "won"];

export const SOURCES = ["Instagram / Facebook таргет", "TikTok таргет", "Google Ads", "2GIS", "WhatsApp напрямую", "Сайт", "Тест-бот"];
export const PLATFORMS = ["Meta (Instagram/Facebook)", "TikTok", "Google Ads", "2GIS", "Яндекс Директ", "VK Реклама", "Другое"];

export type Note = { at: number; text: string };

export type Lead = {
  id: string;
  name: string;
  phone: string;
  service: string;
  datetime: string;
  price: string;
  amount: number;
  source: string;
  status: LeadStatus;
  temperature: string;
  score: number;
  analysis: LeadCard | null;
  analysisState: "none" | "pending" | "done" | "error";
  notes: Note[];
  history: Note[];
  transcript: ChatTurn[];
  comment: string;
  demo: boolean;
  createdAt: number;
};

export type PriceItem = { cat: string; name: string; price: string; note: string };

export type Campaign = {
  id: string;
  platform: string;
  campaign: string;
  period: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  sales: number;
  revenue: number;
  demo: boolean;
  createdAt: number;
};

export type AdReport = {
  createdAt: number;
  scope: string;
  spend: number;
  summary: string;
  verdict: { campaign: string; action: string; why: string }[];
  budget: string;
  creatives: string[];
  funnel: string;
  plan: string[];
};

export type Profile = {
  id: string;
  email: string;
  company: string;
  phone: string;
  label: string;
  goal: string;
  info: string;
  source: string;
  targetCpl: number;
  plan: string;
  trialEndsAt: number;
  createdAt: number;
  seeded: boolean;
  lastReport: AdReport | null;
};

export const daysLeft = (p: Profile) => Math.max(0, Math.ceil((p.trialEndsAt - Date.now()) / 86_400_000));

export const newLead = (over: Partial<Lead>): Omit<Lead, "id"> => ({
  name: "Без имени",
  phone: "",
  service: "",
  datetime: "",
  price: "",
  amount: 0,
  source: "Тест-бот",
  status: "new",
  temperature: "",
  score: 0,
  analysis: null,
  analysisState: "none",
  notes: [],
  history: [],
  transcript: [],
  comment: "",
  demo: false,
  createdAt: Date.now(),
  ...over,
});
