-- Aura ID: Optional Supabase Cloud Registry Schema
-- Run this in your Supabase SQL Editor if you want to persist minted Agent IDs in a shared cloud database.

create table if not exists public.aura_agents (
  agent_id text primary key,
  name text not null,
  owner_domain text not null,
  role text not null default 'buyer',
  model text not null default 'Claude 3.5 / GPT-4o',
  capabilities jsonb not null default '[]'::jsonb,
  trust_tier text not null default 'verified',
  trust_score integer not null default 98,
  spend_limit text not null default '$150 / session',
  public_key text not null,
  agent_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.aura_agents enable row level security;

create policy "Anyone can read public Aura Agent IDs"
  on public.aura_agents for select
  using (true);

create policy "Anyone can mint a new Aura Agent ID"
  on public.aura_agents for insert
  with check (true);
