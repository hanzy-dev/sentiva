-- init_share_links

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

-- RLS
alter table public.share_links enable row level security;

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

create policy "share_links_delete_owner" on public.share_links for delete to authenticated using (
    exists (
        select 1
        from public.files f
        where
            f.id = share_links.file_id
            and f.owner_id = auth.uid ()
    )
);