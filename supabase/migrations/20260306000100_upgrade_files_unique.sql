-- upgrade_files_unique

do $$
begin
  -- safety check: pastikan tidak ada duplikat untuk unique baru
  if exists (
    select 1
    from public.files
    group by owner_id, bucket, object_path
    having count(*) > 1
  ) then
    raise exception 'Duplicate (owner_id, bucket, object_path) found in public.files';
  end if;

  -- drop old unique constraint (kalau ada)
  if exists (
    select 1
    from pg_constraint
    where conname = 'files_owner_object_unique'
  ) then
    alter table public.files
      drop constraint files_owner_object_unique;
  end if;

  -- add new unique constraint (kalau belum ada)
  if not exists (
    select 1
    from pg_constraint
    where conname = 'files_owner_bucket_object_unique'
  ) then
    alter table public.files
      add constraint files_owner_bucket_object_unique
      unique (owner_id, bucket, object_path);
  end if;
end $$;