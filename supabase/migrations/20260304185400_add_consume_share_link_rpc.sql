-- add_consume_share_link_rpc

create or replace function public.consume_share_link(p_token_hash text)
returns table (
  file_id uuid,
  bucket text,
  object_path text
)
language plpgsql
security definer
as $$
begin
  return query
  with updated as (
    update public.share_links sl
    set views_used = sl.views_used + 1
    from public.files f
    where sl.file_id = f.id
      and sl.token_hash = p_token_hash
      and sl.revoked_at is null
      and sl.expires_at > now()
      and sl.views_used < sl.max_views
      and f.deleted_at is null
    returning f.id as file_id, f.bucket, f.object_path
  )
  select * from updated;
end;
$$;

-- Allow anonymous access to execute (public share link)
revoke all on function public.consume_share_link (text) from public;

grant execute on function public.consume_share_link (text) to anon;

grant
execute on function public.consume_share_link (text) to authenticated;