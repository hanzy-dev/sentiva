-- create_core_tables

-- files
create table if not exists public.files (
    id uuid primary key default gen_random_uuid (),
    owner_id uuid not null references auth.users (id) on delete cascade,
    bucket text not null default 'vault',
    object_path text not null,
    original_name text not null,
    mime_type text not null,
    size_bytes bigint not null check (size_bytes >= 0),
    checksum_sha256 text null,
    deleted_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint files_owner_object_unique unique (owner_id, object_path)
);

create index if not exists files_owner_id_idx on public.files (owner_id);

create index if not exists files_deleted_at_idx on public.files (deleted_at);

create index if not exists files_created_at_idx on public.files (created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_files_updated_at on public.files;

create trigger trg_files_updated_at
before update on public.files
for each row execute function public.set_updated_at();

alter table public.files enable row level security;

drop policy if exists "files_select_own" on public.files;

create policy "files_select_own" on public.files for
select to authenticated using (owner_id = auth.uid ());

drop policy if exists "files_insert_own" on public.files;

create policy "files_insert_own" on public.files for
insert
    to authenticated
with
    check (owner_id = auth.uid ());

drop policy if exists "files_update_own" on public.files;

create policy "files_update_own" on public.files for
update to authenticated using (owner_id = auth.uid ())
with
    check (owner_id = auth.uid ());

drop policy if exists "files_delete_own" on public.files;

create policy "files_delete_own" on public.files for delete to authenticated using (owner_id = auth.uid ());

-- share_links
create table if not exists public.share_links (
    id uuid primary key default gen_random_uuid (),
    file_id uuid not null references public.files (id) on delete cascade,
    token_hash text not null,
    expires_at timestamptz not null,
    max_views int not null default 1 check (max_views >= 1),
    views_used int not null default 0 check (views_used >= 0),
    revoked_at timestamptz null,
    created_at timestamptz not null default now()
);

create unique index if not exists share_links_token_hash_uidx on public.share_links (token_hash);

create index if not exists share_links_file_id_idx on public.share_links (file_id);

create index if not exists share_links_expires_at_idx on public.share_links (expires_at);

alter table public.share_links enable row level security;

drop policy if exists "share_links_select_owner" on public.share_links;

create policy "share_links_select_owner" on public.share_links for
select to authenticated using (
        exists (
            select 1
            from public.files f
            where
                f.id = share_links.file_id
                and f.owner_id = auth.uid ()
        )
    );

drop policy if exists "share_links_insert_owner" on public.share_links;

create policy "share_links_insert_owner" on public.share_links for
insert
    to authenticated
with
    check (
        exists (
            select 1
            from public.files f
            where
                f.id = share_links.file_id
                and f.owner_id = auth.uid ()
                and f.deleted_at is null
        )
    );

drop policy if exists "share_links_update_owner" on public.share_links;

create policy "share_links_update_owner" on public.share_links for
update to authenticated using (
    exists (
        select 1
        from public.files f
        where
            f.id = share_links.file_id
            and f.owner_id = auth.uid ()
    )
)
with
    check (
        exists (
            select 1
            from public.files f
            where
                f.id = share_links.file_id
                and f.owner_id = auth.uid ()
        )
    );

drop policy if exists "share_links_delete_owner" on public.share_links;

create policy "share_links_delete_owner" on public.share_links for delete to authenticated using (
    exists (
        select 1
        from public.files f
        where
            f.id = share_links.file_id
            and f.owner_id = auth.uid ()
    )
);

-- audit_logs
do $$
begin
  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type public.audit_action as enum (
      'UPLOAD','DOWNLOAD','RENAME','DELETE','RESTORE','SHARE_CREATE','SHARE_REVOKE','SHARE_CONSUME'
    );

end if;

end $$;


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

drop policy if exists "audit_logs_select_own" on public.audit_logs;

create policy "audit_logs_select_own" on public.audit_logs for
select to authenticated using (actor_id = auth.uid ());

drop policy if exists "audit_logs_insert_own" on public.audit_logs;

create policy "audit_logs_insert_own" on public.audit_logs for
insert
    to authenticated
with
    check (actor_id = auth.uid ());