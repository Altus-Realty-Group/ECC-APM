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
cp "$comb/baseline.sql" "$comb/fp.sql" "$tmp/"; cp "$comb/tests.sql" "$tmp/comb_tests.sql"; cp "$here/tests.sql" "$tmp/ref_tests.sql"; cp "$here/shadow.sql" "$tmp/shadow.sql"
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
build ra; b="$(fpall ra)"
chk "002 rollback refuses while legal_cases references are populated and 001's guard is bound" "$(refused ra "$tmp/ref_rb.sql" 'rollback refused: legal_cases\.[a-z_]+ holds [0-9]+ populated reference')"
chk "refused 002 rollback changed nothing; all six references still RESTRICT" "$(and "$([ "$b" = "$(fpall ra)" ] && echo 1 || echo 0)" "$(chk_actions ra "$ALLRESTRICT")")"
strict ra -c "$LINK" >/dev/null
chk "with link references ALSO populated the link custody rule fires first (it does not depend on the guard)" "$(refused ra "$tmp/ref_rb.sql" 'rollback refused: legal_matter_properties\.[a-z_]+ holds [0-9]+ populated reference')"
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


# ---------------------------------------------------------------- 5) v2 gaps: (1) rollback custody independent of the matter guard and its name, (2) schema targeting
# gap_run APPLY_FILE ROLLBACK_FILE runs every scenario against the given proposal files and prints GAPFAIL lines and a final `GAPRESULT passed total`.
SHADOWCAT="create schema if not exists shadow; create table shadow.pg_constraint (oid oid, conname name); create table shadow.pg_trigger (oid oid, tgname name); create table shadow.pg_attribute (attrelid oid, attname name);"
PUB6="select (count(*)=6 and coalesce(bool_and(confdeltype='r'),false))::int from pg_constraint c where c.contype='f' and ((c.conrelid='public.legal_cases'::regclass and c.confrelid::regclass::text ~ '^(properties|units|tenants|leases)$') or (c.conrelid=to_regclass('public.legal_matter_properties') and c.confrelid::regclass::text ~ '^(units|leases)$'))"
shfp() { psqlx "$1" -c "select coalesce(md5(string_agg(c.conrelid::regclass::text||' '||c.conname||' '||pg_get_constraintdef(c.oid), '|' order by c.conrelid::regclass::text, c.conname)),'none')||'/'||(select count(*) from shadow.legal_cases)||'/'||(select count(*) from shadow.legal_matter_properties) from pg_constraint c where c.connamespace='shadow'::regnamespace"; }
gap_run() {
  local APPLY="$1" RB="$2" GP=0 GT=0 b sb out
  gc() { GT=$((GT+1)); if [ "$2" = "1" ]; then GP=$((GP+1)); else echo "GAPFAIL: $1"; fi; }
  mk001() { newdb "$1"; strict "$1" -f "$tmp/legal.sql" >/dev/null; strict "$1" -f "$tmp/documents.sql" >/dev/null; }
  mk002() { mk001 "$1"; strict "$1" -f "$APPLY" >/dev/null; strict "$1" -c "$POP" >/dev/null; }
  wrap() { printf 'SET search_path = shadow, public, pg_catalog;\n\\i %s\n' "$2" > "$tmp/wrap_$1.sql"; chmod 644 "$tmp/wrap_$1.sql"; echo "$tmp/wrap_$1.sql"; }
  tempwrap() {   # one session: create TEMP look-alikes, fingerprint them, run the file, fingerprint again
    cat > "$tmp/tw_$1.sql" <<WRAP
\set kind temp
\i $tmp/shadow.sql
SELECT coalesce(md5(string_agg(conrelid::regclass::text||conname||pg_get_constraintdef(oid), '|' ORDER BY conrelid::regclass::text, conname)),'none') AS before FROM pg_constraint WHERE connamespace = pg_my_temp_schema() \gset
\i $2
SELECT (coalesce(md5(string_agg(conrelid::regclass::text||conname||pg_get_constraintdef(oid), '|' ORDER BY conrelid::regclass::text, conname)),'none') = :'before') AS same FROM pg_constraint WHERE connamespace = pg_my_temp_schema() \gset
SELECT 'TEMPUNTOUCHED|' || :'same';
WRAP
    chmod 644 "$tmp/tw_$1.sql"; echo "$tmp/tw_$1.sql"; }
  # ---- gap 1: link custody must not depend on the matter guard, nor on the trigger NAME
  mk002 g1a; strict g1a -c "$UNLINK" >/dev/null
  strict g1a -c "insert into legal_matter_properties(matter_id,property_id) values ('00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-000000000042'); $LINK" >/dev/null
  strict g1a -c "drop trigger legal_cases_guard on legal_cases" >/dev/null; b="$(fpall g1a)"
  gc "GAP1a: guard TRIGGER dropped but link table kept (property-only link + unit link): rollback refuses populated unit/lease links" "$(refused g1a "$RB" 'rollback refused: legal_matter_properties\.unit_id holds [0-9]+ populated reference')"
  gc "GAP1a: that refusal changed nothing (whole-schema fingerprint, six RESTRICT, both links intact)" "$(and "$([ "$b" = "$(fpall g1a)" ] && echo 1 || echo 0)" "$(chk_actions g1a "$ALLRESTRICT")" "$([ "$(psqlx g1a -c "select count(*) from legal_matter_properties")" = 2 ] && echo 1 || echo 0)")"
  enddb g1a
  mk002 g1b; strict g1b -c "alter trigger legal_cases_guard on legal_cases rename to zz_renamed_guard" >/dev/null; b="$(fpall g1b)"
  gc "GAP1b: a RENAMED matter guard is still detected (bound by function): populated legal_cases references refuse the rollback" "$(refused g1b "$RB" 'rollback refused: legal_cases\.[a-z_]+ holds [0-9]+ populated reference')"
  gc "GAP1b: that refusal changed nothing; all six references still RESTRICT" "$(and "$([ "$b" = "$(fpall g1b)" ] && echo 1 || echo 0)" "$(chk_actions g1b "$ALLRESTRICT")")"
  enddb g1b
  mk002 g1c; strict g1c -c "create function public.zz_noop() returns trigger language plpgsql as \$\$ begin return new; end \$\$; drop trigger legal_cases_guard on legal_cases; create trigger legal_cases_guard before update on legal_cases for each row execute function public.zz_noop()" >/dev/null; b="$(fpall g1c)"
  gc "GAP1c: a trigger NAMED legal_cases_guard that does not run the guard function is an unexpected trigger state: refused" "$(refused g1c "$RB" 'unexpected trigger state')"
  gc "GAP1c: that refusal changed nothing" "$([ "$b" = "$(fpall g1c)" ] && echo 1 || echo 0)"
  enddb g1c
  mk002 g1d; strict g1d -c "drop trigger legal_cases_guard on legal_cases" >/dev/null     # no link rows; legal_cases references populated; nothing runs the guard
  gc "GAP1d: nothing bound to the guard and no populated links: populated legal_cases references may return to baseline SET NULL" "$(ok g1d "$RB")"
  gc "GAP1d: all six are SET NULL and the baseline action works again (deleting a referenced property nulls the reference)" "$(and "$(chk_actions g1d "$ALLSETNULL")" "$(strict g1d -c "delete from properties where id=81" >/dev/null 2>&1 && psqlx g1d -c "select (property_id is null)::int from legal_cases where id='00000000-0000-4000-8000-0000000f0a01'")")"
  enddb g1d
  # ---- gap 2: schema targeting. Look-alike relations are searched FIRST; apply/rollback must touch only the verified public objects
  mk001 g2a; strict g2a -v kind=schema -f "$tmp/shadow.sql" >/dev/null; sb="$(shfp g2a)"
  strict g2a -f "$(wrap g2a "$APPLY")" >/dev/null 2>&1
  gc "GAP2 apply (look-alike schema first): public holds the six RESTRICT references to public parents" "$(psqlx g2a -c "$PUB6")"
  gc "GAP2 apply: the shadow tables, FKs and rows are untouched" "$([ "$sb" = "$(shfp g2a)" ] && echo 1 || echo 0)"
  strict g2a -c "$POP" >/dev/null 2>&1; strict g2a -c "$UNLINK" >/dev/null 2>&1; strict g2a -f "$(wrap g2a "$RB")" >/dev/null 2>&1
  gc "GAP2 rollback (look-alike schema first): public returns to SET NULL and the shadow stays untouched" "$(and "$(chk_actions g2a "$ALLSETNULL")" "$([ "$sb" = "$(shfp g2a)" ] && echo 1 || echo 0)")"
  enddb g2a
  mk002 g2b; strict g2b -v kind=schema -f "$tmp/shadow.sql" >/dev/null; sb="$(shfp g2b)"; b="$(fpall g2b)"
  gc "GAP2 populated-row check reads the PUBLIC legal_cases: an EMPTY look-alike first in search_path cannot hide populated references" "$(refused g2b "$(wrap g2b "$RB")" 'rollback refused: legal_cases\.[a-z_]+ holds [0-9]+ populated reference')"
  gc "GAP2 that refusal changed nothing in public or in the shadow schema" "$(and "$([ "$b" = "$(fpall g2b)" ] && echo 1 || echo 0)" "$([ "$sb" = "$(shfp g2b)" ] && echo 1 || echo 0)")"
  strict g2b -c "$UNLINK" >/dev/null
  strict g2b -c "insert into shadow.properties(id,id_uuid) values (1,'00000000-0000-4000-8000-0000000a0001'); insert into shadow.legal_cases(id,property_id) values ('00000000-0000-4000-8000-0000000a0002','00000000-0000-4000-8000-0000000a0001')" >/dev/null; sb="$(shfp g2b)"
  gc "GAP2 a POPULATED look-alike cannot cause a false refusal: clean public references roll back" "$(ok g2b "$(wrap g2b "$RB")")"
  gc "GAP2 and that populated shadow stays byte-identical while public returns to SET NULL" "$(and "$([ "$sb" = "$(shfp g2b)" ] && echo 1 || echo 0)" "$(chk_actions g2b "$ALLSETNULL")")"
  enddb g2b
  mk002 g2f; strict g2f -c "$UNLINK" >/dev/null; strict g2f -c "$LINK" >/dev/null; strict g2f -v kind=schema -f "$tmp/shadow.sql" >/dev/null; b="$(fpall g2f)"
  gc "GAP2 populated LINK check reads the PUBLIC legal_matter_properties: an empty look-alike link table cannot hide a populated unit link" "$(refused g2f "$(wrap g2f "$RB")" 'rollback refused: legal_matter_properties\.unit_id holds [0-9]+ populated reference')"
  gc "GAP2 that refusal changed nothing" "$([ "$b" = "$(fpall g2f)" ] && echo 1 || echo 0)"
  enddb g2f
  mk001 g2c; strict g2c -c "create schema shadow; create sequence shadow.legal_cases; create sequence shadow.legal_matter_properties" >/dev/null
  gc "GAP2 look-alike SEQUENCES first in search_path do not break the apply (LOCK/ALTER target public)" "$(ok g2c "$(wrap g2c "$APPLY")")"
  strict g2c -c "$POP" >/dev/null 2>&1; strict g2c -c "$UNLINK" >/dev/null 2>&1
  gc "GAP2 look-alike SEQUENCES do not break the rollback; public returns to SET NULL" "$(and "$(ok g2c "$(wrap g2c "$RB")")" "$(chk_actions g2c "$ALLSETNULL")")"
  enddb g2c
  mk001 g2d; strict g2d -c "$SHADOWCAT" >/dev/null
  gc "GAP2 look-alike pg_constraint/pg_trigger/pg_attribute tables ahead of pg_catalog: apply still validates and rewrites the real definitions" "$(and "$(ok g2d "$(wrap g2d "$APPLY")")" "$(psqlx g2d -c "$PUB6")")"
  strict g2d -c "$POP" >/dev/null 2>&1; strict g2d -c "$UNLINK" >/dev/null 2>&1
  gc "GAP2 look-alike catalog tables: rollback also validates the real definitions and restores SET NULL" "$(and "$(ok g2d "$(wrap g2d "$RB")")" "$(chk_actions g2d "$ALLSETNULL")")"
  enddb g2d
  mk001 g2e; out="$(strict g2e -f "$(tempwrap g2e "$APPLY")" 2>&1 || true)"
  gc "GAP2 apply with TEMP look-alikes (always first in resolution): public holds the six RESTRICT references and the temp relations are untouched" "$(and "$(psqlx g2e -c "$PUB6")" "$(echo "$out" | grep -q 'TEMPUNTOUCHED|t' && echo 1 || echo 0)")"
  strict g2e -c "$POP" >/dev/null 2>&1; strict g2e -c "$UNLINK" >/dev/null 2>&1
  out="$(strict g2e -f "$(tempwrap g2f "$RB")" 2>&1 || true)"
  gc "GAP2 rollback with TEMP look-alikes: public returns to SET NULL and the temp relations are untouched" "$(and "$(chk_actions g2e "$ALLSETNULL")" "$(echo "$out" | grep -q 'TEMPUNTOUCHED|t' && echo 1 || echo 0)")"
  enddb g2e
  echo "GAPRESULT $GP $GT"
}
gout="$(gap_run "$tmp/ref.sql" "$tmp/ref_rb.sql")"
echo "$gout" | grep '^GAPFAIL' | sed 's/^GAPFAIL: /FAIL: /' || true
gres="$(echo "$gout" | grep '^GAPRESULT' | tail -1)"; gap_pass="$(echo "$gres" | cut -d' ' -f2)"; gap_total="$(echo "$gres" | cut -d' ' -f3)"
[ -n "$gres" ] || { echo "FAIL: gap scenarios did not finish"; gap_pass=0; gap_total=1; }
pass=$((pass+gap_pass)); total=$((total+gap_total))

# negative controls isolating each v2 correction: the SAME gap scenarios must fail on a proposal with that one correction removed
gneg_pass=0; gneg_total=0
gapneg() {   # name, which (ref|rb), sed script, substring of the failing scenario
  local name="$1" which="$2" script="$3" expect="$4" a="$tmp/ref.sql" r="$tmp/ref_rb.sql" src o; gneg_total=$((gneg_total+1))
  if [ "$which" = ref ]; then src="$tmp/ref.sql"; else src="$tmp/ref_rb.sql"; fi
  sed "$script" "$src" > "$tmp/g_$name.sql"; cmp -s "$src" "$tmp/g_$name.sql" && { echo "FAIL: mutant $name changed nothing (vacuous control)"; return; }
  chmod 644 "$tmp/g_$name.sql"; if [ "$which" = ref ]; then a="$tmp/g_$name.sql"; else r="$tmp/g_$name.sql"; fi
  o="$(gap_run "$a" "$r" 2>&1)"
  if echo "$o" | grep -q '^GAPRESULT' && echo "$o" | grep '^GAPFAIL' | grep -qF -- "$expect"; then gneg_pass=$((gneg_pass+1)); else echo "FAIL: gap negative control $name was NOT caught (expected a failing scenario containing: $expect)"; echo "$o" | grep '^GAPFAIL\|^GAPRESULT' | head -4 | sed 's/^/    /'; fi
}
gapneg c1a_link_check_nested_in_guard_test rb "s/^  IF has_links THEN\$/  IF has_links AND guard_installed THEN/" 'GAP1a'
gapneg c1b_guard_detected_by_trigger_name rb "s/t.tgfoid = guard_fn::oid AND NOT t.tgisinternal);/t.tgname = 'legal_cases_guard' AND NOT t.tgisinternal);/" 'GAP1b'
gapneg c1c_unexpected_trigger_state_not_refused rb "/IF EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid = 'public.legal_cases'::regclass AND t.tgname/,/^  END IF;/d" 'GAP1c'
gapneg c2a_apply_lock_unqualified ref "s/LOCK TABLE public\.legal_cases, public\.legal_matter_properties/LOCK TABLE legal_cases, legal_matter_properties/" 'GAP2 look-alike SEQUENCES'
gapneg c2b_apply_alter_drop_unqualified ref "s/ALTER TABLE public\.%I DROP CONSTRAINT %I/ALTER TABLE %I DROP CONSTRAINT %I/" 'GAP2 apply (look-alike schema first)'
gapneg c2c_apply_alter_add_unqualified ref "s/ALTER TABLE public\.%I ADD CONSTRAINT/ALTER TABLE %I ADD CONSTRAINT/" 'GAP2 apply (look-alike schema first)'
gapneg c2d_apply_references_unqualified ref "s/REFERENCES public\.%I (id_uuid)/REFERENCES %I (id_uuid)/" 'GAP2 apply (look-alike schema first)'
gapneg c2e_apply_catalog_unqualified ref "s/pg_catalog\.pg_constraint/pg_constraint/g" 'GAP2 look-alike pg_constraint'
gapneg c2f_rollback_legal_cases_count_unqualified rb "s/FROM public\.legal_cases WHERE %I IS NOT NULL/FROM legal_cases WHERE %I IS NOT NULL/" 'GAP2 populated-row check'
gapneg c2g_rollback_link_count_unqualified rb "s/FROM public\.legal_matter_properties WHERE %I IS NOT NULL/FROM legal_matter_properties WHERE %I IS NOT NULL/" 'GAP2 populated LINK check'
gapneg c2h_rollback_alter_add_unqualified rb "s/ALTER TABLE public\.%I ADD CONSTRAINT/ALTER TABLE %I ADD CONSTRAINT/" 'GAP2 rollback (look-alike schema first)'
gapneg c2i_rollback_lock_unqualified rb "s/LOCK TABLE public\.legal_cases IN/LOCK TABLE legal_cases IN/" 'GAP2 look-alike SEQUENCES'

echo "[legal-reference-protection-db] main ${main_pass}/${main_total}, negative controls $neg_pass/$neg_total, v2 gap-correction controls $gneg_pass/$gneg_total, existing-suite / apply-refusal / rollback / gap checks $pass/$total (gap scenarios ${gap_pass}/${gap_total})"
if [ "$main_pass" = "$main_total" ] && [ "$main_total" -gt 0 ] && [ "$neg_pass" = "$neg_total" ] && [ "$neg_total" -gt 0 ] && [ "$gneg_pass" = "$gneg_total" ] && [ "$gneg_total" -gt 0 ] && [ "$pass" = "$total" ] && [ "$total" -gt 0 ]; then echo "[legal-reference-protection-db] PASS (reconstruction proof only; not installed/live proof)"; else echo "[legal-reference-protection-db] FAIL"; exit 1; fi
