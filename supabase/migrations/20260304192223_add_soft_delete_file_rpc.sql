-- add_soft_delete_file_rpc

create or replace function public.soft_delete_file(p_file_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- only owner can delete
  update public.files
  set deleted_at = now()
  where id = p_file_id
    and owner_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'not_found';
  end if;

  -- revoke all links for this file
  update public.share_links
  set revoked_at = now()
  where file_id = p_file_id
    and revoked_at is null;

  -- audit log
  insert into public.audit_logs(actor_id, action, target_type, target_id, request_id, metadata_json)
  values (auth.uid(), 'DELETE', 'FILE', p_file_id, null, '{}'::jsonb);
end;
$$;

revoke all on function public.soft_delete_file (uuid) from public;

grant
execute on function public.soft_delete_file (uuid) to authenticated;