-- SYNTHETIC, disposable PostgreSQL tests only. No real qualification mapping.
insert into internal.source_registry(source_id, catalog_url, adapter_version)
values ('SYNTHETIC-STEP04', 'https://www.data.go.kr/', 'synthetic-test-only');

insert into public.qualifications (
  id, provider, qualification_type, acquisition_track, source_code, canonical_name,
  grade, domain, slug, active_state, publication_state, source_id, source_url,
  fetched_at, validated_at, reviewed_at, verification, revision_hash
)
select ('00000000-0000-0000-0000-00000000000' || n)::uuid,
  'SYNTHETIC', 'synthetic', 'synthetic', code, 'SYNTHETIC ONLY ' || n,
  'synthetic', 'synthetic', 'synthetic-only-' || n, 'unknown', state::public.publication_state,
  'SYNTHETIC-STEP04', 'https://www.q-net.or.kr/',
  '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
  'verified', repeat('a', 64)
from (values (1, '0007', 'published'), (2, 'SYNTH-DRAFT', 'draft'), (3, 'SYNTH-WITHDRAWN', 'withdrawn')) v(n, code, state);

insert into public.qualification_aliases(id, qualification_id, alias, normalized_alias, publication_state, reviewed_at)
select ('00000000-0000-0000-0000-00000000010' || n)::uuid,
  ('00000000-0000-0000-0000-00000000000' || parent)::uuid,
  'SYNTHETIC ALIAS ' || n, 'synthetic-alias-' || n, state::public.publication_state,
  '2026-01-01T00:00:00Z'
from (values (1, 1, 'published'), (2, 1, 'draft'), (3, 2, 'published')) v(n, parent, state);

insert into public.exam_events (
  id, qualification_id, source_id, logical_key, year, round, stage, event_type,
  subtype, ordinal, date_start, date_end, temporal_precision, extent,
  source_url, fetched_at, validated_at, reviewed_at, verification, publication_state, revision_hash
)
select ('00000000-0000-0000-0000-00000000020' || n)::uuid,
  ('00000000-0000-0000-0000-00000000000' || parent)::uuid,
  'SYNTHETIC-STEP04', 'synthetic-event-' || n, 2026, n::text, 'written', 'exam',
  'unknown', '1', '2026-01-02', '2026-01-02', 'date', 'single',
  'https://www.q-net.or.kr/', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z', 'verified', state::public.publication_state, repeat('b', 64)
from (values (1, 1, 'published'), (2, 1, 'draft'), (3, 2, 'published')) v(n, parent, state);

insert into public.pass_statistics (
  id, qualification_id, year, round, stage, acquisition_track, aggregation_level,
  examinees, passed, published_rate, source_rate_text, source_precision, completeness,
  source_id, source_url, fetched_at, validated_at, reviewed_at, verification,
  publication_state, revision_hash
)
select ('00000000-0000-0000-0000-00000000030' || n)::uuid,
  ('00000000-0000-0000-0000-00000000000' || parent)::uuid,
  2026, n::text, 'written', 'synthetic', 'round', 100, 47, 47, '47%', 0, 'complete',
  'SYNTHETIC-STEP04', 'https://www.q-net.or.kr/',
  '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
  'verified', state::public.publication_state, repeat('c', 64)
from (values (1, 1, 'published'), (2, 1, 'draft'), (3, 2, 'published')) v(n, parent, state);

insert into public.qualification_details (
  id, qualification_id, info_type, safe_text, source_id, source_url,
  fetched_at, validated_at, reviewed_at, verification, publication_state, revision_hash
)
select ('00000000-0000-0000-0000-00000000040' || n)::uuid,
  ('00000000-0000-0000-0000-00000000000' || parent)::uuid,
  kind, 'SYNTHETIC ONLY', 'SYNTHETIC-STEP04', 'https://www.q-net.or.kr/',
  '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
  'verified', state::public.publication_state, repeat('d', 64)
from (values (1, 1, 'description', 'published'), (2, 1, 'fee', 'draft'), (3, 2, 'description', 'published')) v(n, parent, kind, state);

insert into public.dataset_status(scope_key, qualification_id, dataset_type, availability, freshness, verification, publication_state)
select 'synthetic-status-' || n, ('00000000-0000-0000-0000-00000000000' || parent)::uuid,
  'qualifications', 'empty', 'unknown', 'pending', state::public.publication_state
from (values (1, 1, 'published'), (2, 1, 'draft'), (3, 2, 'published')) v(n, parent, state);

insert into internal.admin_roles(user_id, role, granted_at)
values ('00000000-0000-0000-0000-000000000901', 'publisher', '2026-01-01T00:00:00Z');
insert into internal.sync_runs(id, scope_key, status, started_at)
values ('00000000-0000-0000-0000-000000000801', 'synthetic-only', 'staged', '2026-01-01T00:00:00Z');
insert into internal.source_snapshots(run_id, source_id, scope_key, sanitized_payload, payload_hash, fetched_at, parse_version)
values ('00000000-0000-0000-0000-000000000801', 'SYNTHETIC-STEP04', 'synthetic-only', '{"synthetic":true}', repeat('a',64), '2026-01-01T00:00:00Z', 'synthetic');
insert into internal.staged_records(run_id, entity_type, logical_key, normalized_payload, payload_hash, validation_result)
values ('00000000-0000-0000-0000-000000000801', 'qualification', 'synthetic-only', '{"synthetic":true}', repeat('a',64), '{"synthetic":true}');
insert into internal.source_crosswalks(source_id, source_code, source_name, source_grade, qualification_id, evidence_url)
values ('SYNTHETIC-STEP04', '0007', 'SYNTHETIC ONLY', 'synthetic', '00000000-0000-0000-0000-000000000001', 'https://www.q-net.or.kr/');
insert into internal.review_items(kind, target_key, new_hash, diff, evidence_url, state)
values ('synthetic', 'synthetic-only', repeat('a',64), '{}', 'https://www.q-net.or.kr/', 'pending');
insert into internal.overrides(target_key, field_name, new_value, evidence_url, applied_at, approved_by)
values ('synthetic-only', 'synthetic', '"synthetic"', 'https://www.q-net.or.kr/', '2026-01-01T00:00:00Z', '00000000-0000-0000-0000-000000000901');
insert into internal.audit_logs(actor_kind, action, target_key, reason)
values ('system', 'SYNTHETIC_TEST_SETUP', 'synthetic-only', 'Synthetic local database tests only');
