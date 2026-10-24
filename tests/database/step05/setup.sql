-- Synthetic STEP-05 integration data. Never a live source or deployment seed.
insert into internal.source_registry(source_id,catalog_url,approval_state,daily_quota,adapter_version)
values ('SYNTHETIC-STEP05','https://www.data.go.kr/','approved',100,'synthetic-only');
insert into internal.admin_roles(user_id,role,granted_at)
values ('10000000-0000-0000-0000-000000005901','publisher','2026-01-01T00:00:00Z');
insert into public.qualifications(
 id,provider,qualification_type,acquisition_track,source_code,canonical_name,grade,domain,slug,active_state,
 publication_state,source_id,source_url,fetched_at,validated_at,reviewed_at,verification,revision_hash
) values (
 '10000000-0000-0000-0000-000000005001','SYNTHETIC-STEP05','synthetic','synthetic','0007',
 'SYNTHETIC STEP05 ONLY','synthetic','synthetic','synthetic-step05-only','unknown',
 'published','SYNTHETIC-STEP05','https://www.q-net.or.kr/','2026-01-01T00:00:00Z',
 '2026-01-01T00:00:00Z','2026-01-01T00:00:00Z','verified',repeat('a',64)
);
insert into internal.source_crosswalks(
 source_id,source_code,source_name,source_grade,valid_from,valid_to,qualification_id,evidence_url,reviewed_by,reviewed_at
) values (
 'SYNTHETIC-STEP05','0007','SYNTHETIC STEP05 ONLY','synthetic','2025-01-01','2027-12-31',
 '10000000-0000-0000-0000-000000005001','https://www.q-net.or.kr/',
 '10000000-0000-0000-0000-000000005901','2026-01-01T00:00:00Z'
);
insert into public.exam_events(
 id,qualification_id,source_id,logical_key,year,round,stage,event_type,subtype,ordinal,date_start,date_end,
 temporal_precision,extent,source_url,fetched_at,validated_at,reviewed_at,verification,publication_state,revision_hash
) values (
 '10000000-0000-0000-0000-000000005201','10000000-0000-0000-0000-000000005001',
 'SYNTHETIC-STEP05','synthetic-step05-event',2026,'1','written','exam','ordinary','1','2026-06-01','2026-06-01',
 'date','single','https://www.q-net.or.kr/','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z',
 '2026-01-01T00:00:00Z','verified','published',repeat('b',64)
);

