-- STEP-04: reviewed projections and private operations. PostgreSQL >= 17.
-- No seed data, credentials, API calls, auth users, or privileged browser RPCs.
begin;

create schema internal;
revoke all on schema internal from public, anon, authenticated, service_role;
revoke create on schema public from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;

-- NOLOGIN capability roles. Provisioning a server login/member is a separate,
-- approved operation. Neither browser role nor service_role inherits these.
do $$
declare r text;
begin
  foreach r in array array['qi_ingestion','qi_admin_server'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin noinherit nobypassrls', r);
    elsif exists (select 1 from pg_roles where rolname = r and
      (rolcanlogin or rolinherit or rolbypassrls or rolsuper or rolcreaterole or rolcreatedb or rolreplication))
      or exists (select 1 from pg_auth_members m join pg_roles p on p.oid = m.roleid
        join pg_roles member_role on member_role.oid = m.member
        where (p.rolname = r and member_role.rolname <> current_user) or member_role.rolname = r) then
      raise exception 'Unsafe pre-existing capability role: %', r;
    end if;
  end loop;
end $$;
grant usage on schema internal, public to qi_ingestion, qi_admin_server;
alter default privileges in schema internal revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema internal revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated, service_role;
-- Per-schema REVOKE cannot subtract the built-in GLOBAL PUBLIC EXECUTE.
alter default privileges revoke execute on functions from public, anon, authenticated, service_role;

create domain public.official_url as text check (
  value ~ '^https://(www\.q-net\.or\.kr|q-net\.or\.kr|www\.data\.go\.kr|data\.go\.kr|apis\.data\.go\.kr|www\.hrdkorea\.or\.kr|hrdkorea\.or\.kr)(/|$)'
  and value !~* '[?&](servicekey|api_key|apikey|token|access_token)='
);
create type public.publication_state as enum ('draft', 'published', 'withdrawn');
create type public.verification_state as enum ('pending', 'verified', 'review_required');
create type public.exam_stage as enum ('written', 'practical');
create type public.aggregation_level as enum ('round', 'official_annual');

create table internal.source_registry (
  source_id text primary key check (btrim(source_id) <> ''),
  catalog_url public.official_url not null,
  approval_state text not null default 'unknown' check (approval_state in ('unknown','requested','approved','rejected')),
  daily_quota integer check (daily_quota >= 0),
  adapter_version text not null,
  approval_checked_at timestamptz
);

create table public.qualifications (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (btrim(provider) <> ''),
  qualification_type text not null check (btrim(qualification_type) <> ''),
  acquisition_track text not null check (btrim(acquisition_track) <> ''),
  source_code text not null check (btrim(source_code) <> ''),
  canonical_name text not null check (btrim(canonical_name) <> ''),
  grade text not null,
  domain text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  active_state text not null check (active_state in ('active','abolished','unknown')),
  publication_state public.publication_state not null default 'draft',
  source_id text not null references internal.source_registry on delete restrict,
  source_url public.official_url not null,
  source_published_at timestamptz,
  data_as_of date,
  fetched_at timestamptz not null,
  validated_at timestamptz not null,
  reviewed_at timestamptz,
  verification public.verification_state not null default 'pending',
  revision_hash text not null check (revision_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, qualification_type, acquisition_track, source_code),
  check (publication_state <> 'published' or (verification = 'verified' and reviewed_at is not null))
);
create index qualifications_name_idx on public.qualifications(canonical_name);
create index qualifications_grade_idx on public.qualifications(grade);

create table public.qualification_aliases (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications on delete restrict,
  alias text not null check (btrim(alias) <> ''),
  normalized_alias text not null check (btrim(normalized_alias) <> ''),
  valid_from date,
  valid_to date,
  publication_state public.publication_state not null default 'draft',
  -- Alias provenance is inherited from its qualification; aliases need review too.
  reviewed_at timestamptz,
  unique nulls not distinct (qualification_id, normalized_alias, valid_from, valid_to),
  check (valid_to >= valid_from),
  check (publication_state <> 'published' or reviewed_at is not null)
);
create index aliases_lookup_idx on public.qualification_aliases(normalized_alias);

create table public.exam_events (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications on delete restrict,
  source_id text not null references internal.source_registry on delete restrict,
  logical_key text not null check (btrim(logical_key) <> ''),
  year integer not null check (year between 1900 and 2200),
  round text not null check (btrim(round) <> ''),
  stage public.exam_stage not null,
  event_type text not null check (event_type in ('registration','exam','result','document_submission')),
  subtype text not null check (subtype in ('ordinary','additional','vacancy','unknown')),
  ordinal text not null check (btrim(ordinal) <> ''),
  date_start date not null,
  date_end date not null,
  starts_at timestamptz,
  ends_at timestamptz,
  temporal_precision text not null check (temporal_precision in ('date','datetime')),
  extent text not null check (extent in ('single','range')),
  timezone text not null default 'Asia/Seoul' check (timezone = 'Asia/Seoul'),
  source_url public.official_url not null,
  source_published_at timestamptz,
  data_as_of date,
  fetched_at timestamptz not null,
  validated_at timestamptz not null,
  reviewed_at timestamptz,
  verification public.verification_state not null default 'pending',
  publication_state public.publication_state not null default 'draft',
  revision_hash text not null check (revision_hash ~ '^[0-9a-f]{64}$'),
  unique (source_id, logical_key),
  check (date_end >= date_start),
  check (extent <> 'single' or date_end = date_start),
  check (
    (temporal_precision = 'date' and starts_at is null and ends_at is null)
    or (temporal_precision <> 'date' and starts_at is not null and ends_at is not null
      and ends_at >= starts_at
      and (starts_at at time zone 'Asia/Seoul')::date = date_start
      and (ends_at at time zone 'Asia/Seoul')::date = date_end)
  ),
  check (publication_state <> 'published' or (verification = 'verified' and reviewed_at is not null))
);
create index events_qualification_date_idx on public.exam_events(qualification_id, year, stage, date_start);

create table public.pass_statistics (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications on delete restrict,
  year integer not null check (year between 1900 and 2200),
  round text,
  stage public.exam_stage not null,
  acquisition_track text not null check (btrim(acquisition_track) <> ''),
  aggregation_level public.aggregation_level not null,
  examinees bigint check (examinees >= 0),
  passed bigint check (passed >= 0),
  published_rate numeric check (published_rate between 0 and 100),
  source_rate_text text,
  source_precision integer check (source_precision between 0 and 10),
  -- Exact counts are the authority for this separate derived rate.
  calculated_rate numeric generated always as (
    case when examinees > 0 and passed is not null then passed::numeric * 100 / examinees end
  ) stored,
  completeness text not null check (completeness in ('complete','partial','unknown')),
  source_id text not null references internal.source_registry on delete restrict,
  source_url public.official_url not null,
  source_published_at timestamptz,
  data_as_of date,
  fetched_at timestamptz not null,
  validated_at timestamptz not null,
  reviewed_at timestamptz,
  verification public.verification_state not null default 'pending',
  publication_state public.publication_state not null default 'draft',
  revision_hash text not null check (revision_hash ~ '^[0-9a-f]{64}$'),
  unique nulls not distinct (qualification_id, year, round, stage, acquisition_track, aggregation_level, source_id),
  check (passed <= examinees),
  check ((aggregation_level = 'round' and round is not null and btrim(round) <> '')
    or (aggregation_level = 'official_annual' and round is null)),
  check (publication_state <> 'published' or (verification = 'verified' and reviewed_at is not null))
);

create table public.qualification_details (
  id uuid primary key default gen_random_uuid(),
  qualification_id uuid not null references public.qualifications on delete restrict,
  info_type text not null check (info_type in ('eligibility','fee','criteria','description','preparation')),
  -- Plain text only; presentation MUST render as text, never innerHTML.
  safe_text text not null,
  numeric_value numeric,
  unit text,
  valid_from date,
  valid_to date,
  source_id text not null references internal.source_registry on delete restrict,
  source_url public.official_url not null,
  source_published_at timestamptz,
  data_as_of date,
  fetched_at timestamptz not null,
  validated_at timestamptz not null,
  reviewed_at timestamptz,
  verification public.verification_state not null default 'pending',
  publication_state public.publication_state not null default 'draft',
  revision_hash text not null check (revision_hash ~ '^[0-9a-f]{64}$'),
  unique nulls not distinct (qualification_id, info_type, valid_from, valid_to),
  check (valid_to >= valid_from),
  check (publication_state <> 'published' or (verification = 'verified' and reviewed_at is not null))
);

create table public.dataset_status (
  scope_key text primary key check (btrim(scope_key) <> ''),
  qualification_id uuid references public.qualifications on delete restrict,
  dataset_type text not null check (dataset_type in ('qualifications','events','statistics','details')),
  published_revision_hash text check (published_revision_hash ~ '^[0-9a-f]{64}$'),
  availability text not null check (availability in ('available','empty','unavailable','partial')),
  freshness text not null check (freshness in ('fresh','stale','unknown')),
  verification public.verification_state not null default 'pending',
  last_fetch_at timestamptz,
  last_validated_at timestamptz,
  last_reviewed_at timestamptz,
  source_as_of date,
  pending_change boolean not null default false,
  public_notice text,
  publication_state public.publication_state not null default 'draft'
);
create index dataset_qualification_idx on public.dataset_status(qualification_id);

create table internal.source_crosswalks (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references internal.source_registry on delete restrict,
  source_code text not null check (btrim(source_code) <> ''),
  source_name text not null,
  source_grade text not null,
  valid_from date,
  valid_to date,
  qualification_id uuid not null references public.qualifications on delete restrict,
  evidence_url public.official_url not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  unique nulls not distinct (source_id, source_code, source_grade, valid_from, valid_to),
  check (valid_to >= valid_from),
  check ((reviewed_by is null) = (reviewed_at is null))
);
create index crosswalk_qualification_idx on internal.source_crosswalks(qualification_id);
create table internal.sync_runs (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  status text not null check (status in ('running','failed','staged','validated','published','quarantined')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  calls integer not null default 0 check (calls >= 0),
  pages integer not null default 0 check (pages >= 0),
  records integer not null default 0 check (records >= 0),
  quarantined integer not null default 0 check (quarantined >= 0),
  safe_error_code text check (safe_error_code ~ '^[A-Z0-9_]{1,64}$'),
  lease_expires_at timestamptz,
  check (ended_at >= started_at)
);
create index runs_scope_idx on internal.sync_runs(scope_key, started_at desc);
create table internal.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references internal.sync_runs on delete restrict,
  source_id text not null references internal.source_registry on delete restrict,
  scope_key text not null,
  sanitized_payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  fetched_at timestamptz not null,
  parse_version text not null,
  unique (run_id, source_id, payload_hash)
);
create table internal.staged_records (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references internal.sync_runs on delete restrict,
  entity_type text not null check (entity_type in ('qualification','event','statistic','detail')),
  logical_key text not null,
  normalized_payload jsonb not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  validation_result jsonb not null,
  unique (run_id, entity_type, logical_key)
);
create table internal.review_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  target_key text not null,
  old_hash text,
  new_hash text not null,
  diff jsonb not null,
  evidence_url public.official_url not null,
  state text not null check (state in ('pending','approved','rejected','superseded')),
  optimistic_version bigint not null default 1 check (optimistic_version > 0),
  created_at timestamptz not null default now()
);
create index reviews_pending_idx on internal.review_items(state, created_at);
create table internal.overrides (
  id uuid primary key default gen_random_uuid(),
  target_key text not null,
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  evidence_url public.official_url not null,
  applied_at timestamptz not null,
  expires_at timestamptz,
  approved_by uuid not null,
  check (expires_at > applied_at)
);
create index overrides_target_idx on internal.overrides(target_key, field_name);
create table internal.admin_roles (
  user_id uuid primary key,
  role text not null check (role in ('reviewer','publisher')),
  active boolean not null default true,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((active and revoked_at is null) or (not active and revoked_at is not null)),
  check (revoked_at >= granted_at)
);
create table internal.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_kind text not null check (actor_kind in ('user','system')),
  action text not null,
  target_key text not null,
  revision_hash text,
  reason text not null,
  occurred_at timestamptz not null default now(),
  check ((actor_kind = 'user' and actor_id is not null) or (actor_kind = 'system' and actor_id is null))
);
create index audit_target_idx on internal.audit_logs(target_key, occurred_at desc);

-- Invoker helper is private, takes a verified server identity, and grants no
-- elevation. Server must verify identity BEFORE calling on every request.
create function internal.has_admin_role(verified_user_id uuid, required_role text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from internal.admin_roles r
    where r.user_id = verified_user_id and r.active and r.revoked_at is null
      and (r.role = required_role or (r.role = 'publisher' and required_role = 'reviewer')))
$$;
revoke all on function internal.has_admin_role(uuid, text) from public, anon, authenticated, service_role, qi_ingestion;
grant execute on function internal.has_admin_role(uuid, text) to qi_admin_server;

-- Do not trust platform defaults, even on projects with historical auto-grants.
revoke all on all tables in schema internal from public, anon, authenticated, service_role;
revoke all on public.qualifications, public.qualification_aliases, public.exam_events,
  public.pass_statistics, public.qualification_details, public.dataset_status
  from public, anon, authenticated, service_role;
grant select on public.qualifications, public.qualification_aliases, public.exam_events,
  public.pass_statistics, public.qualification_details, public.dataset_status to anon, authenticated;

alter table public.qualifications enable row level security;
create policy published_read on public.qualifications for select to anon, authenticated
  using (publication_state = 'published' and verification = 'verified' and reviewed_at is not null);

do $$
declare t text;
begin
  foreach t in array array['qualification_aliases','exam_events','pass_statistics','qualification_details'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy published_read on public.%I for select to anon, authenticated using
      (publication_state = ''published'' and exists (select 1 from public.qualifications q
       where q.id = qualification_id and q.publication_state = ''published''))', t);
  end loop;
end $$;
alter table public.dataset_status enable row level security;
create policy published_read on public.dataset_status for select to anon, authenticated using (
  publication_state = 'published' and (qualification_id is null or exists
    (select 1 from public.qualifications q where q.id = qualification_id and q.publication_state = 'published'))
);

-- Capability roles have explicit table-scoped grants and RLS, no BYPASSRLS.
do $$
declare t text;
begin
  foreach t in array array['qualifications','qualification_aliases','exam_events','pass_statistics','qualification_details','dataset_status'] loop
    execute format('grant select, insert, update on public.%I to qi_admin_server', t);
    execute format('create policy server_publication on public.%I for all to qi_admin_server using (true) with check (true)', t);
  end loop;
  foreach t in array array['source_registry','source_crosswalks','sync_runs','source_snapshots','staged_records','review_items','overrides','admin_roles','audit_logs'] loop
    execute format('alter table internal.%I enable row level security', t);
    execute format('grant select on internal.%I to qi_admin_server', t);
    execute format('create policy server_read on internal.%I for select to qi_admin_server using (true)', t);
  end loop;
  foreach t in array array['sync_runs','source_snapshots','staged_records'] loop
    execute format('grant select, insert on internal.%I to qi_ingestion', t);
    execute format('create policy worker_staging on internal.%I for all to qi_ingestion using (true) with check (true)', t);
  end loop;
  foreach t in array array['review_items','overrides'] loop
    execute format('grant insert, update on internal.%I to qi_admin_server', t);
    execute format('create policy server_review on internal.%I for all to qi_admin_server using (true) with check (true)', t);
  end loop;
end $$;
grant update on internal.sync_runs, internal.staged_records to qi_ingestion;
grant select on internal.source_registry, internal.source_crosswalks to qi_ingestion;
create policy worker_read on internal.source_registry for select to qi_ingestion using (true);
create policy worker_read on internal.source_crosswalks for select to qi_ingestion using (true);
grant insert on internal.audit_logs to qi_admin_server, qi_ingestion;
create policy audit_append on internal.audit_logs for insert to qi_admin_server, qi_ingestion with check (true);
-- No role management, source mutation, destructive delete, or audit rewrite grants.

create view public.qualification_catalog with (security_invoker = true) as
  select id, source_code, canonical_name, grade, slug from public.qualifications;
revoke all on public.qualification_catalog from public, anon, authenticated, service_role;
grant select on public.qualification_catalog to anon, authenticated;

commit;
