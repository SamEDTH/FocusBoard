-- Run this once in Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists boards (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  data       jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security — each user can only touch their own row
alter table boards enable row level security;

create policy "select own board" on boards for select using (auth.uid() = user_id);
create policy "insert own board" on boards for insert with check (auth.uid() = user_id);
create policy "update own board" on boards for update using (auth.uid() = user_id);
create policy "delete own board" on boards for delete using (auth.uid() = user_id);
