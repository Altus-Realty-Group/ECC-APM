#!/usr/bin/env bash
# Proof for docs/legal/schema/002_legal_reference_protection.{proposal,rollback.proposal}.sql on a private PostgreSQL 16 reconstruction
# (the combined baseline from tests/legal-documents-db). Throwaway cluster, synthetic rows, no credentials, no real database.
# RECONSTRUCTION proof only: not installed/live proof, and not a legal retention determination.
set -euo pipefail
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../.."; comb="$root/tests/legal-documents-db"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[legal-reference-protection-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$comb/baseline.sql" "$comb/fp.sql" "$tmp/"; cp "$comb/tests.sql" "$tmp/comb_tests.sql"; cp "$here/tests.sql" "$tmp/ref_tests.sql"
cp "$root/docs/legal/schema/001_native_legal_foundation.proposal.sql" "$tmp/legal.sql"
cp "$root/docs/legal/schema/001_native_legal_foundation.rollback.proposal.sql" "$tmp/legal_rb.sql"
cp "$root/docs/legal/schema/002_legal_reference_protection.proposal.sql" "$tmp/ref.sql"
cp "$root/docs/legal/schema/002_legal_reference_protection.rollback.proposal.sql" "$tmp/ref_rb.sql"
cp "$root/docs/documents/schema/001_document_registry.proposal.sql" "$tmp/documents.sql"
cp "$root/docs/documents/schema/001_document_registry.rollback.proposal.sql" "$tmp/documents_rb.sql"
printf '\\i %s\n\\i %s\n' "$tmp/legal.sql" "$tmp/ref.sql" > "$tmp/legal_plus_ref.sql"      # 001 then 002 as ONE "legal" step for the existing combined suite
chmod 644 "$tmp"/*.sql
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
export PGOPTIONS=--client-min-messages=warning
psqlx() { local db="$1"; shift; as "$bin/psql" -h "$tmp" -d "$db" -X -q -t -A "$@"; }
strict() { local db="$1"; shift; psqlx "$db" -v ON_ERROR_STOP=1 "$@"; }
pass=0; total=0
chk() { total=$((total+1)); if [ "$2" = "1" ]; then pass=$((pass+1)); else echo "FAIL: $1"; fi; }
newdb() { psqlx postgres -c "CREATE DATABASE $1" >/dev/null; psqlx "$1" -v ON_ERROR_STOP=1 -f "$tmp/baseline.sql" >/dev/null; }
enddb() { psqlx postgres -c "DROP DATABASE IF EXISTS $1" >/dev/null; psqlx postgres -c "DROP ROLE IF EXISTS ecc_legal_runtime" >/dev/null 2>&1 || true; psqlx postgres -c "DROP ROLE IF EXISTS ecc_documents_runtime" >/dev/null 2>&1 || true; }
fpall() { psqlx "$1" -v tables='^[a-z]' -v funcs='^(legal_|document_)' -f "$tmp/fp.sql"; }
refused() { local db="$1" file="$2" pat="$3" err; if err="$(strict "$db" -f "$file" 2>&1 >/dev/null)"; then echo 0; else echo "$err" | grep -Eq "$pat" && echo 1 || { echo "  (unexpected refusal text: $err)" >&2; echo 0; }; fi; }
and() { local x; for x in "$@"; do [ "$x" = 1 ] || { echo 0; return; }; done; echo 1; }
ok() { strict "$1" -f "$2" >/dev/null 2>&1 && echo 1 || echo 0; }
actions() { psqlx "$1" -c "select string_agg(conrelid::regclass::text||'.'||(select attname from pg_attribute where attrelid=conrelid and attnum=conkey[1])||'='||confdeltype::text::text, ',' order by 1) from pg_constraint where contype='f' and ((conrelid='legal_cases'::regclass and confrelid::regclass::text in ('properties','units','tenants','leases')) or (to_regclass('legal_matter_properties') is not null and conrelid=to_regclass('legal_matter_properties') and confrelid::regclass::text in ('units','leases')))"; }

# md5 of the reviewed 001 guard body, taken from an unmodified 001 install
newdb g0; strict g0 -f "$tmp/legal.sql" >/dev/null; guard_md5="$(psqlx g0 -c "select md5(prosrc) from pg_proc where proname='legal_matter_guard'")"; enddb g0
runmain() { psqlx "$1" -v legal="$2" -v documents="$tmp/documents.sql" -v ref="$3" -v guard_md5="$guard_md5" -f "$tmp/ref_tests.sql" 2>&1 || true; }

# ---------------------------------------------------------------- 1) main proof: 001, D1, then 002
newdb main
out="$(runmain main "$tmp/legal.sql" "$tmp/ref.sql")"
last="$(echo "$out" | tail -1)"; fails="$(echo "$out" | sed '$d' | grep -v '^$' || true)"; [ -n "$fails" ] && echo "$fails" | sed 's/^/MAIN FAIL: /'
if echo "$last" | grep -Eq '^[0-9]+\|[0-9]+$'; then main_pass="${last%%|*}"; main_total="${last##*|}"; else echo "MAIN FAIL: suite did not finish ($last)"; main_pass=0; main_total=1; fi
enddb main

# ---------------------------------------------------------------- 1b) negative controls: the SAME suite must fail on a broken proposal
neg_pass=0; neg_total=0
negctl() {   # name, which (ref|legal), sed script, expected failing-check substring
  local name="$1" which="$2" script="$3" expect="$4" lf="$tmp/legal.sql" rf="$tmp/ref.sql" o p t; neg_total=$((neg_total+1))
  if [ "$which" = ref ]; then sed "$script" "$tmp/ref.sql" > "$tmp/m_$name.sql"; cmp -s "$tmp/ref.sql" "$tmp/m_$name.sql" && { echo "FAIL: mutant $name changed nothing (vacuous control)"; return; }; rf="$tmp/m_$name.sql"
  else sed "$script" "$tmp/legal.sql" > "$tmp/m_$name.sql"; cmp -s "$tmp/legal.sql" "$tmp/m_$name.sql" && { echo "FAIL: mutant $name changed nothing (vacuous control)"; return; }; lf="$tmp/m_$name.sql"; fi
  newdb "n_$name"; o="$(runmain "n_$name" "$lf" "$rf")"; enddb "n_$name"; p="${o##*$'\n'}"
  if ! echo "$p" | grep -Eq '^[0-9]+\|[0-9]+$'; then echo "FAIL: negative control $name crashed instead of failing a check: $p"; return; fi
  t="${p##*|}"; p="${p%%|*}"
  if echo "$o" | sed '$d' | grep -qF -- "$expect" && [ "$p" -lt "$t" ]; then neg_pass=$((neg_pass+1)); else echo "FAIL: negative control $name was NOT caught (expected: $expect) -> $p/$t"; fi
}
negctl m1_link_table_left_set_null ref "s/('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)/('legal_matter_properties','lease_id','leases')) v(child, col, parent)/" 'property-only-link collision'
negctl m2_no_action_instead_of_restrict ref "s/ON DELETE RESTRICT'/ON DELETE NO ACTION'/" 'only the delete action changed to RESTRICT'
negctl m3_guard_gets_depth_exemption legal "s/IF NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN\$/IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF; IF NEW.revision IS DISTINCT FROM OLD.revision + 1 THEN/" 'byte-identical to the reviewed 001 function'
negctl m4_tenant_reference_skipped ref "s/('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),/('legal_cases','lease_id','leases'),/" 'referenced by legal_cases fails 23503'

# ---------------------------------------------------------------- 2) the EXISTING combined suite, with 002 applied inside its legal step
newdb comb
out="$(psqlx comb -v legal="$tmp/legal_plus_ref.sql" -v documents="$tmp/documents.sql" -f "$tmp/comb_tests.sql" 2>&1 || true)"
last="$(echo "$out" | tail -1)"; fails="$(echo "$out" | sed '$d' | grep -v '^$' || true)"
enddb comb
if echo "$last" | grep -Eq '^[0-9]+\|[0-9]+$'; then cp_="${last%%|*}"; ct="${last##*|}"; else cp_=0; ct=0; echo "FAIL: existing combined suite did not finish ($last)"; fi
chk "existing combined suite (isolation, custody, constraints, baseline preservation) runs to completion with 002 applied" "$([ "$ct" -gt 0 ] && echo 1 || echo 0)"
chk "exactly ONE existing check changes with 002: the pinned UNRESOLVED BLOCKER (delete of a referenced parent no longer fails 40001)" "$([ "$cp_" = "$((ct-1))" ] && [ "$(echo "$fails" | grep -c .)" = 1 ] && echo "$fails" | grep -q 'UNRESOLVED BLOCKER' && echo 1 || echo 0)"
[ "$(echo "$fails" | grep -c .)" = 1 ] || echo "$fails" | sed 's/^/COMBINED SUITE DIFF: /'

# ---------------------------------------------------------------- 3) apply refusals: unexpected or ambiguous definitions are rejected and nothing changes
refuse_case() {   # name, setup sql, expected message
  newdb "ap"; strict ap -f "$tmp/legal.sql" >/dev/null; strict ap -c "$2" >/dev/null; local b; b="$(fpall ap)"
  chk "002 refuses: $1" "$(refused ap "$tmp/ref.sql" "$3")"
  chk "refused 002 changed nothing ($1)" "$([ "$b" = "$(fpall ap)" ] && echo 1 || echo 0)"; enddb ap
}
refuse_case "a duplicate foreign key on legal_cases.unit_id (ambiguous)" "alter table legal_cases add constraint dup_unit foreign key (unit_id) references units(id_uuid)" 'is in 2 foreign key definition'
refuse_case "ON UPDATE CASCADE on legal_cases.tenant_id (unexpected action)" "alter table legal_cases drop constraint legal_cases_tenant_id_fkey; alter table legal_cases add constraint legal_cases_tenant_id_fkey foreign key (tenant_id) references tenants(id_uuid) on update cascade on delete set null" 'not the expected single-column definition'
refuse_case "legal_cases.lease_id already RESTRICT (not the verified SET NULL shape)" "alter table legal_cases drop constraint legal_cases_lease_id_fkey; alter table legal_cases add constraint legal_cases_lease_id_fkey foreign key (lease_id) references leases(id_uuid) on delete restrict" 'found action r'
refuse_case "a DEFERRABLE legal_matter_properties.unit_id reference" "alter table legal_matter_properties drop constraint legal_matter_properties_unit_id_fkey; alter table legal_matter_properties add constraint legal_matter_properties_unit_id_fkey foreign key (unit_id) references units(id_uuid) on delete set null deferrable" 'not the expected single-column definition'
refuse_case "legal_cases.property_id pointing at a non-id_uuid key (properties.id)" "alter table legal_cases drop constraint legal_cases_property_id_fkey; alter table legal_cases alter column property_id type bigint using null; alter table legal_cases add constraint legal_cases_property_id_fkey foreign key (property_id) references properties(id) on delete set null" 'not the expected single-column definition'
refuse_case "legal_matter_properties.property_id no longer RESTRICT" "alter table legal_matter_properties drop constraint legal_matter_properties_property_id_fkey; alter table legal_matter_properties add constraint legal_matter_properties_property_id_fkey foreign key (property_id) references properties(id_uuid) on delete set null" 'found action n'
newdb ap; chk "002 refuses when 001 is not applied" "$(refused ap "$tmp/ref.sql" 'apply 001_native_legal_foundation first')"; enddb ap
newdb ap; strict ap -f "$tmp/legal.sql" >/dev/null; strict ap -f "$tmp/ref.sql" >/dev/null; chk "a second apply of 002 is refused (one-time apply)" "$(refused ap "$tmp/ref.sql" 'found action r')"; enddb ap

# ---------------------------------------------------------------- 4) rollback order, populated refusal and residual restrictions
POP="insert into properties(id,id_uuid) values (81,'00000000-0000-4000-8000-0000000e0081'); insert into units(id,id_uuid) values (83,'00000000-0000-4000-8000-0000000e0083');
 insert into legal_cases(id,case_type,status,scope_ref,property_id,unit_id) values ('00000000-0000-4000-8000-0000000f0a01','other','draft','scopeA','00000000-0000-4000-8000-0000000e0081','00000000-0000-4000-8000-0000000e0083');"
UNLINK="update legal_cases set property_id=null, unit_id=null, tenant_id=null, lease_id=null, revision=revision+1 where property_id is not null or unit_id is not null or tenant_id is not null or lease_id is not null"
LINK="insert into legal_matter_properties(matter_id,property_id,unit_id) values ('00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-000000000042','00000000-0000-4000-8000-0000000e0083');"
build() { newdb "$1"; strict "$1" -f "$tmp/legal.sql" >/dev/null; strict "$1" -f "$tmp/documents.sql" >/dev/null; strict "$1" -f "$tmp/ref.sql" >/dev/null; strict "$1" -c "$POP" >/dev/null; }
ALLRESTRICT="legal_cases.lease_id=r,legal_cases.property_id=r,legal_cases.tenant_id=r,legal_cases.unit_id=r,legal_matter_properties.lease_id=r,legal_matter_properties.unit_id=r"
ALLSETNULL="legal_cases.lease_id=n,legal_cases.property_id=n,legal_cases.tenant_id=n,legal_cases.unit_id=n,legal_matter_properties.lease_id=n,legal_matter_properties.unit_id=n"
chk_actions() { local got; got="$(actions "$1" | tr ',' '\n' | sort | paste -sd,)"; local want; want="$(echo "$2" | tr ',' '\n' | sort | paste -sd,)"; [ "$got" = "$want" ] && echo 1 || { echo "  (actions: $got)" >&2; echo 0; }; }

# A) populated references: 002 rollback refuses while the 001 guard is installed, and changes nothing
build ra; strict ra -c "$LINK" >/dev/null; b="$(fpall ra)"
chk "002 rollback refuses while legal_cases references are populated and 001's guard is installed" "$(refused ra "$tmp/ref_rb.sql" 'rollback refused: legal_cases\.[a-z_]+ holds [0-9]+ populated reference')"
chk "refused 002 rollback changed nothing; all six references still RESTRICT" "$(and "$([ "$b" = "$(fpall ra)" ] && echo 1 || echo 0)" "$(chk_actions ra "$ALLRESTRICT")")"
# unlink legal_cases explicitly (revisioned), then the link table is the remaining custody
strict ra -c "$UNLINK" >/dev/null   # explicit revisioned unlink of the baseline row and the fixture case
chk "002 rollback refuses while legal_matter_properties references are populated" "$(refused ra "$tmp/ref_rb.sql" 'rollback refused: legal_matter_properties\.[a-z_]+ holds [0-9]+ populated reference')"
strict ra -c "delete from legal_matter_properties" >/dev/null   # explicit human decision in this scenario; never done by a proposal script
chk "after explicit unlinking 002 rollback succeeds (correct order: 002 first)" "$(ok ra "$tmp/ref_rb.sql")"
chk "002 rollback restored ON DELETE SET NULL on all six references" "$(chk_actions ra "$ALLSETNULL")"
strict ra -c "update legal_cases set unit_id='00000000-0000-4000-8000-0000000e0083', revision=revision+1 where id='00000000-0000-4000-8000-0000000f0a01'" >/dev/null
e="$(strict ra -c "delete from units where id=83" 2>&1 >/dev/null || true)"
chk "RESIDUAL (documented): rolling back 002 re-exposes the 001 defect while the guard stays: a referenced parent delete fails 40001 again" "$(echo "$e" | grep -q 'stale or omitted revision' && echo 1 || echo 0)"
strict ra -c "$UNLINK" >/dev/null
chk "then 001 rollback proceeds normally (L1 child tables empty)" "$(ok ra "$tmp/legal_rb.sql")"
chk "after 002 then 001 the legal_cases references are the baseline SET NULL again (no residual restriction)" "$(chk_actions ra "legal_cases.lease_id=n,legal_cases.property_id=n,legal_cases.tenant_id=n,legal_cases.unit_id=n")"
enddb ra

# B) wrong order: 001 rolled back first (its tables must be empty) leaves RESIDUAL RESTRICT on legal_cases until 002 rollback runs
build rb   # legal_cases references stay POPULATED (the baseline row and the fixture case)
chk "001 rollback runs first on empty L1 child tables even though 002 is applied" "$(ok rb "$tmp/legal_rb.sql")"
chk "RESIDUAL RESTRICTION (documented): legal_cases references stay RESTRICT after a lone 001 rollback; the link table is gone" "$(and "$(chk_actions rb "legal_cases.lease_id=r,legal_cases.property_id=r,legal_cases.tenant_id=r,legal_cases.unit_id=r")" "$([ "$(psqlx rb -c "select (to_regclass('legal_matter_properties') is null)::int")" = 1 ] && echo 1 || echo 0)")"
chk "002 rollback is then allowed even with populated legal_cases references (guard gone), restores SET NULL and skips the dropped link table" "$(and "$(ok rb "$tmp/ref_rb.sql")" "$(chk_actions rb "legal_cases.lease_id=n,legal_cases.property_id=n,legal_cases.tenant_id=n,legal_cases.unit_id=n")")"
chk "and the baseline action works again: deleting a referenced property nulls the reference" "$(strict rb -c "delete from properties where id=81" >/dev/null 2>&1 && psqlx rb -c "select (property_id is null)::int from legal_cases where id='00000000-0000-4000-8000-0000000f0a01'")"
enddb rb

# D) the 001 and D1 populated refusals are unchanged with 002 applied (a populated NEW table in each)
build rd; strict rd -c "insert into legal_parties(matter_id,role,display_name) values ('00000000-0000-4000-8000-0000000f0a01','other','p'); insert into document_records(name,section,classification,home_kind,home_owner_id,created_by) values ('A','management-contracts','general','owner',17,'t')" >/dev/null; b="$(fpall rd)"
chk "001 rollback still refuses while populated with 002 applied (legal custody)" "$(refused rd "$tmp/legal_rb.sql" 'rollback refused: legal_[a-z_]+ holds [0-9]+ rows')"
chk "D1 rollback still refuses while populated with 002 applied (custody)" "$(refused rd "$tmp/documents_rb.sql" 'rollback refused: document_[a-z_]+ holds [0-9]+ rows')"
chk "refused rollbacks changed nothing (whole-schema fingerprint)" "$([ "$b" = "$(fpall rd)" ] && echo 1 || echo 0)"
enddb rd
newdb re; strict re -f "$tmp/legal.sql" >/dev/null
chk "002 rollback refuses when 002 was never applied (references are SET NULL, not the RESTRICT 002 produces)" "$(refused re "$tmp/ref_rb.sql" 'not the expected RESTRICT definition produced by 002')"
enddb re

echo "[legal-reference-protection-db] main ${main_pass}/${main_total}, negative controls $neg_pass/$neg_total, existing-suite / apply-refusal / rollback checks $pass/$total"
if [ "$main_pass" = "$main_total" ] && [ "$main_total" -gt 0 ] && [ "$neg_pass" = "$neg_total" ] && [ "$neg_total" -gt 0 ] && [ "$pass" = "$total" ] && [ "$total" -gt 0 ]; then echo "[legal-reference-protection-db] PASS (reconstruction proof only; not installed/live proof)"; else echo "[legal-reference-protection-db] FAIL"; exit 1; fi
