"""Actual PostgreSQL permission and integrity cases; never production seeds.

Runner contract: execute setup.sql once, then each case in its own psql session
with -X -qAt -v ON_ERROR_STOP=1 -v VERBOSITY=verbose. A case either expects exact
stdout.strip() or a failing PostgreSQL SQLSTATE. Each case rolls back changes.
SQL strings are fixed test code, never application or user supplied input.
"""

PUBLIC_TABLES = (
    "qualifications", "qualification_aliases", "exam_events",
    "pass_statistics", "qualification_details", "dataset_status",
)
INTERNAL_TABLES = (
    "source_registry", "source_crosswalks", "sync_runs", "source_snapshots",
    "staged_records", "review_items", "overrides", "admin_roles", "audit_logs",
)
VISIBLE_KEYS = {
    "qualifications": ("source_code", "0007"),
    "qualification_aliases": ("id::text", "00000000-0000-0000-0000-000000000101"),
    "exam_events": ("logical_key", "synthetic-event-1"),
    "pass_statistics": ("id::text", "00000000-0000-0000-0000-000000000301"),
    "qualification_details": ("id::text", "00000000-0000-0000-0000-000000000401"),
    "dataset_status": ("scope_key", "synthetic-status-1"),
}
ADMIN = "00000000-0000-0000-0000-000000000901"
QUAL = "00000000-0000-0000-0000-000000000001"
STAT = "00000000-0000-0000-0000-000000000301"
EVENT = "00000000-0000-0000-0000-000000000201"
TEST_CASES = []


def case(name, sql, *, role=None, output=None, error=None):
    body = "begin;\n"
    if role:
        # SET ROLE from a postgres session retains superuser session_user and
        # would permit another SET ROLE. Lower session authority as well.
        body += f"set local session authorization {role};\n"
    body += sql + "\nrollback;\n"
    item = {"name": name, "sql": body}
    if error:
        item["expected_sqlstate"] = error
    else:
        item["expected_output"] = output
    TEST_CASES.append(item)


for role in ("anon", "authenticated"):
    for table in PUBLIC_TABLES:
        # Fixture has published, draft, and published-child-of-draft rows.
        column, expected = VISIBLE_KEYS[table]
        case(f"{role}.{table}.published_only", f"select {column} from public.{table};", role=role, output=expected)
        case(f"{role}.{table}.insert_denied", f"insert into public.{table} default values;", role=role, error="42501")
        case(f"{role}.{table}.update_denied", f"update public.{table} set publication_state = 'draft';", role=role, error="42501")
        case(f"{role}.{table}.delete_denied", f"delete from public.{table};", role=role, error="42501")
        case(f"{role}.{table}.truncate_denied", f"truncate public.{table};", role=role, error="42501")
    for table in INTERNAL_TABLES:
        case(f"{role}.internal.{table}.denied", f"select * from internal.{table};", role=role, error="42501")
    case(f"{role}.view.respects_rls", "select source_code from public.qualification_catalog;", role=role, output="0007")
    case(f"{role}.view.write_denied", "update public.qualification_catalog set canonical_name = 'TAMPERED';", role=role, error="42501")
    case(f"{role}.private_function.denied", f"select internal.has_admin_role('{ADMIN}', 'publisher');", role=role, error="42501")
    case(f"{role}.set_admin_server_role.denied", "set local role qi_admin_server;", role=role, error="42501")
    case(f"{role}.set_ingestion_role.denied", "set local role qi_ingestion;", role=role, error="42501")
    case(f"{role}.public_schema.create_denied", "create table public.synthetic_unauthorized (id integer);", role=role, error="42501")

case("authenticated.forged_admin_claims.no_elevation", f"""
set local request.jwt.claims = '{{"sub":"{ADMIN}","user_metadata":{{"role":"publisher","admin":true}},"app_metadata":{{"role":"publisher"}}}}';
select count(*) from public.qualifications;
""", role="authenticated", output="1")
case("authenticated.forged_admin_claims.write_denied", f"""
set local request.jwt.claims = '{{"sub":"{ADMIN}","user_metadata":{{"admin":true}}}}';
update public.qualifications set publication_state = 'published';
""", role="authenticated", error="42501")
case("authenticated.admin_role.self_grant_denied", f"insert into internal.admin_roles(user_id, role) values ('{ADMIN}', 'publisher');", role="authenticated", error="42501")

case("metadata.all_eighteen_tables_rls", """
select count(*) = 18 and bool_and(c.relrowsecurity)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','internal') and c.relkind = 'r';
""", output="t")
case("metadata.view_security_invoker", "select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.qualification_catalog'::regclass;", output="t")
case("metadata.no_definer_functions", "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','internal') and p.prosecdef;", output="0")
case("metadata.internal_schema_no_browser_usage", "select not has_schema_privilege('anon','internal','USAGE') and not has_schema_privilege('authenticated','internal','USAGE');", output="t")
case("metadata.capability_roles_nologin_no_bypass", "select count(*)=2 and bool_and(not rolcanlogin and not rolbypassrls and not rolsuper) from pg_roles where rolname in ('qi_ingestion','qi_admin_server');", output="t")
case("metadata.browser_no_capability_membership", "select not pg_has_role('anon','qi_ingestion','MEMBER') and not pg_has_role('authenticated','qi_ingestion','MEMBER') and not pg_has_role('anon','qi_admin_server','MEMBER') and not pg_has_role('authenticated','qi_admin_server','MEMBER');", output="t")
case("metadata.helper_execute_only_server", "select not has_function_privilege('anon','internal.has_admin_role(uuid,text)','EXECUTE') and not has_function_privilege('authenticated','internal.has_admin_role(uuid,text)','EXECUTE') and not has_function_privilege('qi_ingestion','internal.has_admin_role(uuid,text)','EXECUTE') and has_function_privilege('qi_admin_server','internal.has_admin_role(uuid,text)','EXECUTE');", output="t")
case("metadata.future_function_not_public", """
create function public.synthetic_future_function() returns integer language sql as 'select 1';
select not has_function_privilege('anon','public.synthetic_future_function()','EXECUTE') and not has_function_privilege('authenticated','public.synthetic_future_function()','EXECUTE');
""", output="t")
case("metadata.future_private_function_not_public", """
create function internal.step04_default_probe() returns integer language sql as 'select 1';
set local session authorization anon;
select internal.step04_default_probe();
""", error="42501")
case("metadata.future_private_function_execute_acl", """
create function internal.step04_default_probe() returns integer language sql as 'select 1';
select not has_function_privilege('anon', 'internal.step04_default_probe()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'internal.step04_default_probe()', 'EXECUTE');
""", output="t")
case("metadata.future_table_no_browser_grants", """
create table public.synthetic_future_table(id integer);
select not has_table_privilege('anon','public.synthetic_future_table','SELECT') and not has_table_privilege('authenticated','public.synthetic_future_table','INSERT');
""", output="t")

case("codes.leading_zero_preserved", f"select source_code || ':' || pg_typeof(source_code)::text from public.qualifications where id='{QUAL}';", output="0007:text")
case("codes.leading_zero_distinct_identity", f"""
insert into public.qualifications select (jsonb_populate_record(null::public.qualifications,
  to_jsonb(q) || '{{"id":"00000000-0000-0000-0000-000000000999","source_code":"7","slug":"synthetic-without-zero"}}'::jsonb)).*
from public.qualifications q where q.id='{QUAL}';
select count(*) from public.qualifications where source_code in ('0007','7');
""", output="2")
case("qualification.natural_key_duplicate", f"""
insert into public.qualifications select (jsonb_populate_record(null::public.qualifications,
  to_jsonb(q) || '{{"id":"00000000-0000-0000-0000-000000000999","slug":"synthetic-duplicate"}}'::jsonb)).*
from public.qualifications q where q.id='{QUAL}';
""", error="23505")
case("qualification.unreviewed_publication_rejected", f"update public.qualifications set reviewed_at=null where id='{QUAL}';", error="23514")
case("qualification.unverified_publication_rejected", f"update public.qualifications set verification='pending' where id='{QUAL}';", error="23514")
case("qualification.restrict_history_delete", f"delete from public.qualifications where id='{QUAL}';", error="23503")
case("qualification.invalid_official_host", f"update public.qualifications set source_url='https://www.q-net.or.kr.evil.invalid/' where id='{QUAL}';", error="23514")
case("qualification.non_https_source", f"update public.qualifications set source_url='http://www.q-net.or.kr/' where id='{QUAL}';", error="23514")
case("qualification.secret_query_parameter_rejected", f"update public.qualifications set source_url='https://www.q-net.or.kr/?serviceKey=SYNTHETIC-NOT-A-SECRET' where id='{QUAL}';", error="23514")

for name, changes in (
    ("reversed_date_range", "date_start='2026-01-03', date_end='2026-01-02', extent='range'"),
    ("date_only_invented_time", "starts_at='2026-01-02T00:00:00+09:00', ends_at='2026-01-02T01:00:00+09:00'"),
    ("exact_times_required", "temporal_precision='datetime'"),
    ("exact_times_reversed", "temporal_precision='datetime', starts_at='2026-01-02T02:00:00+09:00', ends_at='2026-01-02T01:00:00+09:00'"),
    ("timestamp_korean_date_mismatch", "temporal_precision='datetime', starts_at='2026-01-01T23:00:00+09:00', ends_at='2026-01-02T01:00:00+09:00'"),
    ("single_extent_multiday", "date_end='2026-01-03'"),
):
    case(f"events.{name}", f"update public.exam_events set {changes} where id='{EVENT}';", error="23514")
case("events.valid_precision_range", f"""
update public.exam_events set temporal_precision='datetime', extent='range', date_end='2026-01-03',
  starts_at='2026-01-02T09:00:00+09:00', ends_at='2026-01-03T18:00:00+09:00' where id='{EVENT}';
select temporal_precision || ':' || extent from public.exam_events where id='{EVENT}';
""", output="datetime:range")
case("events.logical_key_duplicate", "update public.exam_events set logical_key='synthetic-event-1' where logical_key='synthetic-event-2';", error="23505")
case("events.invalid_stage", f"update public.exam_events set stage='SYNTHETIC-INVALID' where id='{EVENT}';", error="22P02")
case("events.invalid_child_fk", f"update public.exam_events set qualification_id='00000000-0000-0000-0000-000000000999' where id='{EVENT}';", error="23503")

for name, changes in (
    ("negative_examinees", "examinees=-1"),
    ("negative_passed", "passed=-1"),
    ("passed_exceeds_examinees", "passed=101"),
    ("published_rate_over_100", "published_rate=101"),
    ("published_rate_negative", "published_rate=-1"),
    ("published_rate_nan", "published_rate='NaN'"),
    ("round_requires_round", "round=null"),
    ("annual_requires_null_round", "aggregation_level='official_annual'"),
):
    case(f"statistics.{name}", f"update public.pass_statistics set {changes} where id='{STAT}';", error="23514")
for name, changes in (
    ("null_denominator_is_not_zero", "examinees=null"),
    ("null_numerator_is_not_zero", "passed=null"),
    ("zero_denominator_has_null_rate", "examinees=0, passed=0"),
):
    case(f"statistics.{name}", f"update public.pass_statistics set {changes} where id='{STAT}'; select calculated_rate is null from public.pass_statistics where id='{STAT}';", output="t")
case("statistics.exact_47_percent", f"select calculated_rate=47 and published_rate=47 from public.pass_statistics where id='{STAT}';", output="t")
case("statistics.generated_rate_not_overridable", f"update public.pass_statistics set calculated_rate=99 where id='{STAT}';", error="428C9")
case("statistics.annual_null_natural_key_duplicate", f"""
update public.pass_statistics set round=null, aggregation_level='official_annual' where id='{STAT}';
update public.pass_statistics set round=null, aggregation_level='official_annual' where id='00000000-0000-0000-0000-000000000302';
""", error="23505")
case("statistics.annual_and_round_remain_separate", f"""
update public.pass_statistics set round=null, aggregation_level='official_annual' where id='{STAT}';
select count(distinct aggregation_level) from public.pass_statistics where qualification_id='{QUAL}';
""", output="2")

case("aliases.null_period_duplicate", """
update public.qualification_aliases set normalized_alias='synthetic-alias-1'
where id='00000000-0000-0000-0000-000000000102';
""", error="23505")
case("aliases.reversed_valid_period", "update public.qualification_aliases set valid_from='2026-01-03', valid_to='2026-01-01';", error="23514")
case("details.null_period_duplicate", "update public.qualification_details set info_type='description' where id='00000000-0000-0000-0000-000000000402';", error="23505")
case("details.reversed_valid_period", "update public.qualification_details set valid_from='2026-01-03', valid_to='2026-01-01';", error="23514")
case("crosswalk.null_period_duplicate", f"""
insert into internal.source_crosswalks(source_id,source_code,source_name,source_grade,qualification_id,evidence_url)
values ('SYNTHETIC-STEP04','0007','SYNTHETIC ONLY','synthetic','{QUAL}','https://www.q-net.or.kr/');
""", error="23505")
case("crosswalk.code_remains_text", "select source_code || ':' || pg_typeof(source_code)::text from internal.source_crosswalks;", output="0007:text")

case("worker.staging_insert_allowed", """
insert into internal.staged_records(run_id,entity_type,logical_key,normalized_payload,payload_hash,validation_result)
values ('00000000-0000-0000-0000-000000000801','event','synthetic-new','{}',repeat('b',64),'{}');
select count(*) from internal.staged_records;
""", role="qi_ingestion", output="2")
case("worker.source_registry_read_allowed", "select source_id from internal.source_registry;", role="qi_ingestion", output="SYNTHETIC-STEP04")
case("worker.public_publication_denied", "update public.qualifications set publication_state='draft';", role="qi_ingestion", error="42501")
case("worker.admin_role_read_denied", "select * from internal.admin_roles;", role="qi_ingestion", error="42501")
case("worker.source_mutation_denied", "update internal.source_registry set approval_state='approved';", role="qi_ingestion", error="42501")
case("worker.audit_append_allowed", "insert into internal.audit_logs(actor_kind,action,target_key,reason) values ('system','SYNTHETIC','synthetic','Synthetic only');", role="qi_ingestion", output="")
case("worker.audit_rewrite_denied", "update internal.audit_logs set reason='TAMPERED';", role="qi_ingestion", error="42501")
case("worker.audit_delete_denied", "delete from internal.audit_logs;", role="qi_ingestion", error="42501")
case("worker.snapshot_rewrite_denied", "update internal.source_snapshots set sanitized_payload='{}';", role="qi_ingestion", error="42501")
case("server.admin_read_and_helper_allowed", f"select internal.has_admin_role('{ADMIN}', 'publisher'), internal.has_admin_role('{ADMIN}', 'reviewer');", role="qi_admin_server", output="t|t")
case("server.unknown_identity_not_admin", "select internal.has_admin_role('00000000-0000-0000-0000-000000000999', 'publisher');", role="qi_admin_server", output="f")
case("server.invalid_requested_role_not_admin", f"select internal.has_admin_role('{ADMIN}', 'SYNTHETIC-INVALID');", role="qi_admin_server", output="f")
case("server.role_revocation_immediate", f"""
update internal.admin_roles set active=false, revoked_at='2026-02-01T00:00:00Z' where user_id='{ADMIN}';
set local role qi_admin_server;
select internal.has_admin_role('{ADMIN}', 'publisher');
""", output="f")
case("server.direct_publication_capability", "update public.qualifications set publication_state='draft'; select count(*) from public.qualifications where publication_state='draft';", role="qi_admin_server", output="3")
case("server.role_self_grant_denied", "update internal.admin_roles set active=true;", role="qi_admin_server", error="42501")
case("server.history_delete_denied", "delete from public.exam_events;", role="qi_admin_server", error="42501")
case("server.audit_rewrite_denied", "delete from internal.audit_logs;", role="qi_admin_server", error="42501")
case("service_role.no_implicit_project_access", "select * from public.qualifications;", role="service_role", error="42501")
