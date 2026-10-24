-- STEP-05: local-tested collection fencing and reviewed, atomic publication.
-- INVOKER functions confer no privilege; login provisioning remains separate.
begin;

create table internal.ingestion_scopes (
  scope_key text primary key check (scope_key ~ '^[0-9a-f]{64}$'),
  source_id text not null references internal.source_registry on delete restrict,
  operation text not null check (btrim(operation) <> ''),
  qualification_id uuid not null references public.qualifications on delete restrict,
  year integer not null check (year between 1900 and 2200),
  acquisition_track text not null check (btrim(acquisition_track) <> ''),
  dataset_type text not null check (dataset_type in ('qualifications','events','statistics','details')),
  active_run_id uuid references internal.sync_runs on delete restrict,
  lease_until timestamptz,
  unique(source_id,operation,qualification_id,year,acquisition_track,dataset_type)
);
create table internal.source_daily_budgets (
  source_id text not null references internal.source_registry on delete restrict,
  seoul_date date not null,
  calls_reserved integer not null default 0 check (calls_reserved >= 0),
  primary key(source_id,seoul_date)
);
create table internal.published_record_owners (
  source_id text not null references internal.source_registry on delete restrict,
  entity_type text not null check (entity_type in ('qualification','event','statistic','detail')),
  logical_key text not null,
  scope_key text not null references internal.ingestion_scopes on delete restrict,
  public_id uuid not null,
  primary key(source_id,entity_type,logical_key),
  unique(entity_type,public_id)
);
alter table internal.sync_runs add column collection_complete boolean not null default false;
alter table internal.sync_runs add column payload_revision_hash text check (payload_revision_hash ~ '^[0-9a-f]{64}$');
alter table internal.sync_runs add column reserved_calls integer not null default 0 check (reserved_calls >= 0);
alter table internal.staged_records add column source_code text;
alter table internal.staged_records add column source_name text;
alter table internal.staged_records add column source_grade text;
alter table internal.review_items add column run_id uuid references internal.sync_runs on delete restrict;
create unique index reviews_ingestion_run_idx on internal.review_items(run_id) where run_id is not null;

do $$ declare t text; begin
  foreach t in array array['ingestion_scopes','source_daily_budgets'] loop
    execute format('alter table internal.%I enable row level security',t);
    execute format('revoke all on internal.%I from public,anon,authenticated,service_role',t);
    execute format('grant select,insert,update on internal.%I to qi_ingestion,qi_admin_server',t);
    execute format('create policy collector_access on internal.%I for all to qi_ingestion,qi_admin_server using(true) with check(true)',t);
  end loop;
end $$;
alter table internal.published_record_owners enable row level security;
revoke all on internal.published_record_owners from public,anon,authenticated,service_role,qi_ingestion;
grant select,insert on internal.published_record_owners to qi_admin_server;
create policy server_ownership on internal.published_record_owners for all to qi_admin_server using(true) with check(true);
grant update on internal.sync_runs to qi_admin_server;
create policy server_run_update on internal.sync_runs for update to qi_admin_server using(true) with check(true);
revoke update on internal.staged_records from qi_ingestion;
-- The collector can validate only this non-sensitive identity projection.
grant select(id,acquisition_track) on public.qualifications to qi_ingestion;
create policy collector_identity_read on public.qualifications for select to qi_ingestion using(true);
-- A collector does not gain access to public rows or to review/role mutation.

create function internal.ingestion_scope_key(p_scope jsonb) returns text
language sql immutable security invoker set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_object(
   'source_id',p_scope->>'source_id','operation',p_scope->>'operation',
   'qualification_id',p_scope->>'qualification_id','year',(p_scope->>'year')::integer,
   'acquisition_track',p_scope->>'acquisition_track','dataset_type',p_scope->>'dataset_type')::text,'UTF8')),'hex')
$$;

create function internal.start_ingestion(p_scope jsonb,p_lease_seconds integer default 120)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare k text; s internal.ingestion_scopes; run_id uuid:=gen_random_uuid();
begin
  if p_lease_seconds not between 1 and 3600 or jsonb_typeof(p_scope)<>'object' then
    raise exception using message='INVALID_SCOPE';
  end if;
  if not exists(select 1 from internal.source_registry where source_id=p_scope->>'source_id'
      and approval_state='approved' and daily_quota>0) then
    raise exception using message='SOURCE_NOT_APPROVED';
  end if;
  if not exists(select 1 from public.qualifications where id=(p_scope->>'qualification_id')::uuid
      and acquisition_track=p_scope->>'acquisition_track') then
    raise exception using message='INVALID_SCOPE';
  end if;
  k:=internal.ingestion_scope_key(p_scope);
  insert into internal.ingestion_scopes(scope_key,source_id,operation,qualification_id,year,acquisition_track,dataset_type)
    values(k,p_scope->>'source_id',p_scope->>'operation',(p_scope->>'qualification_id')::uuid,
      (p_scope->>'year')::integer,p_scope->>'acquisition_track',p_scope->>'dataset_type')
    on conflict(scope_key) do nothing;
  select * into strict s from internal.ingestion_scopes where scope_key=k for update;
  if s.lease_until>clock_timestamp() then raise exception using message='SCOPE_BUSY'; end if;
  insert into internal.sync_runs(id,scope_key,status,lease_expires_at)
    values(run_id,k,'running',clock_timestamp()+make_interval(secs=>p_lease_seconds));
  update internal.ingestion_scopes set active_run_id=run_id,
    lease_until=clock_timestamp()+make_interval(secs=>p_lease_seconds) where scope_key=k;
  return jsonb_build_object('run_id',run_id,'scope_key',k);
end $$;

create function internal.reserve_ingestion_calls(p_run uuid,p_count integer default 1)
returns void language plpgsql security invoker set search_path='' as $$
declare s internal.ingestion_scopes; quota integer; day date:=(clock_timestamp() at time zone 'Asia/Seoul')::date; used integer;
begin
  if p_count not between 1 and 1000 then raise exception using message='INVALID_BUDGET'; end if;
  select sc.* into strict s from internal.ingestion_scopes sc join internal.sync_runs r on r.scope_key=sc.scope_key
    where r.id=p_run for update of sc;
  if s.active_run_id<>p_run or s.lease_until is null or s.lease_until<=clock_timestamp()
    or not exists(select 1 from internal.sync_runs where id=p_run and status='running') then
    raise exception using message='LEASE_LOST';
  end if;
  select daily_quota into quota from internal.source_registry where source_id=s.source_id and approval_state='approved';
  if quota is null or quota<=0 then raise exception using message='SOURCE_NOT_APPROVED'; end if;
  insert into internal.source_daily_budgets(source_id,seoul_date,calls_reserved) values(s.source_id,day,0)
    on conflict do nothing;
  update internal.source_daily_budgets set calls_reserved=calls_reserved+p_count
    where source_id=s.source_id and seoul_date=day and calls_reserved+p_count<=quota returning calls_reserved into used;
  if used is null then raise exception using message='BUDGET_EXHAUSTED'; end if;
  update internal.sync_runs set reserved_calls=reserved_calls+p_count where id=p_run;
end $$;

create function internal.assert_ingestion_record(p_scope internal.ingestion_scopes,p_record jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare n integer; mapped uuid; body jsonb:=p_record->'payload'; kind text:=p_record->>'entityType';
begin
  if jsonb_typeof(body)<>'object' or octet_length(body::text)>1048576
    or btrim(coalesce(p_record->>'logicalKey',''))='' or btrim(coalesce(p_record->>'sourceCode',''))=''
    or body ?| array['publication_state','verification','reviewed_at','revision_hash','calculated_rate']
    or body->>'source_id' is distinct from p_scope.source_id
    or body->>'qualification_id' is distinct from p_scope.qualification_id::text
    or (body ? 'year' and (body->>'year')::integer<>p_scope.year)
    or (body ? 'acquisition_track' and body->>'acquisition_track'<>p_scope.acquisition_track)
    or (case kind when 'qualification' then 'qualifications' when 'event' then 'events'
      when 'statistic' then 'statistics' when 'detail' then 'details' else '' end)<>p_scope.dataset_type then
    raise exception using message='INVALID_RECORD';
  end if;
  select count(*),min(qualification_id::text)::uuid into n,mapped from internal.source_crosswalks
   where source_id=p_scope.source_id and source_code=p_record->>'sourceCode'
     and source_name=p_record->>'sourceName' and source_grade=p_record->>'sourceGrade'
     and reviewed_at is not null and reviewed_by is not null
     and (valid_from is null or valid_from<=make_date(p_scope.year,1,1))
     and (valid_to is null or valid_to>=make_date(p_scope.year,12,31));
  if n<>1 or mapped<>p_scope.qualification_id then raise exception using message='MAPPING_AMBIGUOUS'; end if;
  if kind='qualification' and body->>'source_code' is distinct from p_record->>'sourceCode' then
    raise exception using message='INVALID_RECORD';
  end if;
  if kind='event' and body->>'logical_key' is distinct from p_record->>'logicalKey' then
    raise exception using message='INVALID_RECORD';
  end if;
end $$;

create function internal.stage_ingestion(p_run uuid,p_records jsonb,p_snapshots jsonb,p_calls integer,p_pages integer)
returns text language plpgsql security invoker set search_path='' as $$
declare s internal.ingestion_scopes; r internal.sync_runs; item jsonb; h text; prior text; content jsonb; rev text;
  quarantined_count integer:=0; valid_record boolean;
begin
  select sc.* into strict s from internal.ingestion_scopes sc join internal.sync_runs rr on rr.scope_key=sc.scope_key
    where rr.id=p_run for update of sc;
  select * into strict r from internal.sync_runs where id=p_run for update;
  if s.active_run_id<>p_run or s.lease_until is null or s.lease_until<=clock_timestamp() or r.status<>'running' then
    raise exception using message='LEASE_LOST';
  end if;
  if not exists(select 1 from internal.source_registry where source_id=s.source_id and approval_state='approved' and daily_quota>0) then
    raise exception using message='SOURCE_NOT_APPROVED';
  end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_typeof(p_snapshots)<>'array'
    or jsonb_array_length(p_records)>20000 or jsonb_array_length(p_snapshots)>100
    or p_calls<0 or p_pages<1 or p_pages>p_calls or p_calls>r.reserved_calls
    or jsonb_array_length(p_snapshots)<p_pages then
    raise exception using message='INVALID_COLLECTION';
  end if;
  for item in select value from jsonb_array_elements(p_records) loop
    valid_record:=true;
    begin
      perform internal.assert_ingestion_record(s,item);
    exception when raise_exception then
      if sqlerrm<>'MAPPING_AMBIGUOUS' then raise; end if;
      valid_record:=false;
      quarantined_count:=quarantined_count+1;
    end;
    content:=jsonb_build_object('payload',(item->'payload')-array['fetched_at','validated_at'],
      'sourceCode',item->>'sourceCode','sourceName',item->>'sourceName','sourceGrade',item->>'sourceGrade');
    h:=encode(sha256(convert_to(content::text,'UTF8')),'hex');
    select payload_hash into prior from internal.staged_records where run_id=p_run and entity_type=item->>'entityType' and logical_key=item->>'logicalKey';
    if found then
      if prior<>h then raise exception using message='DUPLICATE_RECORD'; end if;
      continue;
    end if;
    insert into internal.staged_records(run_id,entity_type,logical_key,normalized_payload,payload_hash,validation_result,source_code,source_name,source_grade)
      values(p_run,item->>'entityType',item->>'logicalKey',item->'payload',h,
        jsonb_build_object('validated',valid_record,'code',case when not valid_record then 'MAPPING_AMBIGUOUS' end),
        item->>'sourceCode',item->>'sourceName',item->>'sourceGrade');
  end loop;
  select count(*) into quarantined_count from internal.staged_records where run_id=p_run
    and validation_result->>'validated'='false';
  for item in select value from jsonb_array_elements(p_snapshots) loop
    if octet_length(item::text)>1048576 then raise exception using message='INVALID_SNAPSHOT'; end if;
    h:=encode(sha256(convert_to(item::text,'UTF8')),'hex');
    insert into internal.source_snapshots(run_id,source_id,scope_key,sanitized_payload,payload_hash,fetched_at,parse_version)
      values(p_run,s.source_id,s.scope_key,item,h,clock_timestamp(),'generic-contract-v1') on conflict do nothing;
  end loop;
  select encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(entity_type,logical_key,payload_hash)
    order by entity_type,logical_key),'[]'::jsonb)::text,'UTF8')),'hex') into rev from internal.staged_records where run_id=p_run;
  update internal.sync_runs set collection_complete=true,payload_revision_hash=rev,calls=p_calls,pages=p_pages,
    records=(select count(*) from internal.staged_records where run_id=p_run),
    status=case when jsonb_array_length(p_records)=0 or quarantined_count>0 then 'quarantined' else 'staged' end,
    quarantined=quarantined_count,
    safe_error_code=case when quarantined_count>0 then 'MAPPING_AMBIGUOUS' when jsonb_array_length(p_records)=0 then 'EMPTY_UNCONFIRMED' end,
    ended_at=clock_timestamp(),lease_expires_at=null where id=p_run;
  update internal.ingestion_scopes set lease_until=null where scope_key=s.scope_key;
  return case when quarantined_count>0 then 'quarantined' when jsonb_array_length(p_records)=0 then 'empty' else 'staged' end;
end $$;

create function internal.fail_ingestion(p_run uuid,p_safe_code text,p_attempted_calls integer default null) returns void
language plpgsql security invoker set search_path='' as $$
declare k text;
begin
  if p_safe_code !~ '^[A-Z0-9_]{1,64}$' then raise exception using message='INVALID_ERROR_CODE'; end if;
  select scope_key into strict k from internal.sync_runs where id=p_run;
  perform 1 from internal.ingestion_scopes where scope_key=k for update;
  update internal.sync_runs set status='failed',safe_error_code=p_safe_code,
    calls=least(reserved_calls,greatest(0,coalesce(p_attempted_calls,reserved_calls))),
    ended_at=clock_timestamp(),lease_expires_at=null
    where id=p_run and status='running';
  update internal.ingestion_scopes set lease_until=null where scope_key=k and active_run_id=p_run;
end $$;

create function internal.prepare_ingestion_review(p_run uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s internal.ingestion_scopes; r internal.sync_runs; old_rev text; review_id uuid;
begin
  select sc.* into strict s from internal.ingestion_scopes sc join internal.sync_runs rr on rr.scope_key=sc.scope_key
    where rr.id=p_run for update of sc;
  select * into strict r from internal.sync_runs where id=p_run for update;
  if s.active_run_id<>p_run or not r.collection_complete or r.status<>'staged' or r.records=0 then
    raise exception using message='RUN_NOT_READY';
  end if;
  -- Override activation/expiry reconciliation requires an explicit reviewed
  -- workflow. Never silently ignore an existing override, including expired ones.
  if exists(select 1 from internal.overrides o where o.target_key in (s.scope_key,s.qualification_id::text)
    or exists(select 1 from internal.staged_records sr where sr.run_id=p_run and o.target_key in
      (sr.logical_key,sr.entity_type||':'||sr.logical_key,s.source_id||':'||sr.entity_type||':'||sr.logical_key))) then
    raise exception using message='OVERRIDE_REVIEW_REQUIRED';
  end if;
  select published_revision_hash into old_rev from public.dataset_status where scope_key=s.scope_key for update;
  update internal.review_items set state='superseded',optimistic_version=optimistic_version+1
    where target_key=s.scope_key and run_id is not null and run_id<>p_run and state in ('pending','approved');
  if old_rev=r.payload_revision_hash then
    update public.dataset_status set last_fetch_at=r.ended_at,last_validated_at=clock_timestamp(),freshness='fresh',
      pending_change=false,public_notice=null where scope_key=s.scope_key;
    update internal.sync_runs set status='published' where id=p_run;
    return jsonb_build_object('state','unchanged','revision_hash',old_rev,'expected_revision',old_rev);
  end if;
  insert into internal.review_items(kind,target_key,old_hash,new_hash,diff,evidence_url,state,run_id)
    select 'ingestion_batch',s.scope_key,old_rev,r.payload_revision_hash,
      jsonb_build_object('records',r.records,'run_id',r.id),catalog_url,'pending',r.id from internal.source_registry where source_id=s.source_id
    on conflict(run_id) where run_id is not null do update set new_hash=excluded.new_hash
    returning id into review_id;
  insert into public.dataset_status(scope_key,qualification_id,dataset_type,published_revision_hash,availability,freshness,verification,
    last_fetch_at,last_validated_at,pending_change,public_notice,publication_state)
    values(s.scope_key,s.qualification_id,s.dataset_type,null,'unavailable','unknown','review_required',r.ended_at,clock_timestamp(),true,
      '공식 자료의 변경을 확인 중입니다.','published')
    on conflict(scope_key) do update set pending_change=true,public_notice='공식 자료의 변경을 확인 중입니다.';
  return jsonb_build_object('state','review_required','review_id',review_id,'revision_hash',r.payload_revision_hash,'expected_revision',old_rev);
end $$;

create function internal.approve_ingestion(p_run uuid,p_actor uuid,p_expected_version bigint default 1)
returns void language plpgsql security invoker set search_path='' as $$
declare approved uuid;
begin
  if not internal.has_admin_role(p_actor,'publisher') then raise exception using message='ADMIN_REQUIRED'; end if;
  update internal.review_items set state='approved',optimistic_version=optimistic_version+1
    where run_id=p_run and state='pending' and optimistic_version=p_expected_version returning id into approved;
  if approved is null then raise exception using message='REVIEW_CONFLICT'; end if;
  insert into internal.audit_logs(actor_id,actor_kind,action,target_key,revision_hash,reason)
    select p_actor,'user','INGESTION_APPROVED',target_key,new_hash,'Current publisher role and review version checked'
    from internal.review_items where id=approved;
end $$;

create function internal.publish_ingestion(p_run uuid,p_actor uuid,p_expected_revision text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s internal.ingestion_scopes; r internal.sync_runs; review internal.review_items; row internal.staged_records;
  current_rev text; target_id uuid; owned_id uuid; table_name text; p jsonb; cols text; select_cols text; assignments text;
  actual_hash text; actual_revision text;
begin
  if not internal.has_admin_role(p_actor,'publisher') then raise exception using message='ADMIN_REQUIRED'; end if;
  select sc.* into strict s from internal.ingestion_scopes sc join internal.sync_runs rr on rr.scope_key=sc.scope_key
    where rr.id=p_run for update of sc;
  select * into strict r from internal.sync_runs where id=p_run for update;
  if s.active_run_id<>p_run or not r.collection_complete or r.status<>'staged' or r.records=0 then
    raise exception using message='RUN_NOT_READY';
  end if;
  if not exists(select 1 from internal.source_registry where source_id=s.source_id and approval_state='approved' and daily_quota>0) then
    raise exception using message='SOURCE_NOT_APPROVED';
  end if;
  select * into strict review from internal.review_items where run_id=p_run for update;
  select published_revision_hash into current_rev from public.dataset_status where scope_key=s.scope_key for update;
  if current_rev is distinct from p_expected_revision or review.old_hash is distinct from p_expected_revision then
    raise exception using message='REVISION_CONFLICT';
  end if;
  if review.state<>'approved' or review.new_hash is distinct from r.payload_revision_hash then
    raise exception using message='REVIEW_REQUIRED';
  end if;
  if exists(select 1 from internal.overrides o where o.target_key in (s.scope_key,s.qualification_id::text)
    or exists(select 1 from internal.staged_records sr where sr.run_id=p_run and o.target_key in
      (sr.logical_key,sr.entity_type||':'||sr.logical_key,s.source_id||':'||sr.entity_type||':'||sr.logical_key))) then
    raise exception using message='OVERRIDE_REVIEW_REQUIRED';
  end if;
  if not exists(select 1 from public.qualifications where id=s.qualification_id and acquisition_track=s.acquisition_track) then
    raise exception using message='SCOPE_OWNERSHIP_CONFLICT';
  end if;
  if r.records<>(select count(*) from internal.staged_records where run_id=p_run)
    or exists(select 1 from internal.staged_records where run_id=p_run and validation_result->>'validated' is distinct from 'true') then
    raise exception using message='STAGING_CHANGED';
  end if;
  select encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_array(entity_type,logical_key,payload_hash)
    order by entity_type,logical_key),'[]'::jsonb)::text,'UTF8')),'hex') into actual_revision from internal.staged_records where run_id=p_run;
  if actual_revision is distinct from r.payload_revision_hash then raise exception using message='STAGING_CHANGED'; end if;
  -- One transaction includes every upsert, status revision, run state and audit.
  for row in select * from internal.staged_records where run_id=p_run order by entity_type,logical_key loop
    actual_hash:=encode(sha256(convert_to(jsonb_build_object('payload',row.normalized_payload-array['fetched_at','validated_at'],
      'sourceCode',row.source_code,'sourceName',row.source_name,'sourceGrade',row.source_grade)::text,'UTF8')),'hex');
    if actual_hash is distinct from row.payload_hash then raise exception using message='STAGING_CHANGED'; end if;
    perform internal.assert_ingestion_record(s,jsonb_build_object('entityType',row.entity_type,'logicalKey',row.logical_key,
      'sourceCode',row.source_code,'sourceName',row.source_name,'sourceGrade',row.source_grade,'payload',row.normalized_payload));
    p:=row.normalized_payload;
    case row.entity_type
      when 'qualification' then
        table_name:='qualifications'; target_id:=s.qualification_id;
      when 'event' then
        table_name:='exam_events';
        select id into target_id from public.exam_events where source_id=s.source_id and logical_key=row.logical_key;
      when 'statistic' then
        table_name:='pass_statistics';
        select id into target_id from public.pass_statistics where qualification_id=s.qualification_id and year=s.year
          and round is not distinct from p->>'round' and stage=(p->>'stage')::public.exam_stage
          and acquisition_track=s.acquisition_track and aggregation_level=(p->>'aggregation_level')::public.aggregation_level and source_id=s.source_id;
      when 'detail' then
        table_name:='qualification_details';
        select id into target_id from public.qualification_details where qualification_id=s.qualification_id and info_type=p->>'info_type'
          and valid_from is not distinct from (p->>'valid_from')::date and valid_to is not distinct from (p->>'valid_to')::date;
    end case;
    select public_id into owned_id from internal.published_record_owners
      where source_id=s.source_id and entity_type=row.entity_type and logical_key=row.logical_key;
    if owned_id is not null and owned_id is distinct from target_id then
      raise exception using message='IDENTITY_CHANGED';
    end if;
    target_id:=coalesce(target_id,gen_random_uuid());
    if exists(select 1 from internal.published_record_owners where scope_key<>s.scope_key and
      ((source_id=s.source_id and entity_type=row.entity_type and logical_key=row.logical_key)
      or (entity_type=row.entity_type and public_id=target_id))) then
      raise exception using message='SCOPE_OWNERSHIP_CONFLICT';
    end if;
    if row.entity_type='event' and exists(select 1 from public.exam_events where id=target_id
        and (qualification_id<>s.qualification_id or year<>s.year)) then
      raise exception using message='SCOPE_OWNERSHIP_CONFLICT';
    end if;
    -- Claim before writing. Unique indexes serialize competing scope claims;
    -- never let ON CONFLICT silently detach a public row from its logical owner.
    insert into internal.published_record_owners(source_id,entity_type,logical_key,scope_key,public_id)
      values(s.source_id,row.entity_type,row.logical_key,s.scope_key,target_id) on conflict do nothing;
    if not exists(select 1 from internal.published_record_owners where source_id=s.source_id
      and entity_type=row.entity_type and logical_key=row.logical_key and scope_key=s.scope_key and public_id=target_id) then
      raise exception using message='SCOPE_OWNERSHIP_CONFLICT';
    end if;
    p:=p||jsonb_build_object('id',target_id,'qualification_id',s.qualification_id,'source_id',s.source_id,
      'publication_state','published','verification','verified','reviewed_at',clock_timestamp(),'revision_hash',row.payload_hash);
    if row.entity_type='qualification' then
      p:=p||jsonb_build_object('created_at',(select created_at from public.qualifications where id=target_id),'updated_at',clock_timestamp());
    elsif row.entity_type='event' then p:=p||jsonb_build_object('timezone','Asia/Seoul','logical_key',row.logical_key); end if;
    select string_agg(format('%I',a.attname),',' order by a.attnum),
      string_agg(format('v.%I',a.attname),',' order by a.attnum),
      string_agg(format('%I=excluded.%I',a.attname,a.attname),',' order by a.attnum) filter(where a.attname<>'id')
      into cols,select_cols,assignments from pg_catalog.pg_attribute a
      where a.attrelid=format('public.%I',table_name)::regclass and a.attnum>0 and not a.attisdropped and a.attgenerated='';
    execute format('insert into public.%I(%s) select %s from jsonb_populate_record(null::public.%I,$1) v on conflict(id) do update set %s',
      table_name,cols,select_cols,table_name,assignments) using p;
  end loop;
  update public.dataset_status set published_revision_hash=r.payload_revision_hash,availability='available',freshness='fresh',
    verification='verified',last_fetch_at=r.ended_at,last_validated_at=clock_timestamp(),last_reviewed_at=clock_timestamp(),
    pending_change=false,public_notice=null,publication_state='published' where scope_key=s.scope_key;
  update internal.sync_runs set status='published' where id=p_run;
  insert into internal.audit_logs(actor_id,actor_kind,action,target_key,revision_hash,reason)
    values(p_actor,'user','INGESTION_PUBLISHED',s.scope_key,r.payload_revision_hash,'Reviewed complete batch published atomically');
  return jsonb_build_object('revision_hash',r.payload_revision_hash,'count',r.records);
end $$;

revoke all on function internal.ingestion_scope_key(jsonb),internal.start_ingestion(jsonb,integer),
  internal.reserve_ingestion_calls(uuid,integer),internal.assert_ingestion_record(internal.ingestion_scopes,jsonb),
  internal.stage_ingestion(uuid,jsonb,jsonb,integer,integer),internal.fail_ingestion(uuid,text,integer),
  internal.prepare_ingestion_review(uuid),internal.approve_ingestion(uuid,uuid,bigint),internal.publish_ingestion(uuid,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function internal.ingestion_scope_key(jsonb),internal.start_ingestion(jsonb,integer),
  internal.reserve_ingestion_calls(uuid,integer),internal.assert_ingestion_record(internal.ingestion_scopes,jsonb),
  internal.stage_ingestion(uuid,jsonb,jsonb,integer,integer),internal.fail_ingestion(uuid,text,integer) to qi_ingestion;
grant execute on function internal.assert_ingestion_record(internal.ingestion_scopes,jsonb),internal.prepare_ingestion_review(uuid),
  internal.approve_ingestion(uuid,uuid,bigint),internal.publish_ingestion(uuid,uuid,text) to qi_admin_server;

commit;
