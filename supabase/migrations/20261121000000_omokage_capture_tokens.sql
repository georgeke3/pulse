-- Personal capture tokens for the iOS Shortcut (omokage-capture edge function). Only the SHA-256 hash is stored.
create table if not exists public.omokage_capture_tokens (
  token_hash text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  label      text,
  created_at timestamptz not null default now()
);
alter table public.omokage_capture_tokens enable row level security;
revoke all on public.omokage_capture_tokens from anon, authenticated;
-- no policies: only the service role (edge function) can read it
