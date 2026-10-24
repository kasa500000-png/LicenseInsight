"""Real PostgreSQL STEP-05 contracts; every case rolls back synthetic changes.

Run setup.sql once in the disposable DB, then each case in its own psql session
with -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose. This is our internal
normalized schema, not an official external API contract.
"""
import json

QUAL = "10000000-0000-0000-0000-000000005001"
ADMIN = "10000000-0000-0000-0000-000000005901"
SCOPE = {
    "source_id": "SYNTHETIC-STEP05", "operation": "synthetic-internal-test",
    "qualification_id": QUAL, "year": 2026,
    "acquisition_track": "synthetic", "dataset_type": "events",
}
RECORD = {
    "entityType": "event", "logicalKey": "synthetic-step05-event",
    "sourceCode": "0007", "sourceName": "SYNTHETIC STEP05 ONLY", "sourceGrade": "synthetic",
    "payload": {
        "qualification_id": QUAL, "source_id": "SYNTHETIC-STEP05",
        "logical_key": "synthetic-step05-event", "year": 2026, "round": "1",
        "stage": "written", "event_type": "exam", "subtype": "ordinary", "ordinal": "1",
        "date_start": "2026-06-02", "date_end": "2026-06-02", "starts_at": None,
        "ends_at": None, "temporal_precision": "date", "extent": "single", "timezone": "Asia/Seoul",
        "source_url": "https://www.q-net.or.kr/", "source_published_at": None, "data_as_of": None,
        "fetched_at": "2026-01-02T00:00:00Z", "validated_at": "2026-01-02T00:00:00Z",
    },
}


def literal(value):
    return "'" + json.dumps(value, separators=(",", ":")).replace("'", "''") + "'::jsonb"


SCOPE_SQL = literal(SCOPE)
RECORDS_SQL = literal([RECORD])
SNAPSHOTS_SQL = literal([{"synthetic": True, "items": 1}])
TEST_CASES = []


def case(name, sql, *, role=None, output="t", error=None):
    prefix = "begin;\n" + (f"set local session authorization {role};\n" if role else "")
    entry = {"name": "step05." + name, "sql": prefix + sql + "\nrollback;"}
    entry["expected_sqlstate" if error else "expected_output"] = error or output
    TEST_CASES.append(entry)


def workflow(body, *, records=RECORDS_SQL, before="", approve=False):
    """Role transitions in a workflow are controlled by the owner test connection."""
    approval = f"perform internal.approve_ingestion(run_id,'{ADMIN}',1);" if approve else ""
    return f"""
do $case$
declare lease jsonb; run_id uuid; review jsonb; published jsonb; stage_state text;
begin
  {before}
  set local role qi_ingestion;
  lease := internal.start_ingestion({SCOPE_SQL},120);
  run_id := (lease->>'run_id')::uuid;
  perform internal.reserve_ingestion_calls(run_id,1);
  stage_state := internal.stage_ingestion(run_id,{records},{SNAPSHOTS_SQL},1,1);
  set local role qi_admin_server;
  review := internal.prepare_ingestion_review(run_id);
  {approval}
  {body}
end $case$;
select 't';
"""


def rejected(statement, reason):
    """Assert rejection without depending on the routine's custom SQLSTATE."""
    return f"""
begin
  {statement}
  raise exception using errcode='ZX001',message='{reason}';
exception when others then
  if sqlstate='ZX001' then raise; end if;
end;
"""


OLD_DATE_ASSERT = """
if (select date_start from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event') <> date '2026-06-01' then
 raise exception 'OLD_PUBLIC_DATE_CHANGED'; end if;
"""

for role in ("anon", "authenticated"):
    case(f"{role}.start_denied", f"select internal.start_ingestion({SCOPE_SQL},120);", role=role, error="42501")
    case(f"{role}.publish_denied",
         f"select internal.publish_ingestion('10000000-0000-0000-0000-000000005999','{ADMIN}',null);",
         role=role, error="42501")
    case(f"{role}.review_approval_denied",
         f"select internal.approve_ingestion('10000000-0000-0000-0000-000000005999','{ADMIN}',1);",
         role=role, error="42501")

case("worker.publish_denied",
     f"select internal.publish_ingestion('10000000-0000-0000-0000-000000005999','{ADMIN}',null);",
     role="qi_ingestion", error="42501")
case("worker.review_approval_denied",
     f"select internal.approve_ingestion('10000000-0000-0000-0000-000000005999','{ADMIN}',1);",
     role="qi_ingestion", error="42501")

case("review_preserves_last_good", workflow(OLD_DATE_ASSERT + """
if not exists(select 1 from internal.review_items where id=(review->>'review_id')::uuid and state='pending') then
 raise exception 'PENDING_REVIEW_MISSING'; end if;
if not exists(select 1 from public.dataset_status where scope_key=lease->>'scope_key' and pending_change) then
 raise exception 'PUBLIC_PENDING_STATUS_MISSING'; end if;
"""))

case("publish_requires_review", workflow(
    rejected(f"perform internal.publish_ingestion(run_id,'{ADMIN}',null);", "UNREVIEWED_PUBLISH_ACCEPTED")
    + OLD_DATE_ASSERT
))

case("date_correction_updates_stable_identity", workflow(f"""
published := internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
if (select count(*) from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event') <> 1 then
 raise exception 'DATE_CORRECTION_DUPLICATED_EVENT'; end if;
if (select date_start from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event') <> date '2026-06-02' then
 raise exception 'CORRECTION_NOT_PUBLISHED'; end if;
if not exists(select 1 from public.dataset_status where scope_key=lease->>'scope_key'
 and published_revision_hash=published->>'revision_hash' and not pending_change) then
 raise exception 'PUBLIC_STATUS_NOT_ATOMIC'; end if;
if not exists(select 1 from internal.audit_logs
 where target_key=lease->>'scope_key' and revision_hash=published->>'revision_hash') then
 raise exception 'PUBLICATION_AUDIT_MISSING'; end if;
""", approve=True))

case("return_to_published_content_clears_superseded_pending_change", workflow(f"""
published:=internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
set local role qi_ingestion;
lease:=internal.start_ingestion({SCOPE_SQL},120); run_id:=(lease->>'run_id')::uuid;
perform internal.reserve_ingestion_calls(run_id,1);
stage_state:=internal.stage_ingestion(run_id,{literal([{**RECORD, 'payload': {**RECORD['payload'], 'date_start': '2026-06-03', 'date_end': '2026-06-03'}}])},{SNAPSHOTS_SQL},1,1);
set local role qi_admin_server;
review:=internal.prepare_ingestion_review(run_id);
if review->>'state'<>'review_required' then raise exception 'CHANGED_RESPONSE_DID_NOT_CREATE_PENDING_REVIEW'; end if;
if not exists(select 1 from public.dataset_status ds where ds.scope_key=lease->>'scope_key' and ds.pending_change) then
 raise exception 'INTERMEDIATE_CHANGE_NOT_MARKED_PENDING'; end if;
set local role qi_ingestion;
lease:=internal.start_ingestion({SCOPE_SQL},120); run_id:=(lease->>'run_id')::uuid;
perform internal.reserve_ingestion_calls(run_id,1);
stage_state:=internal.stage_ingestion(run_id,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
set local role qi_admin_server;
stage_state:=internal.prepare_ingestion_review(run_id)->>'state';
if stage_state<>'unchanged' then raise exception 'RETURN_TO_PUBLISHED_CONTENT_NOT_IDENTIFIED'; end if;
if not exists(select 1 from public.dataset_status ds where ds.scope_key=lease->>'scope_key'
 and ds.published_revision_hash=published->>'revision_hash' and not ds.pending_change and ds.public_notice is null) then
 raise exception 'SUPERSEDED_CHANGE_LEFT_STALE_PENDING_NOTICE'; end if;
if not exists(select 1 from internal.review_items ri where ri.id=(review->>'review_id')::uuid and ri.state='superseded') then
 raise exception 'INTERMEDIATE_PENDING_REVIEW_NOT_SUPERSEDED'; end if;
if (select date_start from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event')<>date '2026-06-02' then
 raise exception 'RETURN_TO_PUBLISHED_CONTENT_CHANGED_LAST_GOOD'; end if;
""", approve=True))


case("failed_run_actual_calls_are_distinct_from_reserved_budget", f"""
do $case$ declare lease jsonb; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,2);
 perform internal.fail_ingestion((lease->>'run_id')::uuid,'PAGE_INCOMPLETE',1);
 if not exists(select 1 from internal.sync_runs r where r.id=(lease->>'run_id')::uuid
   and r.status='failed' and r.calls=1 and r.reserved_calls=2) then
  raise exception 'FAILED_RUN_CONFUSED_ATTEMPTED_CALLS_WITH_RESERVED_BUDGET'; end if;
end $case$; select 't';
""")



def rejected_message(statement, message):
    return f"""
begin
 {statement}
 raise exception using errcode='ZX001',message='EXPECTED_GUARD_DID_NOT_REJECT';
exception when others then
 if sqlstate='ZX001' or sqlerrm<>'{message}' then raise; end if;
end;
"""


def override_sql(target, *, expired=False):
    expiry = "clock_timestamp()-interval '2 days'" if expired else "null"
    return f"""
insert into internal.overrides(target_key,field_name,old_value,new_value,evidence_url,applied_at,expires_at,approved_by)
values ({target},'date_start','"2026-06-01"'::jsonb,'"2026-06-04"'::jsonb,
 'https://www.q-net.or.kr/',clock_timestamp()-interval '3 days',{expiry},'{ADMIN}');
"""


for name, target, expired in (
    ("active_scope_override_blocks_prepare", "lease->>'scope_key'", False),
    ("expired_logical_override_blocks_prepare", "'synthetic-step05-event'", True),
):
    case(name, f"""
do $case$ declare lease jsonb; run_id uuid; stage_state text; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 run_id:=(lease->>'run_id')::uuid;
 perform internal.reserve_ingestion_calls(run_id,1);
 stage_state:=internal.stage_ingestion(run_id,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
 set local role qi_admin_server;
 {override_sql(target, expired=expired)}
 {rejected_message("perform internal.prepare_ingestion_review(run_id);", "OVERRIDE_REVIEW_REQUIRED")}
 {OLD_DATE_ASSERT}
 if exists(select 1 from internal.review_items ri where ri.run_id=(lease->>'run_id')::uuid) then
  raise exception 'OVERRIDE_BLOCK_CREATED_PUBLISHABLE_REVIEW'; end if;
end $case$; select 't';
""")

for name, target, expired in (
    ("active_logical_override_after_approval_blocks_publish", "'synthetic-step05-event'", False),
    ("expired_scope_override_after_approval_blocks_publish", "lease->>'scope_key'", True),
):
    case(name, workflow(override_sql(target, expired=expired) + rejected_message(
        f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');",
        "OVERRIDE_REVIEW_REQUIRED") + OLD_DATE_ASSERT, approve=True))

case("current_qualification_track_must_match_publish_scope", workflow(f"""
set local role postgres;
update public.qualifications set acquisition_track='synthetic-other-track' where id='{QUAL}';
set local role qi_admin_server;
""" + rejected_message(
    f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');",
    "SCOPE_OWNERSHIP_CONFLICT") + OLD_DATE_ASSERT, approve=True))

case("unrelated_override_does_not_block_other_records", workflow(
    override_sql("'synthetic-unrelated-logical-key'", expired=True) + f"""
published:=internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
if (select date_start from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event') <> date '2026-06-02' then
 raise exception 'UNRELATED_OVERRIDE_BLOCKED_PUBLICATION'; end if;
""", approve=True))

case("different_scope_cannot_claim_existing_event", workflow(f"""
published:=internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
set local role qi_ingestion;
lease:=internal.start_ingestion({literal({**SCOPE, 'operation': 'synthetic-other-owner'})},120);
run_id:=(lease->>'run_id')::uuid;
perform internal.reserve_ingestion_calls(run_id,1);
stage_state:=internal.stage_ingestion(run_id,{literal([{**RECORD, 'payload': {**RECORD['payload'], 'date_start': '2026-06-03', 'date_end': '2026-06-03'}}])},{SNAPSHOTS_SQL},1,1);
set local role qi_admin_server;
review:=internal.prepare_ingestion_review(run_id);
perform internal.approve_ingestion(run_id,'{ADMIN}',1);
{rejected_message(f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');", "SCOPE_OWNERSHIP_CONFLICT")}
if (select count(*) from public.exam_events where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event')<>1 then
 raise exception 'FOREIGN_SCOPE_CREATED_DUPLICATE_EVENT'; end if;
if (select date_start from public.exam_events
 where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event')<>date '2026-06-02' then
 raise exception 'FOREIGN_SCOPE_OVERWROTE_OWNER'; end if;
""", approve=True))

STAT_SCOPE = {**SCOPE, "operation": "synthetic-statistic-owner", "dataset_type": "statistics"}
STAT_RECORD = {
    "entityType": "statistic", "logicalKey": "synthetic-step05-statistic",
    "sourceCode": RECORD["sourceCode"], "sourceName": RECORD["sourceName"], "sourceGrade": RECORD["sourceGrade"],
    "payload": {
        "qualification_id": QUAL, "source_id": "SYNTHETIC-STEP05", "year": 2026,
        "round": "1", "stage": "written", "acquisition_track": "synthetic", "aggregation_level": "round",
        "examinees": "100", "passed": "47", "published_rate": "47", "source_rate_text": "47%",
        "source_precision": 0, "completeness": "complete", "source_url": "https://www.q-net.or.kr/",
        "source_published_at": None, "data_as_of": None, "fetched_at": "2026-01-02T00:00:00Z",
        "validated_at": "2026-01-02T00:00:00Z",
    },
}
case("statistic_logical_key_cannot_change_natural_identity", f"""
do $case$ declare lease jsonb; run_id uuid; review jsonb; published jsonb; stage_state text; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({literal(STAT_SCOPE)},120); run_id:=(lease->>'run_id')::uuid;
 perform internal.reserve_ingestion_calls(run_id,1);
 stage_state:=internal.stage_ingestion(run_id,{literal([STAT_RECORD])},{SNAPSHOTS_SQL},1,1);
 set local role qi_admin_server;
 review:=internal.prepare_ingestion_review(run_id); perform internal.approve_ingestion(run_id,'{ADMIN}',1);
 published:=internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
 set local role qi_ingestion;
 lease:=internal.start_ingestion({literal(STAT_SCOPE)},120); run_id:=(lease->>'run_id')::uuid;
 perform internal.reserve_ingestion_calls(run_id,1);
 stage_state:=internal.stage_ingestion(run_id,{literal([{**STAT_RECORD, 'payload': {**STAT_RECORD['payload'], 'round': '2'}}])},{SNAPSHOTS_SQL},1,1);
 set local role qi_admin_server;
 review:=internal.prepare_ingestion_review(run_id); perform internal.approve_ingestion(run_id,'{ADMIN}',1);
 {rejected_message(f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');", "IDENTITY_CHANGED")}
 if (select count(*) from public.pass_statistics where qualification_id='{QUAL}' and source_id='SYNTHETIC-STEP05')<>1 then
  raise exception 'IDENTITY_CHANGE_CREATED_UNOWNED_STATISTIC'; end if;
 if (select round from public.pass_statistics where qualification_id='{QUAL}' and source_id='SYNTHETIC-STEP05')<>'1' then
  raise exception 'IDENTITY_CHANGE_OVERWROTE_STATISTIC'; end if;
end $case$; select 't';
""")


case("source_daily_budget_is_shared_and_bounded", f"""
do $case$ declare lease jsonb; begin
 update internal.source_registry set daily_quota=1 where source_id='SYNTHETIC-STEP05';
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 {rejected("perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);", "DAILY_QUOTA_OVERRUN_ACCEPTED")}
 if (select reserved_calls from internal.sync_runs where id=(lease->>'run_id')::uuid) <> 1 then
  raise exception 'FAILED_RESERVATION_CHANGED_RUN_BUDGET'; end if;
 lease:=internal.start_ingestion({literal({**SCOPE, 'operation': 'synthetic-second-scope'})},120);
 {rejected("perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);", "CROSS_SCOPE_DAILY_QUOTA_OVERRUN_ACCEPTED")}
end $case$; select 't';
""")

case("expired_worker_is_fenced_after_new_lease", f"""
do $case$ declare old_lease jsonb; new_lease jsonb; begin
 set local role qi_ingestion;
 old_lease:=internal.start_ingestion({SCOPE_SQL},120);
 set local role postgres;
 update internal.ingestion_scopes set lease_until=clock_timestamp()-interval '1 second'
  where scope_key=old_lease->>'scope_key';
 set local role qi_ingestion;
 new_lease:=internal.start_ingestion({SCOPE_SQL},120);
 {rejected("perform internal.reserve_ingestion_calls((old_lease->>'run_id')::uuid,1);", "EXPIRED_WORKER_RESERVED_BUDGET")}
 {rejected(f"perform internal.stage_ingestion((old_lease->>'run_id')::uuid,{RECORDS_SQL},{SNAPSHOTS_SQL},0,0);", "EXPIRED_WORKER_STAGED_DATA")}
 perform internal.fail_ingestion((old_lease->>'run_id')::uuid,'LEASE_LOST');
 if not exists(select 1 from internal.ingestion_scopes
  where scope_key=new_lease->>'scope_key' and active_run_id=(new_lease->>'run_id')::uuid and lease_until>clock_timestamp()) then
  raise exception 'OLD_WORKER_CLEARED_NEW_LEASE'; end if;
end $case$; select 't';
""")

case("source_approval_revocation_blocks_publish", workflow(f"""
set local role postgres;
update internal.source_registry set approval_state='rejected' where source_id='SYNTHETIC-STEP05';
set local role qi_admin_server;
""" + rejected(f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');",
               "REVOKED_SOURCE_PUBLISHED") + OLD_DATE_ASSERT, approve=True))

case("same_response_rerun_is_idempotent", workflow(f"""
published:=internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
set local role qi_ingestion;
lease:=internal.start_ingestion({SCOPE_SQL},120);
run_id:=(lease->>'run_id')::uuid;
perform internal.reserve_ingestion_calls(run_id,1);
stage_state:=internal.stage_ingestion(run_id,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
set local role qi_admin_server;
review:=internal.prepare_ingestion_review(run_id);
if review->>'state'<>'unchanged' then raise exception 'IDENTICAL_RESPONSE_CREATED_NEW_REVIEW'; end if;
if review->>'revision_hash' is distinct from published->>'revision_hash' then
 raise exception 'IDENTICAL_RESPONSE_CHANGED_REVISION'; end if;
if (select count(*) from public.exam_events where source_id='SYNTHETIC-STEP05' and logical_key='synthetic-step05-event')<>1 then
 raise exception 'IDENTICAL_RESPONSE_DUPLICATED_PUBLIC_EVENT'; end if;
""", approve=True))


case("stale_expected_revision_preserves_public", workflow(
    rejected(f"perform internal.publish_ingestion(run_id,'{ADMIN}',repeat('f',64));", "STALE_REVISION_ACCEPTED")
    + OLD_DATE_ASSERT, approve=True
))

case("unknown_actor_cannot_approve", workflow(
    rejected("perform internal.approve_ingestion(run_id,'10000000-0000-0000-0000-000000005999',1);",
             "UNKNOWN_ACTOR_APPROVED")
    + """
if (select state from internal.review_items where id=(review->>'review_id')::uuid) <> 'pending' then
 raise exception 'UNKNOWN_ACTOR_MUTATED_REVIEW'; end if;
"""))

case("review_optimistic_version_checked", workflow(
    rejected(f"perform internal.approve_ingestion(run_id,'{ADMIN}',999);", "STALE_REVIEW_VERSION_ACCEPTED")
    + """
if (select state from internal.review_items where id=(review->>'review_id')::uuid) <> 'pending' then
 raise exception 'FAILED_APPROVAL_MUTATED_REVIEW'; end if;
"""))

case("revoked_publisher_cannot_publish", workflow(f"""
set local role postgres;
update internal.admin_roles set active=false,revoked_at=clock_timestamp() where user_id='{ADMIN}';
set local role qi_admin_server;
""" + rejected(f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');",
               "REVOKED_PUBLISHER_ACCEPTED") + OLD_DATE_ASSERT, approve=True))

case("same_scope_second_run_rejected", f"""
do $case$ declare lease jsonb; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 {rejected(f"perform internal.start_ingestion({SCOPE_SQL},120);", "CONCURRENT_SCOPE_ACCEPTED")}
end $case$; select 't';
""")

case("failed_collection_preserves_old_projection", f"""
do $case$ declare lease jsonb; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.fail_ingestion((lease->>'run_id')::uuid,'PAGE_INCOMPLETE');
 set local role qi_admin_server;
 {OLD_DATE_ASSERT}
 if (select status from internal.sync_runs where id=(lease->>'run_id')::uuid) <> 'failed' then
  raise exception 'FAILURE_STATUS_NOT_RECORDED'; end if;
end $case$; select 't';
""")

case("empty_collection_never_deletes_last_good", f"""
do $case$ declare lease jsonb; state text; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 state:=internal.stage_ingestion((lease->>'run_id')::uuid,'[]'::jsonb,{SNAPSHOTS_SQL},1,1);
 if state<>'empty' then raise exception 'EMPTY_RESPONSE_NOT_IDENTIFIED'; end if;
 set local role qi_admin_server;
 {OLD_DATE_ASSERT}
end $case$; select 't';
""")

case("ambiguous_mapping_quarantined", f"""
do $case$ declare lease jsonb; state text; begin
 insert into internal.source_crosswalks(
 source_id,source_code,source_name,source_grade,valid_from,valid_to,qualification_id,evidence_url,reviewed_by,reviewed_at)
 values ('SYNTHETIC-STEP05','0007','SYNTHETIC STEP05 ONLY','synthetic','2026-01-01','2026-12-31',
 '{QUAL}','https://www.q-net.or.kr/','{ADMIN}',clock_timestamp());
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 state:=internal.stage_ingestion((lease->>'run_id')::uuid,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
 if state<>'quarantined' then raise exception 'AMBIGUOUS_MAPPING_ACCEPTED'; end if;
 set local role qi_admin_server;
 {OLD_DATE_ASSERT}
end $case$; select 't';
""")

case("unreviewed_mapping_quarantined", f"""
do $case$ declare lease jsonb; state text; begin
 update internal.source_crosswalks set reviewed_by=null,reviewed_at=null where source_id='SYNTHETIC-STEP05';
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 state:=internal.stage_ingestion((lease->>'run_id')::uuid,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
 if state<>'quarantined' then raise exception 'UNREVIEWED_MAPPING_ACCEPTED'; end if;
end $case$; select 't';
""")

case("source_code_zero_not_coerced_in_mapping", f"""
do $case$ declare lease jsonb; state text; begin
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 state:=internal.stage_ingestion((lease->>'run_id')::uuid,{literal([{**RECORD, 'sourceCode': '7'}])},{SNAPSHOTS_SQL},1,1);
 if state<>'quarantined' then raise exception 'LEADING_ZERO_MAPPING_COERCED'; end if;
end $case$; select 't';
""")

case("migration_no_browser_executable_functions", """
select count(*)=6 and bool_and(not has_function_privilege('anon',p.oid,'EXECUTE')
 and not has_function_privilege('authenticated',p.oid,'EXECUTE') and not p.prosecdef)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='internal' and p.proname in
 ('start_ingestion','stage_ingestion','prepare_ingestion_review','approve_ingestion','publish_ingestion','fail_ingestion');
""")

case("quarantined_run_cannot_review_or_publish", f"""
do $case$ declare lease jsonb; state text; begin
 update internal.source_crosswalks set reviewed_by=null,reviewed_at=null where source_id='SYNTHETIC-STEP05';
 set local role qi_ingestion;
 lease:=internal.start_ingestion({SCOPE_SQL},120);
 perform internal.reserve_ingestion_calls((lease->>'run_id')::uuid,1);
 state:=internal.stage_ingestion((lease->>'run_id')::uuid,{RECORDS_SQL},{SNAPSHOTS_SQL},1,1);
 if state<>'quarantined' then raise exception 'UNREVIEWED_MAPPING_NOT_QUARANTINED'; end if;
 set local role qi_admin_server;
 {rejected("perform internal.prepare_ingestion_review((lease->>'run_id')::uuid);", "QUARANTINE_REVIEW_ACCEPTED")}
 {rejected(f"perform internal.publish_ingestion((lease->>'run_id')::uuid,'{ADMIN}',null);", "QUARANTINE_PUBLISHED")}
 {OLD_DATE_ASSERT}
end $case$; select 't';
""")

case("reviewed_staging_payload_tamper_is_rejected", workflow(f"""
set local role postgres;
update internal.staged_records
 set normalized_payload=normalized_payload||'{{"date_start":"2026-06-03","date_end":"2026-06-03"}}'::jsonb
 where logical_key='synthetic-step05-event';
set local role qi_admin_server;
""" + rejected(f"perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');",
               "UNREVIEWED_STAGING_TAMPER_PUBLISHED") + OLD_DATE_ASSERT, approve=True))

case("worker_cannot_rewrite_staged_records", """
update internal.staged_records set normalized_payload='{}'::jsonb;
""", role="qi_ingestion", error="42501")


case("publication_failure_rolls_back_projection_status_and_audit", """
create function pg_temp.synthetic_step05_status_fault() returns trigger language plpgsql as $fault$
begin
 if new.pending_change = false then
  raise exception using errcode='ZX002',message='SYNTHETIC_FINAL_STATUS_FAILURE';
 end if;
 return new;
end $fault$;
create trigger synthetic_step05_status_fault before insert or update on public.dataset_status
for each row execute function pg_temp.synthetic_step05_status_fault();
""" + workflow(f"""
begin
 perform internal.publish_ingestion(run_id,'{ADMIN}',review->>'expected_revision');
 raise exception using errcode='ZX001',message='PUBLICATION_FAULT_DID_NOT_FIRE';
exception when others then
 if sqlstate<>'ZX002' then raise; end if;
end;
{OLD_DATE_ASSERT}
if exists(select 1 from public.dataset_status
 where scope_key=lease->>'scope_key' and published_revision_hash is not null) then
 raise exception 'FAILED_PUBLICATION_CHANGED_STATUS_REVISION'; end if;
if exists(select 1 from internal.audit_logs
 where target_key=lease->>'scope_key' and revision_hash=review->>'revision_hash' and action='INGESTION_PUBLISHED') then
 raise exception 'FAILED_PUBLICATION_APPENDED_SUCCESS_AUDIT'; end if;
if (select status from internal.sync_runs where id=run_id) = 'published' then
 raise exception 'FAILED_PUBLICATION_MARKED_RUN_PUBLISHED'; end if;
""", approve=True))


