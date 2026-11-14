#!/usr/bin/env bash
# Combined L1 (legal) + D1 (documents) rehearsal on ONE private PostgreSQL 16 reconstruction. Never touches a real database,
# reads no business rows and uses no credentials: a throwaway cluster on a private unix socket, synthetic rows only.
# This is RECONSTRUCTION proof. It is not installed/live proof and does not establish that the live catalog matches baseline.sql.
set -euo pipefail
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done      # never inherit connection settings
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../.."; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[legal-documents-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$here"/*.sql "$tmp"/
cp "$root/docs/legal/schema/001_native_legal_foundation.proposal.sql" "$tmp/legal.sql"
cp "$root/docs/legal/schema/001_native_legal_foundation.rollback.proposal.sql" "$tmp/legal_rb.sql"
cp "$root/docs/documents/schema/001_document_registry.proposal.sql" "$tmp/documents.sql"
cp "$root/docs/documents/schema/001_document_registry.rollback.proposal.sql" "$tmp/documents_rb.sql"
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
# Roles are cluster-wide: every scenario drops its database, then both runtime roles, before the next one starts.
enddb() { psqlx postgres -c "DROP DATABASE IF EXISTS $1" >/dev/null; psqlx postgres -c "DROP ROLE IF EXISTS ecc_legal_runtime" >/dev/null 2>&1 || true; psqlx postgres -c "DROP ROLE IF EXISTS ecc_documents_runtime" >/dev/null 2>&1 || true; }
both() { strict "$1" -f "$tmp/${2:-legal}.sql" >/dev/null; strict "$1" -f "$tmp/${3:-documents}.sql" >/dev/null; }
fpq() { local db="$1" t="$2" f="$3"; psqlx "$db" -v tables="$t" -v funcs="$f" -f "$tmp/fp.sql"; }
ALL='^[a-z]'; FALL='^(legal_|document_)'
# a command that MUST be refused: returns 0 only if psql failed AND its stderr contains the expected reason
refused() { local db="$1" file="$2" pat="$3" err; if err="$(strict "$db" -f "$file" 2>&1 >/dev/null)"; then echo 0; else echo "$err" | grep -Eq "$pat" && echo 1 || { echo "  (unexpected refusal text: $err)" >&2; echo 0; }; fi; }

# ---------------------------------------------------------------- 1) main combined proof (L1 then D1)
newdb main
out="$(psqlx main -v legal="$tmp/legal.sql" -v documents="$tmp/documents.sql" -f "$tmp/tests.sql" 2>&1 || true)"
main_last="$(echo "$out" | tail -1)"; main_fail="$(echo "$out" | sed '$d' | grep -v '^$' || true)"
[ -n "$main_fail" ] && echo "$main_fail" | sed 's/^/MAIN FAIL: /'
if echo "$main_last" | grep -Eq '^[0-9]+\|[0-9]+$'; then main_pass="${main_last%%|*}"; main_total="${main_last##*|}"; else echo "MAIN FAIL: suite did not finish (last line: $main_last)"; main_pass=0; main_total=1; fi
enddb main

# ---------------------------------------------------------------- 2) negative controls: a broken boundary MUST be caught by the SAME suite
neg_pass=0; neg_total=0
negctl() {   # name, which proposal (legal|documents), sed-script, expected failing-check substring
  local name="$1" which="$2" script="$3" expect="$4" db="neg_${1}" lf="$tmp/legal.sql" df="$tmp/documents.sql" o p t
  if [ "$which" = legal ]; then sed "$script" "$tmp/legal.sql" > "$tmp/m_$name.sql"; cmp -s "$tmp/legal.sql" "$tmp/m_$name.sql" && { echo "FAIL: mutant $name did not change the proposal (vacuous control)"; neg_total=$((neg_total+1)); return; }; lf="$tmp/m_$name.sql"
  else sed "$script" "$tmp/documents.sql" > "$tmp/m_$name.sql"; cmp -s "$tmp/documents.sql" "$tmp/m_$name.sql" && { echo "FAIL: mutant $name did not change the proposal (vacuous control)"; neg_total=$((neg_total+1)); return; }; df="$tmp/m_$name.sql"; fi
  newdb "$db"
  o="$(psqlx "$db" -v legal="$lf" -v documents="$df" -f "$tmp/tests.sql" 2>&1 || true)"
  p="${o##*$'\n'}"; neg_total=$((neg_total+1))
  if ! echo "$p" | grep -Eq '^[0-9]+\|[0-9]+$'; then echo "FAIL: negative control $name did not finish cleanly (a crash is not a catch): $p"; enddb "$db"; return; fi
  t="${p##*|}"; p="${p%%|*}"
  if echo "$o" | sed '$d' | grep -qF -- "$expect" && [ "$p" -lt "$t" ]; then neg_pass=$((neg_pass+1)); else echo "FAIL: negative control $name was NOT caught (expected failing check containing: $expect) -> ${p}/${t}"; fi
  enddb "$db"
}
negctl m1_documents_role_reaches_legal documents '$ s/^COMMIT;$/GRANT SELECT ON legal_awards TO ecc_documents_runtime;\nCOMMIT;/' 'EXACTLY SELECT on the four D1 tables'
negctl m2_financial_tax_check_removed  documents "/CHECK (section <> 'financial-tax'/d" 'financial-tax section can never be general'
negctl m3_legal_role_bypasses_rls      legal     's/NOLOGIN NOBYPASSRLS/NOLOGIN BYPASSRLS/' 'NOBYPASSRLS'
negctl m4_documents_policy_opens_d1    documents '$ s/^COMMIT;$/CREATE POLICY leak ON document_records FOR SELECT TO ecc_documents_runtime USING (true);\nCOMMIT;/' 'default-deny (RLS on, no policy)'
negctl m5_legal_keeps_anon_grants      legal     "/REVOKE ALL ON %I FROM anon/d" 'anon, authenticated and PUBLIC hold nothing'
negctl m6_legal_same_matter_fk_dropped legal     's/^  FOREIGN KEY (party_id, matter_id) REFERENCES legal_parties(id, matter_id) ON DELETE RESTRICT$/  FOREIGN KEY (party_id) REFERENCES legal_parties(id) ON DELETE RESTRICT/' 'cannot join an award to a party of ANOTHER matter'

# ---------------------------------------------------------------- 3) rollback rehearsal (L1 rollback = PARTIAL cleanup; D1 rollback = exact removal when empty)
build() { newdb "$1"; both "$1"; strict "$1" -f "$tmp/populate.sql" >/dev/null; }
l1fp() { fpq "$1" '^(legal_|case_)' '^legal_' | grep -v ecc_documents_runtime; }
d1fp() { fpq "$1" '^document_' '^document_' | grep -v ecc_legal_runtime; }
nonl1() { fpq "$1" '^(owners|properties|property_owners|units|tenants|leases|files|files_new|legacy_staging)$' '^$' | grep -v '^role\|^member\|^dep'; }
asserts() { local out; out="$(strict "$1" -v scenario="$2" -f "$tmp/rb_assert.sql" 2>&1)"; local n f; n="$(echo "$out" | grep -c '|' || true)"; f="$(echo "$out" | grep -c '|f$' || true)"
  total=$((total+n)); pass=$((pass+n-f)); [ "$f" -gt 0 ] && echo "$out" | grep -v '|t$' | sed "s/^/FAIL (rollback scenario $2): /" || true; }

# rb1: populated both -> each rollback refuses and changes NOTHING
build rb1; base="$(nonl1 rb1)"; before="$(fpq rb1 "$ALL" "$FALL")"
chk "L1 rollback refuses while populated (legal custody)" "$(refused rb1 "$tmp/legal_rb.sql" 'rollback refused: legal_[a-z_]+ holds [0-9]+ rows')"
chk "D1 rollback refuses while populated (custody)"       "$(refused rb1 "$tmp/documents_rb.sql" 'rollback refused: document_[a-z_]+ holds [0-9]+ rows')"
chk "refused rollbacks changed nothing (structure, ACLs, policies, roles, row counts)" "$([ "$before" = "$(fpq rb1 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
enddb rb1

# rb2: documents emptied, legal populated -> D1 rollback succeeds and is independent of L1; L1 rollback still refuses
build rb2; strict rb2 -c "TRUNCATE document_records, document_property_links, document_versions, document_deliveries" >/dev/null
l1_before="$(l1fp rb2)"
chk "D1 rollback succeeds on empty D1 tables while L1 is populated" "$(strict rb2 -f "$tmp/documents_rb.sql" >/dev/null 2>&1 && echo 1 || echo 0)"
chk "D1 rollback left every L1 object and row untouched" "$([ "$l1_before" = "$(l1fp rb2)" ] && echo 1 || echo 0)"
asserts rb2 2
l1_before="$(fpq rb2 "$ALL" "$FALL")"
chk "L1 rollback still refuses while populated (after D1 is gone)" "$(refused rb2 "$tmp/legal_rb.sql" 'rollback refused: legal_[a-z_]+ holds [0-9]+ rows')"
chk "refused L1 rollback changed nothing" "$([ "$l1_before" = "$(fpq rb2 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
enddb rb2

# rb3: legal child tables emptied, documents populated -> L1 rollback succeeds as PARTIAL cleanup; D1 untouched; D1 rollback refuses
build rb3
strict rb3 -c "DELETE FROM legal_award_obligors; DELETE FROM legal_evidence_refs; DELETE FROM legal_evidence_requirements; DELETE FROM legal_awards; DELETE FROM legal_parties; DELETE FROM legal_matter_properties; DELETE FROM legal_source_links" >/dev/null
d1_before="$(d1fp rb3)"; base="$(nonl1 rb3)"
chk "L1 rollback succeeds on empty L1 child tables while D1 is populated" "$(strict rb3 -f "$tmp/legal_rb.sql" >/dev/null 2>&1 && echo 1 || echo 0)"
chk "L1 rollback left every D1 object and row untouched" "$([ "$d1_before" = "$(d1fp rb3)" ] && echo 1 || echo 0)"
chk "L1 rollback left the untouched baseline tables identical" "$([ "$base" = "$(nonl1 rb3)" ] && echo 1 || echo 0)"
asserts rb3 3
chk "L1 partial rollback is NOT a restoration: legal tables differ from the pre-L1 baseline" "$(strict rb3 -c "select (count(*)>=1)::int from information_schema.columns where table_name='legal_cases' and column_name='scope_ref'" | tail -1)"
d1_before="$(fpq rb3 "$ALL" "$FALL")"
chk "D1 rollback still refuses while populated (after L1 is gone)" "$(refused rb3 "$tmp/documents_rb.sql" 'rollback refused: document_[a-z_]+ holds [0-9]+ rows')"
chk "refused D1 rollback changed nothing" "$([ "$d1_before" = "$(fpq rb3 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
enddb rb3

# rb4: both empty -> D1 rollback is an EXACT inverse of the D1 apply; then L1 rollback leaves only the documented residual
newdb rb4; base="$(nonl1 rb4)"; legal_pre="$(fpq rb4 '^(legal_cases|legal_case_events|case_history|case_tags)$' '^$' | grep -v '^role\|^member\|^dep')"
strict rb4 -f "$tmp/legal.sql" >/dev/null; after_l1="$(fpq rb4 "$ALL" "$FALL")"
strict rb4 -f "$tmp/documents.sql" >/dev/null
chk "D1 rollback on empty tables succeeds" "$(strict rb4 -f "$tmp/documents_rb.sql" >/dev/null 2>&1 && echo 1 || echo 0)"
chk "D1 rollback is an exact inverse of D1 apply (whole-schema fingerprint equals the post-L1 state)" "$([ "$after_l1" = "$(fpq rb4 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
chk "L1 rollback on empty tables succeeds" "$(strict rb4 -f "$tmp/legal_rb.sql" >/dev/null 2>&1 && echo 1 || echo 0)"
chk "after both rollbacks the untouched baseline tables are byte-identical to the original baseline" "$([ "$base" = "$(nonl1 rb4)" ] && echo 1 || echo 0)"
chk "after both rollbacks the legacy legal tables are NOT the original baseline (partial cleanup, not restoration)" "$([ "$legal_pre" != "$(fpq rb4 '^(legal_cases|legal_case_events|case_history|case_tags)$' '^$' | grep -v '^role\|^member\|^dep')" ] && echo 1 || echo 0)"
asserts rb4 4
enddb rb4

# ---------------------------------------------------------------- 4) role custody across the two proposals
custody_pass=0; custody_total=0
cchk() { custody_total=$((custody_total+1)); if [ "$2" = "1" ]; then custody_pass=$((custody_pass+1)); else echo "CUSTODY FAIL: $1"; fi; }
# c1: L1 refuses a PRE-EXISTING legal role; nothing created
newdb c1; psqlx c1 -c "CREATE ROLE ecc_legal_runtime NOLOGIN; CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_legal_runtime" >/dev/null
cchk "L1 refuses a preexisting ecc_legal_runtime" "$(refused c1 "$tmp/legal.sql" 'already exists; refusing to adopt')"
cchk "refused L1 created no legal table and left the sentinel" "$(psqlx c1 -c "select (not exists (select 1 from pg_tables where tablename='legal_parties') and exists (select 1 from pg_tables where tablename='sentinel_owned' and tableowner='ecc_legal_runtime'))::int")"
enddb c1
# c2: D1 refuses a PRE-EXISTING documents role AFTER L1 is installed; L1 untouched
newdb c2; strict c2 -f "$tmp/legal.sql" >/dev/null; l1_before="$(fpq c2 "$ALL" "$FALL")"
psqlx c2 -c "CREATE ROLE ecc_documents_runtime NOLOGIN; CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_documents_runtime" >/dev/null
l1_before="$(fpq c2 "$ALL" "$FALL")"
cchk "D1 refuses a preexisting ecc_documents_runtime (L1 already installed)" "$(refused c2 "$tmp/documents.sql" 'already exists; refusing to adopt')"
cchk "refused D1 created no document table, changed nothing in L1 and left the sentinel" "$(psqlx c2 -c "select (not exists (select 1 from pg_tables where tablename like 'document\\_%') and exists (select 1 from pg_tables where tablename='sentinel_owned' and tableowner='ecc_documents_runtime'))::int")"
cchk "refused D1 left the whole schema fingerprint unchanged" "$([ "$l1_before" = "$(fpq c2 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
enddb c2
# c3/c4: a cross-role privilege is a custody violation that BOTH rollbacks must refuse (and must not silently revoke)
newdb c3; both c3
psqlx c3 -c "GRANT SELECT ON document_records TO ecc_legal_runtime" >/dev/null; b="$(fpq c3 "$ALL" "$FALL")"
cchk "L1 rollback refuses when ecc_legal_runtime holds a D1 privilege (role custody)" "$(refused c3 "$tmp/legal_rb.sql" 'role custody')"
cchk "refused L1 rollback changed nothing and the cross-role grant is still there to be seen" "$([ "$b" = "$(fpq c3 "$ALL" "$FALL")" ] && [ "$(psqlx c3 -c "select has_table_privilege('ecc_legal_runtime','document_records','select')::int")" = 1 ] && echo 1 || echo 0)"
enddb c3
newdb c4; both c4
psqlx c4 -c "GRANT SELECT ON legal_awards TO ecc_documents_runtime" >/dev/null; b="$(fpq c4 "$ALL" "$FALL")"
cchk "D1 rollback refuses when ecc_documents_runtime holds an L1 privilege (role custody)" "$(refused c4 "$tmp/documents_rb.sql" 'role custody')"
cchk "refused D1 rollback changed nothing and the cross-role grant is still there to be seen" "$([ "$b" = "$(fpq c4 "$ALL" "$FALL")" ] && [ "$(psqlx c4 -c "select has_table_privilege('ecc_documents_runtime','legal_awards','select')::int")" = 1 ] && echo 1 || echo 0)"
enddb c4
# c5: a role that OWNS an unrelated object blocks the rollback (no DROP OWNED), for the documents role too
newdb c5; both c5; psqlx c5 -c "CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_documents_runtime" >/dev/null; b="$(fpq c5 "$ALL" "$FALL")"
cchk "D1 rollback refuses when its role owns an unrelated object" "$(refused c5 "$tmp/documents_rb.sql" 'role custody')"
cchk "refused D1 rollback changed nothing (tables, role, sentinel)" "$([ "$b" = "$(fpq c5 "$ALL" "$FALL")" ] && echo 1 || echo 0)"
enddb c5

# ---------------------------------------------------------------- 5) exact reproduction of the reported L1-vs-baseline incompatibility (L1 only, no D1)
repro_pass=0; repro_total=0
rchk() { repro_total=$((repro_total+1)); if [ "$2" = "1" ]; then repro_pass=$((repro_pass+1)); else echo "REPRO FAIL: $1"; fi; }
newdb repro
ins() { printf "insert into properties(id,name,id_uuid) values (%s,'x','00000000-0000-4000-8000-0000000000%s'); insert into legal_cases(case_number,case_type,status,property_id) values ('%s','other','draft','00000000-0000-4000-8000-0000000000%s');" "$1" "$1" "$2" "$1"; }
strict repro -c "$(ins 91 R1)" >/dev/null; strict repro -c "delete from properties where id=91" >/dev/null
rchk "baseline (no L1): deleting a referenced property nulls legal_cases.property_id" "$(psqlx repro -c "select (property_id is null)::int from legal_cases where case_number='R1'")"
strict repro -f "$tmp/legal.sql" >/dev/null
strict repro -c "$(ins 92 R2)" >/dev/null
rerr="$(strict repro -c "delete from properties where id=92" 2>&1 >/dev/null || true)"
rchk "L1 only (D1 NOT installed): the same delete is refused with 40001 'stale or omitted revision'" "$(echo "$rerr" | grep -q 'legal: stale or omitted revision (expected 2, got 1)' && echo 1 || echo 0)"
rchk "L1 only: the referenced property row and the case reference both survive the refused delete" "$(psqlx repro -c "select (exists (select 1 from properties where id=92) and (select property_id is not null from legal_cases where case_number='R2'))::int")"
enddb repro

# ---------------------------------------------------------------- informational: the reverse apply order (NOT counted; the documented order is L1 then D1)
newdb rev; if strict rev -f "$tmp/documents.sql" >/dev/null 2>&1 && strict rev -f "$tmp/legal.sql" >/dev/null 2>&1; then rev="applies cleanly"; else rev="FAILS"; fi; enddb rev
echo "[info] reverse order (D1 then L1) $rev; not part of the pass totals"

echo "[legal-documents-db] main ${main_pass:-0}/${main_total:-0}, negative controls $neg_pass/$neg_total, rollback $pass/$total, role custody $custody_pass/$custody_total, known-incompatibility reproduction $repro_pass/$repro_total"
if [ "${main_pass:-0}" = "${main_total:-x}" ] && [ "${main_total:-0}" -gt 0 ] && [ "$neg_pass" = "$neg_total" ] && [ "$neg_total" -gt 0 ] && [ "$pass" = "$total" ] && [ "$total" -gt 0 ] && [ "$custody_pass" = "$custody_total" ] && [ "$custody_total" -gt 0 ] && [ "$repro_pass" = "$repro_total" ] && [ "$repro_total" -gt 0 ]; then
  echo "[legal-documents-db] PASS (reconstruction proof only; not installed/live proof)"; else echo "[legal-documents-db] FAIL"; exit 1; fi
