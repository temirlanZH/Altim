-- Схема кабинета ALTIM для Supabase.
-- Выполните целиком в Supabase → SQL Editor → New query → Run.
-- Каждый пользователь видит и меняет только свои данные (Row Level Security).

-- Профиль компании и тестовый период
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  company text default '',
  phone text default '',
  label text default '',
  goal text default '',
  info text default '',
  source text default 'Тест-бот',
  target_cpl numeric default 3000,
  plan text not null default 'trial',
  trial_ends_at timestamptz not null default now() + interval '14 days',
  seeded boolean not null default false,
  last_report jsonb,
  created_at timestamptz not null default now()
);

-- Лиды CRM
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text default '',
  phone text default '',
  service text default '',
  datetime text default '',
  price text default '',
  amount numeric default 0,
  source text default '',
  status text not null default 'new' check (status in ('new','booked','confirmed','came','won','lost')),
  temperature text default '',
  score int default 0,
  analysis jsonb,
  analysis_state text default 'none',
  notes jsonb not null default '[]',
  history jsonb not null default '[]',
  transcript jsonb not null default '[]',
  comment text default '',
  demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists leads_user_created on public.leads (user_id, created_at desc);

-- Прайс-лист
create table if not exists public.price_items (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position int not null default 0,
  cat text default '',
  name text not null,
  price text default '',
  note text default ''
);
create index if not exists price_items_user on public.price_items (user_id, position);

-- Рекламные кампании
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform text not null,
  campaign text not null,
  period text default '',
  spend numeric default 0,
  impressions numeric default 0,
  clicks numeric default 0,
  leads numeric default 0,
  sales numeric default 0,
  revenue numeric default 0,
  demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists campaigns_user on public.campaigns (user_id);

-- Доступ только к своим строкам
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.price_items enable row level security;
alter table public.campaigns enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid());
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own leads" on public.leads;
create policy "own leads" on public.leads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own prices" on public.price_items;
create policy "own prices" on public.price_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own campaigns" on public.campaigns;
create policy "own campaigns" on public.campaigns for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Настройки кабинета: подключённые интеграции (Meta, amoCRM, Битрикс24, Google Таблицы) и дашборды.
-- В value интеграций лежат токены владельца кабинета; доступ только у него (RLS).
create table if not exists public.settings (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.settings enable row level security;
create policy "own settings" on public.settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Пользователь не может сам продлить тестовый период или сменить тариф:
-- обновлять разрешено только перечисленные колонки (тариф меняет сервер с service_role).
revoke update on public.profiles from authenticated, anon;
grant update (company, phone, label, goal, info, source, target_cpl, seeded, last_report) on public.profiles to authenticated;

-- Профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, company, phone)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'company', ''), coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
