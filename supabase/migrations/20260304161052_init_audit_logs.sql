-- init_audit_logs

do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type public.audit_action as enum (
      'UPLOAD',
      'DOWNLOAD',
      'RENAME',
      'DELETE',
      'RESTORE',
      'SHARE_CREATE',
      'SHARE_REVOKE',
      'SHARE_CONSUME'
    );
  end if;
end$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,

  action public.audit_action not null,
  target_type text not null,
  target_id uuid null,

  request_id text null,
  metadata_json jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at);
create index if not exists audit_logs_action_idx on public.audit_logs (action);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_own"
on public.audit_logs
for select
to authenticated
using (actor_id = auth.uid());

create policy "audit_logs_insert_own"
on public.audit_logs
for insert
to authenticated
with check (actor_id = auth.uid());