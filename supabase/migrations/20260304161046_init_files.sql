-- init_files

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

-- updated_at trigger
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

-- RLS
alter table public.files enable row level security;

create policy "files_select_own" on public.files for
select to authenticated using (owner_id = auth.uid ());

create policy "files_insert_own" on public.files for
insert
    to authenticated
with
    check (owner_id = auth.uid ());

create policy "files_update_own" on public.files for
update to authenticated using (owner_id = auth.uid ())
with
    check (owner_id = auth.uid ());

create policy "files_delete_own" on public.files for delete to authenticated using (owner_id = auth.uid ());