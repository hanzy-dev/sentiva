-- update_consume_share_link_rpc: add p_request_id + audit in same transaction

create or replace function public.consume_share_link(p_token_hash text, p_request_id text)
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
    returning sl.file_id as file_id, sl.id as share_link_id
  ),
  resolved as (
    select u.file_id, u.share_link_id, f.bucket, f.object_path, f.owner_id
    from updated u
    join public.files f on f.id = u.file_id
  ),
  audited as (
    insert into public.audit_logs (actor_id, action, target_type, target_id, request_id, metadata_json)
    select
      r.owner_id,                       -- owner as actor (safer than NULL)
      'SHARE_CONSUME',
      'SHARE_LINK',
      r.share_link_id,
      p_request_id,
      jsonb_build_object('file_id', r.file_id)
    from resolved r
    returning 1
  )
  select r.file_id, r.bucket, r.object_path
  from resolved r;
end;
$$;

-- Allow anonymous access to execute (public share link)
revoke all on function public.consume_share_link (text, text)
from public;

grant
execute on function public.consume_share_link (text, text) to anon;

grant
execute on function public.consume_share_link (text, text) to authenticated;