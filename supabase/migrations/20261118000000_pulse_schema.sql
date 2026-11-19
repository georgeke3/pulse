-- Pulse: per-user cloud storage (replaces browser localStorage).
-- Every table is private to the signed-in user via row-level security.
-- Applied to the Supabase project "georgeke-general". Tables are prefixed pulse_ so the
-- project can be shared with other apps.

create table if not exists public.pulse_events (
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id                  text not null,
  day                 date not null,
  ord                 integer not null default 0,           -- position within the day
  type                text not null check (type in ('training', 'recovery', 'win')),
  category            text not null,
  intensity           numeric not null default 0,           -- subjective (0-4, halves allowed)
  objective_intensity numeric not null default 0,           -- objective (0-10)
  duration            text,
  custom_data         jsonb not null default '{}'::jsonb,   -- e.g. meditation_seconds, morning_routine
  notes               text,
  is_expected         boolean,
  streak_category     text,
  updated_at          timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists pulse_events_user_day_idx on public.pulse_events (user_id, day);

create table if not exists public.pulse_days (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day        date not null,
  answers    jsonb not null default '{}'::jsonb,            -- daily questions: { driver: 3, ... }
  note       text,
  motto      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.pulse_reports (
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id            text not null,
  reported_at   text not null,                              -- original ISO timestamp, kept verbatim
  content       text not null,
  data_snapshot jsonb,
  mode          text,
  feedback      text,
  truth_utility text,
  updated_at    timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.pulse_settings (
  user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  mottos           text[] not null default '{}',
  streak_categories text[] not null default '{}',
  system_prompt    text not null default '',
  updated_at       timestamptz not null default now()
);

create or replace function public.pulse_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['pulse_events', 'pulse_days', 'pulse_reports', 'pulse_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.pulse_touch()', t || '_touch', t);
  end loop;
end;
$$;
