-- Omokage: Past entries and Future items (Present reuses pulse_events / pulse_days).
create table if not exists public.omokage_items (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id         text not null,
  kind       text not null check (kind in ('past','future')),
  day        date not null,
  at         timestamptz not null default now(),
  board      text,
  title      text,
  body       text not null default '',
  meta       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists omokage_items_user_kind_day_idx on public.omokage_items (user_id, kind, day);
alter table public.omokage_items enable row level security;
revoke all on public.omokage_items from anon;
grant select, insert, update, delete on public.omokage_items to authenticated;
drop policy if exists "own rows" on public.omokage_items;
create policy "own rows" on public.omokage_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists omokage_items_touch on public.omokage_items;
create trigger omokage_items_touch before update on public.omokage_items
  for each row execute function public.pulse_touch();
