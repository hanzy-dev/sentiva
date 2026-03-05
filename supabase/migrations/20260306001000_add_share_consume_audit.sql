-- add_share_consume_audit_with_request_id
-- Adds audit log insert to consume_share_link RPC when consumption succeeds.
-- Also accepts p_request_id so app correlation id can be stored.

create or replace function public.consume_share_link(
  p_token_hash text,
  p_request_id text
)
returns table (
  file_id uuid,
  bucket text,
  object_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share_link_id uuid;
  v_owner_id uuid;
  v_file_id uuid;
  v_bucket text;
  v_object_path text;
  v_views_used int;
begin
  -- Atomic consume: update only when valid
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
    returning sl.id as share_link_id,
              f.owner_id as owner_id,
              f.id as file_id,
              f.bucket as bucket,
              f.object_path as object_path,
              sl.views_used as views_used_after
  )
  select
    updated.share_link_id,
    updated.owner_id,
    updated.file_id,
    updated.bucket,
    updated.object_path,
    updated.views_used_after
  into
    v_share_link_id,
    v_owner_id,
    v_file_id,
    v_bucket,
    v_object_path,
    v_views_used;

  -- If nothing updated, return empty
  if v_file_id is null then
    return;
  end if;

  -- Best-effort audit log
  begin
    insert into public.audit_logs(actor_id, action, target_type, target_id, request_id, metadata_json)
    values (
      v_owner_id,
      'SHARE_CONSUME',
      'FILE',
      v_file_id,
      p_request_id,
      jsonb_build_object(
        'share_link_id', v_share_link_id,
        'views_used', v_views_used
      )
    );
  exception when others then
    null;
  end;

  -- Return for signed URL generation
  file_id := v_file_id;
  bucket := v_bucket;
  object_path := v_object_path;
  return next;
end;
$$;

revoke all on function public.consume_share_link (text, text)
from public;

grant
execute on function public.consume_share_link (text, text) to anon;

grant
execute on function public.consume_share_link (text, text) to authenticated;