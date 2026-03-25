-- ═══ SkyWay Database Schema ═══
-- Run this in Supabase SQL Editor to set up your tables.
-- Requires Supabase Auth to be enabled (it is by default).

-- ── Saved Flights ──
-- Users can save/track specific flights by callsign
create table if not exists saved_flights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  callsign text not null,
  flight_number text not null,
  airline_code text,
  airline_name text,
  origin_code text,
  destination_code text,
  aircraft_type text,
  registration text,
  created_at timestamptz default now() not null,

  -- Prevent duplicate saves
  unique(user_id, callsign)
);

-- ── Alert History ──
-- Persistent log of all flight alerts for a user
create table if not exists alert_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  flight_id text not null,
  flight_number text not null,
  airline_code text,
  airline_color text,
  origin_code text,
  destination_code text,
  alert_type text not null,
  title text not null,
  subtitle text,
  severity text not null default 'info',
  read boolean default false,
  created_at timestamptz default now() not null
);

-- ── Row Level Security ──
-- Users can only see/modify their own data

alter table saved_flights enable row level security;
alter table alert_history enable row level security;

-- Saved flights policies
create policy "Users can view own saved flights"
  on saved_flights for select
  using (auth.uid() = user_id);

create policy "Users can insert own saved flights"
  on saved_flights for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own saved flights"
  on saved_flights for delete
  using (auth.uid() = user_id);

-- Alert history policies
create policy "Users can view own alert history"
  on alert_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own alert history"
  on alert_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own alert history"
  on alert_history for update
  using (auth.uid() = user_id);

-- ── Indexes ──
create index if not exists idx_saved_flights_user on saved_flights(user_id);
create index if not exists idx_alert_history_user on alert_history(user_id, created_at desc);
create index if not exists idx_alert_history_flight on alert_history(user_id, flight_id);
