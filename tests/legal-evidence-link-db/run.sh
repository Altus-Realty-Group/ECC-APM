#!/usr/bin/env bash
# Proof for docs/legal/schema/003_legal_evidence_linkage.{proposal,rollback.proposal}.sql on a private PostgreSQL 16 reconstruction (the corrected combined
# baseline from tests/legal-documents-db: 001, D1, 002, then 003). Throwaway cluster, synthetic rows, no credentials, no real database.
# RECONSTRUCTION proof only: not installed/live proof, and SQL integrity is NOT document authorization (that gate stays open).
set -euo pipefail
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../.."; comb="$root/tests/legal-documents-db"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[legal-evidence-link-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$comb/baseline.sql" "$comb/fp.sql" "$here/tests.sql" "$here/fixtures.sql" "$here/shadow.sql" "$tmp/"
S="$root/docs/legal/schema"; D="$root/docs/documents/schema"
cp "$S/001_native_legal_foundation.proposal.sql" "$tmp/legal.sql"; cp "$S/001_native_legal_foundation.rollback.proposal.sql" "$tmp/legal_rb.sql"
cp "$S/002_legal_reference_protection.proposal.sql" "$tmp/ref.sql"; cp "$S/002_legal_reference_protection.rollback.proposal.sql" "$tmp/ref_rb.sql"
cp "$S/003_legal_evidence_linkage.proposal.sql" "$tmp/link.sql"; cp "$S/003_legal_evidence_linkage.rollback.proposal.sql" "$tmp/link_rb.sql"
cp "$D/001_document_registry.proposal.sql" "$tmp/documents.sql"; cp "$D/001_document_registry.rollback.proposal.sql" "$tmp/documents_rb.sql"
chmod 644 "$tmp"/*.sql
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
export PGOPTIONS=--client-min-messages=warning
psqlx() { local db="$1"; shift; as "$bin/psql" -h "$tmp" -d "$db" -X -q -t -A "$@"; }
strict() { local db="$1"; shift; psqlx "$db" -v ON_ERROR_STOP=1 "$@"; }
newdb() { psqlx postgres -c "CREATE DATABASE $1" >/dev/null; psqlx "$1" -v ON_ERROR_STOP=1 -f "$tmp/baseline.sql" >/dev/null; }
enddb() { psqlx postgres -c "DROP DATABASE IF EXISTS $1" >/dev/null; psqlx postgres -c "DROP ROLE IF EXISTS ecc_legal_runtime" >/dev/null 2>&1 || true; psqlx postgres -c "DROP ROLE IF EXISTS ecc_documents_runtime" >/dev/null 2>&1 || true; }
fpall() { psqlx "$1" -v tables='^[a-z]' -v funcs='^(legal_|document_)' -f "$tmp/fp.sql"; }
and() { local x; for x in "$@"; do [ "$x" = 1 ] || { echo 0; return; }; done; echo 1; }
eq() { [ "$1" = "$2" ] && echo 1 || echo 0; }
refused() { local db="$1" file="$2" pat="$3" err; if err="$(strict "$db" -f "$file" 2>&1 >/dev/null)"; then echo 0; else echo "$err" | grep -Eq "$pat" && echo 1 || { echo "  (unexpected refusal text: $err)" >&2; echo 0; }; fi; }
okf() { strict "$1" -f "$2" >/dev/null 2>&1 && echo 1 || echo 0; }
EA='00000000-0000-4000-8000-0000000f0a01'; V1='00000000-0000-4000-8000-0000000001a1'; V2='00000000-0000-4000-8000-0000000001a2'
E1='00000000-0000-4000-8000-00000000e001'; E2='00000000-0000-4000-8000-00000000e002'
# run SQL as the scoped runtime role (scope A, actor set); prints the last output line; errors come back as ERR:<message>
rt() { local db="$1" sql="$2" scope="${3:-scopeA}" actor="${4-tester}" o; o="$(psqlx "$db" -v ON_ERROR_STOP=1 -c "BEGIN; SET LOCAL ROLE ecc_legal_runtime; SELECT set_config('ecc.scope_refs','$scope',true); SELECT set_config('ecc.actor','$actor',true); SELECT set_config('ecc.restricted_evidence','on',true); $sql; COMMIT;" 2>&1)" && echo "$o" | tail -1 || echo "ERR:$(echo "$o" | grep -m1 ERROR)"; }
base_build() { newdb "$1"; strict "$1" -f "$tmp/legal.sql" >/dev/null; strict "$1" -f "$tmp/documents.sql" >/dev/null; strict "$1" -f "$tmp/ref.sql" >/dev/null; }
fixtures() { strict "$1" -f "$tmp/fixtures.sql" >/dev/null; }
newrefs() { strict "$1" -c "INSERT INTO legal_evidence_refs (id, matter_id, requirement_id, ref_kind, storage_ref) VALUES ('00000000-0000-4000-8000-00000000e101','$EA','00000000-0000-4000-8000-00000000a301','doc','n1'),('00000000-0000-4000-8000-00000000e103','$EA','00000000-0000-4000-8000-00000000a302','doc','n3')" >/dev/null; }
mkfull() { base_build "$1"; fixtures "$1"; strict "$1" -f "${2:-$tmp/link.sql}" >/dev/null; newrefs "$1"; }
GP=0; GT=0; GFAILS=""
gc() { GT=$((GT+1)); if [ "$2" = "1" ]; then GP=$((GP+1)); else GFAILS="$GFAILS
FAIL: $1"; echo "FAIL: $1"; fi; }

# ================================================================ groups; each takes APPLY and ROLLBACK proposal files (mutants substitute one)
grp_main() {   # the combined-state suite (35 checks)
  local o last; o="$(newdb gm_ >/dev/null; psqlx gm_ -v legal="$tmp/legal.sql" -v documents="$tmp/documents.sql" -v ref="$tmp/ref.sql" -v link="$1" -v fixtures="$tmp/fixtures.sql" -f "$tmp/tests.sql" 2>&1 || true)"; enddb gm_
  last="$(echo "$o" | tail -1)"; echo "$o" | sed '$d' | { grep -v '^$' || true; } | sed 's/^/FAIL: MAIN: /'
  if echo "$last" | grep -Eq '^[0-9]+\|[0-9]+$'; then GP=$((GP+${last%%|*})); GT=$((GT+${last##*|})); else echo "FAIL: MAIN suite did not finish ($last)"; GT=$((GT+1)); fi
}
grp_apply_refusals() {
  local A="$1" b
  refuse() { # name setup-sql pattern
    base_build ar; fixtures ar; [ -n "${2:-}" ] && strict ar -c "$2" >/dev/null; b="$(fpall ar)"
    gc "003 apply refuses: $1" "$(refused ar "$A" "$3")"; gc "refused apply changed nothing ($1)" "$(eq "$b" "$(fpall ar)")"; enddb ar; }
  newdb ar; strict ar -f "$tmp/legal.sql" >/dev/null; strict ar -f "$tmp/documents.sql" >/dev/null; gc "003 apply refuses when 002 is not applied" "$(refused ar "$A" 'apply 002_legal_reference_protection first')"; enddb ar
  newdb ar; strict ar -f "$tmp/legal.sql" >/dev/null; gc "003 apply refuses when the D1 registry is missing" "$(refused ar "$A" 'apply the D1 document registry first')"; enddb ar
  newdb ar; gc "003 apply refuses when 001 is missing" "$(refused ar "$A" 'apply 001_native_legal_foundation first')"; enddb ar
  base_build ar; fixtures ar; strict ar -f "$A" >/dev/null; gc "a second apply is refused (already applied)" "$(refused ar "$A" 'already applied or partially present')"; enddb ar
  refuse "the 001 journal dimension CHECK is missing" "ALTER TABLE legal_case_events DROP CONSTRAINT legal_case_events_dimension_check" 'journal dimension CHECK is not exactly the five 001 values'
  refuse "the journal policy is not the 001 policy" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (true) WITH CHECK (true)" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "partial 002: legal_cases.unit_id is still ON DELETE SET NULL (one RESTRICT reference is not proof that 002 is installed)" "ALTER TABLE legal_cases DROP CONSTRAINT legal_cases_unit_id_fkey; ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id_uuid) ON DELETE SET NULL" 'is not the RESTRICT reference 002 produces'
  refuse "partial 002: the link-table lease reference is still ON DELETE SET NULL" "ALTER TABLE legal_matter_properties DROP CONSTRAINT legal_matter_properties_lease_id_fkey; ALTER TABLE legal_matter_properties ADD CONSTRAINT legal_matter_properties_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id_uuid) ON DELETE SET NULL" 'is not the RESTRICT reference 002 produces'
  refuse "a 002 reference that is RESTRICT but DEFERRABLE" "ALTER TABLE legal_cases DROP CONSTRAINT legal_cases_tenant_id_fkey; ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id_uuid) ON DELETE RESTRICT DEFERRABLE" 'is not the RESTRICT reference 002 produces'
  newdb ar; strict ar -f "$tmp/legal.sql" >/dev/null; strict ar -f "$tmp/documents.sql" >/dev/null; fixtures ar
  strict ar -c "ALTER TABLE legal_cases DROP CONSTRAINT legal_cases_property_id_fkey; ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id_uuid) ON DELETE RESTRICT" >/dev/null; b="$(fpall ar)"
  gc "003 apply refuses when ONLY ONE qualifying property RESTRICT reference exists (002 itself was never applied)" "$(refused ar "$A" 'is not the RESTRICT reference 002 produces')"; gc "refused apply changed nothing (only-one-property-FK)" "$(eq "$b" "$(fpall ar)")"; enddb ar
  refuse "the revision trigger is missing" "DROP TRIGGER legal_evidence_refs_guard ON legal_evidence_refs" 'expected exactly one trigger bound to legal_evidence_guard'
  refuse "the revision trigger is DISABLED" "ALTER TABLE legal_evidence_refs DISABLE TRIGGER legal_evidence_refs_guard" 'revision trigger is not an enabled BEFORE UPDATE row trigger'
  refuse "the revision trigger is ENABLE REPLICA (does not fire in the origin session)" "ALTER TABLE legal_evidence_refs ENABLE REPLICA TRIGGER legal_evidence_refs_guard" 'revision trigger is not an enabled BEFORE UPDATE row trigger'
  refuse "the revision trigger is wrongly bound to another trigger function" "DROP TRIGGER legal_evidence_refs_guard ON legal_evidence_refs; CREATE TRIGGER legal_evidence_refs_guard BEFORE UPDATE ON legal_evidence_refs FOR EACH ROW EXECUTE FUNCTION public.legal_matter_id_immutable()" 'expected exactly one trigger bound to legal_evidence_guard'
  refuse "the revision trigger was reshaped to AFTER UPDATE" "DROP TRIGGER legal_evidence_refs_guard ON legal_evidence_refs; CREATE TRIGGER legal_evidence_refs_guard AFTER UPDATE ON legal_evidence_refs FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_guard()" 'revision trigger is not an enabled BEFORE UPDATE row trigger'
  refuse "the journal policy WITH CHECK was changed to false (the original restriction must be refused, not replaced)" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)) AND (dimension IS DISTINCT FROM 'evidence_confidence' OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id))) WITH CHECK (false)" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "the journal policy USING was changed to true" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (true) WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)))" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "the journal policy lost its evidence-subject mask" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref))) WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)))" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "the journal policy WITH CHECK no longer requires scope (true)" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)) AND (dimension IS DISTINCT FROM 'evidence_confidence' OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id))) WITH CHECK (true)" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "an extra journal policy exists" "CREATE POLICY zz_extra ON legal_case_events FOR SELECT TO ecc_legal_runtime USING (true)" 'legal_case_events_rt is not exactly the 001 journal policy'
  refuse "the dimension CHECK allows an extra value" "ALTER TABLE legal_case_events DROP CONSTRAINT legal_case_events_dimension_check; ALTER TABLE legal_case_events ADD CONSTRAINT legal_case_events_dimension_check CHECK (dimension IS NULL OR dimension IN ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','other','smuggled'))" 'journal dimension CHECK is not exactly the five 001 values'
  refuse "the dimension CHECK lost a value" "ALTER TABLE legal_case_events DROP CONSTRAINT legal_case_events_dimension_check; ALTER TABLE legal_case_events ADD CONSTRAINT legal_case_events_dimension_check CHECK (dimension IS NULL OR dimension IN ('lifecycle','judgment_verification','collection_readiness','evidence_confidence'))" 'journal dimension CHECK is not exactly the five 001 values'
  refuse "the dimension CHECK was weakened to true" "ALTER TABLE legal_case_events DROP CONSTRAINT legal_case_events_dimension_check; ALTER TABLE legal_case_events ADD CONSTRAINT legal_case_events_dimension_check CHECK (true)" 'journal dimension CHECK is not exactly the five 001 values'
  # the stated attack: disable the revision trigger, then try to apply 003 and attach with no revision bump
  base_build ar; fixtures ar; strict ar -c "ALTER TABLE legal_evidence_refs DISABLE TRIGGER legal_evidence_refs_guard" >/dev/null
  gc "003 refuses to install over a DISABLED revision trigger" "$(refused ar "$A" 'revision trigger is not an enabled BEFORE UPDATE row trigger')"
  o="$(strict ar -c "BEGIN; SELECT set_config('ecc.actor','tester',true); UPDATE legal_evidence_refs SET document_version_id='$V1' WHERE id='$E1'; COMMIT" 2>&1 || true)"
  gc "so the direct attachment UPDATE with no revision bump cannot succeed: there is no binding column and the row is unchanged" "$(and "$(echo "$o" | grep -q 'document_version_id' && echo 1 || echo 0)" "$([ "$(psqlx ar -c "select revision from legal_evidence_refs where id='$E1'")" = 1 ] && echo 1 || echo 0)")"
  enddb ar
  refuse "a partial earlier apply left a column behind" "ALTER TABLE legal_evidence_refs ADD COLUMN withdrawn_at timestamptz" 'already applied or partially present'
}
grp_rollback() {
  local A="$1" R="$2" b p
  # R1/R2: bound, then withdrawn evidence blocks rollback; nothing changes
  mkfull rb1 "$A"; rt rb1 "SELECT legal_attach_evidence_version('$E1','$V1',1)" >/dev/null; b="$(fpall rb1)"
  gc "003 rollback refuses while an evidence reference is BOUND" "$(refused rb1 "$R" 'rollback refused: [0-9]+ evidence reference\(s\) are bound or withdrawn')"
  gc "refused rollback changed nothing (columns, FK, index, triggers, policy, rows, journal)" "$(eq "$b" "$(fpall rb1)")"
  rt rb1 "SELECT legal_withdraw_evidence_version('$E1',2)" >/dev/null; b="$(fpall rb1)"
  gc "003 rollback refuses while an evidence reference is WITHDRAWN" "$(refused rb1 "$R" 'rollback refused: [0-9]+ evidence reference\(s\) are bound or withdrawn')"
  gc "refused rollback (withdrawn) changed nothing; the binding, its version and both journal events remain" "$(and "$(eq "$b" "$(fpall rb1)")" "$([ "$(psqlx rb1 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 2 ] && echo 1 || echo 0)")"
  enddb rb1
  # R3: journal custody even when the evidence row is gone
  mkfull rb3 "$A"; rt rb3 "SELECT legal_attach_evidence_version('$E1','$V1',1)" >/dev/null; strict rb3 -c "DELETE FROM legal_evidence_refs WHERE id='$E1'" >/dev/null; b="$(fpall rb3)"
  gc "003 rollback refuses on journal custody even if the bound evidence row was later removed (events would be orphaned)" "$(refused rb3 "$R" 'journal custody')"
  gc "that refusal changed nothing" "$(eq "$b" "$(fpall rb3)")"
  enddb rb3
  # R4: empty rollback is an EXACT inverse of the apply
  base_build rb4; fixtures rb4; p="$(fpall rb4)"; strict rb4 -f "$A" >/dev/null
  gc "003 rollback succeeds with only unbound legacy refs" "$(okf rb4 "$R")"
  gc "empty rollback is an exact inverse: the whole-schema fingerprint equals the pre-003 state (journal CHECK and policy text restored)" "$(eq "$p" "$(fpall rb4)")"
  gc "and a re-apply works (nothing 003 created is left behind)" "$(okf rb4 "$A")"
  enddb rb4
  # R4b: journal rows other than attachment events survive an empty rollback
  mkfull rb4b "$A"; rt rb4b "UPDATE legal_evidence_refs SET confidence='high', revision=revision+1 WHERE id='$E2'; SELECT 1" >/dev/null
  gc "rollback keeps existing journal rows (an evidence_confidence event) and removes only 003 objects" "$(and "$(okf rb4b "$R")" "$([ "$(psqlx rb4b -c "select count(*) from legal_case_events where dimension='evidence_confidence'")" = 1 ] && echo 1 || echo 0)")"
  enddb rb4b
  # R5: wrong order, 001 first (its tables must be empty): residuals until 003 rollback runs
  mkfull rb5 "$A"; strict rb5 -c "DELETE FROM legal_evidence_refs; DELETE FROM legal_evidence_requirements" >/dev/null
  gc "001 rollback runs first on empty tables even though 003 is applied" "$(okf rb5 "$tmp/legal_rb.sql")"
  gc "RESIDUAL (documented): the extended journal CHECK and the five 003 functions remain after a lone 001 rollback" "$(and "$([ "$(psqlx rb5 -c "select count(*) from pg_constraint where conrelid='legal_case_events'::regclass and pg_get_constraintdef(oid) ~ 'evidence_attachment'")" = 1 ] && echo 1 || echo 0)" "$([ "$(psqlx rb5 -c "select count(*) from pg_proc where proname in ('legal_attach_evidence_version','legal_withdraw_evidence_version','legal_evidence_link_guard','legal_evidence_link_insert_guard','legal_evidence_link_journal')")" = 5 ] && echo 1 || echo 0)")"
  gc "003 rollback then cleans those residuals (skips the dropped table and the already-dropped policy)" "$(and "$(okf rb5 "$R")" "$([ "$(psqlx rb5 -c "select count(*) from pg_proc where proname ~ '^legal_(attach|withdraw)_evidence|^legal_evidence_link'")" = 0 ] && echo 1 || echo 0)" "$([ "$(psqlx rb5 -c "select count(*) from pg_constraint where conrelid='legal_case_events'::regclass and pg_get_constraintdef(oid) ~ 'evidence_attachment'")" = 0 ] && echo 1 || echo 0)")"
  enddb rb5
  # R6: the D1 registry cannot be rolled back under 003 (dependency, safe) and can afterwards
  base_build rb6; strict rb6 -f "$A" >/dev/null; b="$(fpall rb6)"
  gc "D1 rollback is refused (FK dependency) while 003 is applied, even with D1 empty" "$(refused rb6 "$tmp/documents_rb.sql" 'cannot drop table document_versions because other objects depend on it|depend')"
  gc "that refusal changed nothing" "$(eq "$b" "$(fpall rb6)")"
  gc "correct order: 003 rollback, then D1 rollback succeed" "$(and "$(okf rb6 "$R")" "$(okf rb6 "$tmp/documents_rb.sql")")"
  enddb rb6
  # R5: a tampered install is refused with the complete schema and every row preserved
  tamper() { # name setup pattern
    mkfull rt5 "$A"; strict rt5 -c "$2" >/dev/null; b="$(fpall rt5)"
    gc "ROLLBACK SHAPE: $1 is refused" "$(refused rt5 "$R" "$3")"; gc "refused rollback ($1) preserved the complete schema and every row" "$(eq "$b" "$(fpall rt5)")"; enddb rt5; }
  tamper "a journal policy whose WITH CHECK was changed to false" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)) AND (dimension IS NULL OR dimension NOT IN ('evidence_confidence','evidence_attachment') OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id))) WITH CHECK (false)" 'not exactly the 003 journal policy'
  tamper "a journal policy with USING true" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (true /* evidence_attachment */) WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)))" 'not exactly the 003 journal policy'
  tamper "a journal policy whose mask lost the attachment dimension" "DROP POLICY legal_case_events_rt ON legal_case_events; CREATE POLICY legal_case_events_rt ON legal_case_events FOR ALL TO ecc_legal_runtime USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)) AND (dimension IS DISTINCT FROM 'evidence_confidence' OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)))" 'not exactly the 003 journal policy'
  tamper "a weakened withdrawal CHECK (true)" "ALTER TABLE legal_evidence_refs DROP CONSTRAINT legal_evidence_refs_withdrawal_requires_version_chk; ALTER TABLE legal_evidence_refs ADD CONSTRAINT legal_evidence_refs_withdrawal_requires_version_chk CHECK (true)" 'withdrawal CHECK is not exactly'
  tamper "a changed index predicate" "DROP INDEX legal_evidence_refs_binding_uq; CREATE UNIQUE INDEX legal_evidence_refs_binding_uq ON legal_evidence_refs (matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT WHERE document_version_id IS NOT NULL AND withdrawn_at IS NULL" 'binding index is not exactly'
  tamper "a binding index with NULLS DISTINCT semantics" "DROP INDEX legal_evidence_refs_binding_uq; CREATE UNIQUE INDEX legal_evidence_refs_binding_uq ON legal_evidence_refs (matter_id, requirement_id, document_version_id) WHERE document_version_id IS NOT NULL" 'binding index is not exactly'
  tamper "a binding index with different key columns" "DROP INDEX legal_evidence_refs_binding_uq; CREATE UNIQUE INDEX legal_evidence_refs_binding_uq ON legal_evidence_refs (matter_id, document_version_id) NULLS NOT DISTINCT WHERE document_version_id IS NOT NULL" 'binding index is not exactly'
  tamper "a foreign key with ON UPDATE CASCADE" "ALTER TABLE legal_evidence_refs DROP CONSTRAINT legal_evidence_refs_document_version_fk; ALTER TABLE legal_evidence_refs ADD CONSTRAINT legal_evidence_refs_document_version_fk FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE RESTRICT ON UPDATE CASCADE" 'foreign key is not exactly'
  tamper "a foreign key with ON DELETE CASCADE" "ALTER TABLE legal_evidence_refs DROP CONSTRAINT legal_evidence_refs_document_version_fk; ALTER TABLE legal_evidence_refs ADD CONSTRAINT legal_evidence_refs_document_version_fk FOREIGN KEY (document_version_id) REFERENCES document_versions(id) ON DELETE CASCADE" 'foreign key is not exactly'
  tamper "a journal trigger with a changed WHEN clause" "DROP TRIGGER legal_evidence_refs_link_journal ON legal_evidence_refs; CREATE TRIGGER legal_evidence_refs_link_journal AFTER UPDATE ON legal_evidence_refs FOR EACH ROW WHEN (OLD.withdrawn_at IS DISTINCT FROM NEW.withdrawn_at) EXECUTE FUNCTION public.legal_evidence_link_journal()" 'three 003 triggers are not exactly'
  tamper "a DISABLED link guard trigger" "ALTER TABLE legal_evidence_refs DISABLE TRIGGER legal_evidence_refs_link_guard" 'three 003 triggers are not exactly'
  tamper "a journal trigger reshaped to BEFORE UPDATE" "DROP TRIGGER legal_evidence_refs_link_journal ON legal_evidence_refs; CREATE TRIGGER legal_evidence_refs_link_journal BEFORE UPDATE ON legal_evidence_refs FOR EACH ROW WHEN (OLD.document_version_id IS DISTINCT FROM NEW.document_version_id OR OLD.withdrawn_at IS DISTINCT FROM NEW.withdrawn_at) EXECUTE FUNCTION public.legal_evidence_link_journal()" 'three 003 triggers are not exactly'
  tamper "a dimension CHECK with an extra value" "ALTER TABLE legal_case_events DROP CONSTRAINT legal_case_events_dimension_check; ALTER TABLE legal_case_events ADD CONSTRAINT legal_case_events_dimension_check CHECK (dimension IS NULL OR dimension IN ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','evidence_attachment','other','smuggled'))" 'dimension CHECK is not exactly the six'
  # R7: unexpected shapes are refused, not understood
  base_build rb7a; fixtures rb7a
  gc "003 rollback refuses when 003 was never applied" "$(refused rb7a "$R" 'does not carry the 003 columns')"; enddb rb7a
  base_build rb7; fixtures rb7; strict rb7 -f "$A" >/dev/null
  strict rb7 -c "DROP TRIGGER legal_evidence_refs_link_guard ON legal_evidence_refs; CREATE TRIGGER legal_evidence_refs_link_guard BEFORE UPDATE ON legal_evidence_refs FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_link_insert_guard()" >/dev/null; b="$(fpall rb7)"
  gc "003 rollback refuses a 003 trigger bound to the wrong function (unexpected trigger state)" "$(refused rb7 "$R" 'unexpected trigger state')"
  gc "that refusal changed nothing" "$(eq "$b" "$(fpall rb7)")"
  enddb rb7
  mkfull rb8 "$A"; strict rb8 -c "DROP INDEX legal_evidence_refs_binding_uq; CREATE UNIQUE INDEX legal_evidence_refs_binding_uq ON legal_evidence_refs (matter_id, requirement_id, document_version_id) WHERE document_version_id IS NOT NULL" >/dev/null; b="$(fpall rb8)"
  gc "003 rollback refuses a binding index that lost NULLS NOT DISTINCT (not the 003 form)" "$(refused rb8 "$R" 'binding index is not exactly')"
  gc "that refusal changed nothing" "$(eq "$b" "$(fpall rb8)")"
  enddb rb8
}
grp_conc() {
  local A="$1" R="$2" a_out b_out n r
  holdsql() { printf "BEGIN;\nSET LOCAL ROLE ecc_legal_runtime;\nSELECT set_config('ecc.scope_refs','scopeA',true);\nSELECT set_config('ecc.actor','%s',true);\n%s\nSELECT pg_sleep(%s);\nCOMMIT;\n" "$1" "$2" "$3" > "$tmp/$4.sql"; chmod 644 "$tmp/$4.sql"; }
  two() { # db sqlA sqlB : A holds its transaction open for 3 s, B starts 1 s later
    holdsql actorA "$2" 3 cA; holdsql actorB "$3" 0 cB
    ( psqlx "$1" -v ON_ERROR_STOP=1 -f "$tmp/cA.sql" > "$tmp/cA.out" 2>&1 || true ) & sleep 1
    psqlx "$1" -v ON_ERROR_STOP=1 -f "$tmp/cB.sql" > "$tmp/cB.out" 2>&1 || true; wait; }
  mkfull c1 "$A"
  two c1 "SELECT legal_attach_evidence_version('$E1','$V1',1);" "SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e101','$V1',1);"
  gc "CONCURRENT attach of the same matter/requirement/version to two refs: exactly one binding, the loser gets 23505 after waiting" "$(and "$(grep -q 'attached' "$tmp/cA.out" && echo 1 || echo 0)" "$(grep -q 'duplicate key value violates unique constraint' "$tmp/cB.out" && echo 1 || echo 0)" "$([ "$(psqlx c1 -c "select count(*) from legal_evidence_refs where document_version_id='$V1' and matter_id='$EA' and requirement_id='00000000-0000-4000-8000-00000000a301'")" = 1 ] && echo 1 || echo 0)")"
  gc "and exactly ONE journal event exists for it" "$([ "$(psqlx c1 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 1 ] && echo 1 || echo 0)"
  enddb c1
  mkfull c2 "$A"
  two c2 "SELECT legal_attach_evidence_version('$E1','$V1',1);" "SELECT legal_attach_evidence_version('$E1','$V1',1);"
  gc "CONCURRENT identical attach of one ref (lost-reply retry): one attached, the other already_attached, revision 2, ONE event" "$(and "$(grep -q '^attached' "$tmp/cA.out" && echo 1 || echo 0)" "$(grep -q 'already_attached' "$tmp/cB.out" && echo 1 || echo 0)" "$([ "$(psqlx c2 -c "select revision from legal_evidence_refs where id='$E1'")" = 2 ] && echo 1 || echo 0)" "$([ "$(psqlx c2 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 1 ] && echo 1 || echo 0)")"
  enddb c2
  mkfull c3 "$A"
  two c3 "SELECT legal_attach_evidence_version('$E1','$V1',1);" "SELECT legal_attach_evidence_version('$E1','$V2',1);"
  gc "CONCURRENT attach of two different versions to one ref: one durable result (first wins), the other is a conflict, ONE event, never retargeted" "$(and "$(grep -q 'already bound' "$tmp/cB.out" && echo 1 || echo 0)" "$([ "$(psqlx c3 -c "select document_version_id from legal_evidence_refs where id='$E1'")" = "$V1" ] && echo 1 || echo 0)" "$([ "$(psqlx c3 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 1 ] && echo 1 || echo 0)")"
  enddb c3
  mkfull c4 "$A"
  holdsql actorA "SELECT legal_attach_evidence_version('$E1','$V1',1);" 3 cA
  ( psqlx c4 -v ON_ERROR_STOP=1 -f "$tmp/cA.sql" > "$tmp/cA.out" 2>&1 || true ) & sleep 1
  r="$(strict c4 -f "$R" 2>&1 >/dev/null || true)"; wait
  gc "CONCURRENT rollback waits for an in-flight attach (table lock before the count) and then refuses; the binding and its event are intact" "$(and "$(echo "$r" | grep -Eq 'bound or withdrawn' && echo 1 || echo 0)" "$([ "$(psqlx c4 -c "select count(*) from legal_evidence_refs where document_version_id is not null")" = 1 ] && echo 1 || echo 0)" "$([ "$(psqlx c4 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 1 ] && echo 1 || echo 0)")"
  enddb c4
}
grp_shadow() {
  local A="$1" R="$2" sb
  wrap() { printf 'SET search_path = shadow, public, pg_catalog;\n\\i %s\n' "$2" > "$tmp/wrap_$1.sql"; chmod 644 "$tmp/wrap_$1.sql"; echo "$tmp/wrap_$1.sql"; }
  shfp() { psqlx "$1" -c "select coalesce(md5(string_agg(c.relname||':'||a.attname||':'||format_type(a.atttypid,a.atttypmod), '|' order by c.relname,a.attnum)),'none')||'/'||(select count(*) from shadow.legal_evidence_refs)||'/'||(select count(*) from shadow.legal_case_events)||'/'||(select count(*) from pg_trigger where tgrelid in (select oid from pg_class where relnamespace='shadow'::regnamespace) and not tgisinternal)||'/'||(select count(*) from pg_constraint where connamespace='shadow'::regnamespace) from pg_class c join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where c.relnamespace='shadow'::regnamespace and c.relkind='r'"; }
  tempwrap() { cat > "$tmp/tw_$1.sql" <<WRAP
\set kind temp
\i $tmp/shadow.sql
SELECT coalesce(md5(string_agg(c.relname||':'||a.attname, '|' ORDER BY c.relname, a.attnum)),'none') AS before FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE c.relnamespace = pg_my_temp_schema() AND c.relkind='r' \gset
\i $2
SELECT (coalesce(md5(string_agg(c.relname||':'||a.attname, '|' ORDER BY c.relname, a.attnum)),'none') = :'before') AS same FROM pg_class c JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped WHERE c.relnamespace = pg_my_temp_schema() AND c.relkind='r' \gset
SELECT 'TEMPUNTOUCHED|' || :'same';
WRAP
    chmod 644 "$tmp/tw_$1.sql"; echo "$tmp/tw_$1.sql"; }
  cols() { psqlx "$1" -c "select count(*) from information_schema.columns where table_schema='public' and table_name='legal_evidence_refs' and column_name in ('document_version_id','withdrawn_at')"; }
  # apply with a look-alike schema first
  base_build s1; fixtures s1; strict s1 -v kind=schema -f "$tmp/shadow.sql" >/dev/null; sb="$(shfp s1)"
  strict s1 -f "$(wrap s1 "$A")" >/dev/null 2>&1 || true
  gc "SHADOW apply (look-alike schema first): public gets both columns and the five functions; nothing is created or altered in the look-alike schema" "$(and "$([ "$(cols s1)" = 2 ] && echo 1 || echo 0)" "$([ "$(psqlx s1 -c "select count(*) from pg_proc where pronamespace='public'::regnamespace and proname ~ '^legal_(attach|withdraw)_evidence|^legal_evidence_link'")" = 5 ] && echo 1 || echo 0)" "$(eq "$sb" "$(shfp s1)")")"
  # the commands under a hostile search_path with a look-alike legal_actor() that would accept a caller with NO actor
  newrefs s1
  o="$(rt s1 "SET LOCAL search_path = shadow, public, pg_catalog; SELECT legal_attach_evidence_version('$E1','$V1',1)" scopeA '')"
  gc "SHADOW commands: with a look-alike legal_actor() and tables first in search_path, a caller with no actor is still refused 42501 and nothing changes" "$(and "$(echo "$o" | grep -q 'ERR:.*ERROR' && echo 1 || echo 0)" "$([ "$(psqlx s1 -c "select count(*) from legal_evidence_refs where document_version_id is not null")" = 0 ] && echo 1 || echo 0)")"
  o="$(rt s1 "SET LOCAL search_path = shadow, public, pg_catalog; SELECT legal_attach_evidence_version('$E1','$V1',1)")"
  gc "SHADOW commands: with an actor they bind the PUBLIC row, journal into public.legal_case_events, and the look-alike tables stay untouched" "$(and "$(eq "$o" attached)" "$([ "$(psqlx s1 -c "select count(*) from legal_case_events where dimension='evidence_attachment'")" = 1 ] && echo 1 || echo 0)" "$(eq "$sb" "$(shfp s1)")")"
  enddb s1
  # rollback: a populated look-alike cannot cause a refusal, an empty look-alike cannot hide public bound evidence
  base_build s2; fixtures s2; strict s2 -f "$A" >/dev/null; strict s2 -v kind=schema -f "$tmp/shadow.sql" >/dev/null
  strict s2 -c "ALTER TABLE shadow.legal_evidence_refs ADD COLUMN document_version_id uuid, ADD COLUMN withdrawn_at timestamptz; UPDATE shadow.legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000a0001'" >/dev/null; sb="$(shfp s2)"
  gc "SHADOW rollback: a look-alike table with BOUND rows does not cause a refusal; public is rolled back and the look-alike schema is untouched" "$(and "$(okf s2 "$(wrap s2 "$R")")" "$([ "$(cols s2)" = 0 ] && echo 1 || echo 0)" "$(eq "$sb" "$(shfp s2)")")"
  enddb s2
  mkfull s3 "$A"; rt s3 "SELECT legal_attach_evidence_version('$E1','$V1',1)" >/dev/null; strict s3 -v kind=schema -f "$tmp/shadow.sql" >/dev/null; b="$(fpall s3)"; sb="$(shfp s3)"
  gc "SHADOW rollback: an EMPTY look-alike legal_evidence_refs first in search_path cannot hide public bound evidence (still refused)" "$(refused s3 "$(wrap s3 "$R")" 'bound or withdrawn')"
  gc "and that refusal changed nothing in public or in the look-alike schema" "$(and "$(eq "$b" "$(fpall s3)")" "$(eq "$sb" "$(shfp s3)")")"
  enddb s3
  # sequences (LOCK/ALTER on a non-table must not be reached), look-alike catalog tables, TEMP relations
  base_build s4; fixtures s4; strict s4 -c "create schema shadow; create sequence shadow.legal_evidence_refs; create sequence shadow.legal_case_events; create sequence shadow.document_versions" >/dev/null
  gc "SHADOW apply with look-alike SEQUENCES first in search_path succeeds on public" "$(and "$(okf s4 "$(wrap s4 "$A")")" "$([ "$(cols s4)" = 2 ] && echo 1 || echo 0)")"
  gc "SHADOW rollback with look-alike SEQUENCES first in search_path succeeds on public" "$(and "$(okf s4 "$(wrap s4 "$R")")" "$([ "$(cols s4)" = 0 ] && echo 1 || echo 0)")"
  enddb s4
  base_build s5; fixtures s5; strict s5 -c "create schema shadow; create table shadow.pg_constraint (oid oid, conname name); create table shadow.pg_trigger (oid oid, tgname name); create table shadow.pg_attribute (attrelid oid, attname name); create table shadow.pg_policies (policyname name); create table shadow.pg_indexes (indexname name)" >/dev/null
  gc "SHADOW apply with look-alike catalog tables ahead of pg_catalog still validates and applies the real definitions" "$(and "$(okf s5 "$(wrap s5 "$A")")" "$([ "$(cols s5)" = 2 ] && echo 1 || echo 0)")"
  gc "SHADOW rollback with look-alike catalog tables validates and removes the real objects" "$(and "$(okf s5 "$(wrap s5 "$R")")" "$([ "$(cols s5)" = 0 ] && echo 1 || echo 0)")"
  enddb s5
  base_build s6; fixtures s6; o="$(strict s6 -f "$(tempwrap s6 "$A")" 2>&1 || true)"
  gc "TEMP look-alikes (always first in resolution): apply changes public only and the temp relations are untouched" "$(and "$([ "$(cols s6)" = 2 ] && echo 1 || echo 0)" "$(echo "$o" | grep -q 'TEMPUNTOUCHED|t' && echo 1 || echo 0)")"
  o="$(strict s6 -f "$(tempwrap s6b "$R")" 2>&1 || true)"
  gc "TEMP look-alikes: rollback changes public only and the temp relations are untouched" "$(and "$([ "$(cols s6)" = 0 ] && echo 1 || echo 0)" "$(echo "$o" | grep -q 'TEMPUNTOUCHED|t' && echo 1 || echo 0)")"
  enddb s6
}
reset_g() { GP=0; GT=0; GFAILS=""; }
run_group() { reset_g; "$1" "$2" "$3" >/dev/null 2>&1 || true; }

# ================================================================ 1) the real proposal files, every group
for g in main apply_refusals rollback conc shadow; do bp=$GP; bt=$GT; "grp_$g" "$tmp/link.sql" "$tmp/link_rb.sql"; echo "[legal-evidence-link-db]   group $g: $((GP-bp))/$((GT-bt))"; done
real_pass=$GP; real_total=$GT

# ================================================================ 2) negative controls: the SAME group must fail with exactly one protection removed
npass=0; ntotal=0
neg() {   # name which(link|rb) group sed-script expected-substring
  local name="$1" which="$2" group="$3" script="$4" expect="$5" a="$tmp/link.sql" r="$tmp/link_rb.sql" src out; ntotal=$((ntotal+1))
  if [ "$which" = link ]; then src="$tmp/link.sql"; else src="$tmp/link_rb.sql"; fi
  sed "$script" "$src" > "$tmp/m_$name.sql"; chmod 644 "$tmp/m_$name.sql"
  if cmp -s "$src" "$tmp/m_$name.sql"; then echo "FAIL: mutant $name changed nothing (vacuous control)"; return; fi
  if [ "$which" = link ]; then a="$tmp/m_$name.sql"; else r="$tmp/m_$name.sql"; fi
  GP=0; GT=0; out="$("grp_$group" "$a" "$r" 2>&1 || true)"
  if echo "$out" | grep '^FAIL' | grep -qF -- "$expect"; then npass=$((npass+1)); else echo "FAIL: negative control $name was NOT caught (expected a failing check containing: $expect)"; echo "$out" | { grep '^FAIL' || true; } | head -3 | sed 's/^/    /'; fi
}
negx() {   # name which(link|rb) group "python regex (DOTALL)" "replacement" expected-substring
  local name="$1" which="$2" group="$3" pat="$4" rep="$5" expect="$6" a="$tmp/link.sql" r="$tmp/link_rb.sql" src out; ntotal=$((ntotal+1))
  if [ "$which" = link ]; then src="$tmp/link.sql"; else src="$tmp/link_rb.sql"; fi
  python3 -I -c 'import re,sys; s=open(sys.argv[1]).read(); n=re.subn(sys.argv[2], sys.argv[3], s, flags=re.S); sys.exit(3) if n[1]!=1 else open(sys.argv[4],"w").write(n[0])' "$src" "$pat" "$rep" "$tmp/m_$name.sql" || { echo "FAIL: mutant $name does not apply exactly once (vacuous control)"; return; }
  chmod 644 "$tmp/m_$name.sql"; if [ "$which" = link ]; then a="$tmp/m_$name.sql"; else r="$tmp/m_$name.sql"; fi
  GP=0; GT=0; out="$("grp_$group" "$a" "$r" 2>&1 || true)"
  if echo "$out" | grep '^FAIL' | grep -qF -- "$expect"; then npass=$((npass+1)); else echo "FAIL: negative control $name was NOT caught (expected a failing check containing: $expect)"; echo "$out" | { grep '^FAIL' || true; } | head -3 | sed 's/^/    /'; fi
}
negr() {   # name which(link|rb) group "literal old" "literal new" expected-substring   (literal replacement; the old text must exist)
  local name="$1" which="$2" group="$3" old="$4" new="$5" expect="$6" a="$tmp/link.sql" r="$tmp/link_rb.sql" src out; ntotal=$((ntotal+1))
  if [ "$which" = link ]; then src="$tmp/link.sql"; else src="$tmp/link_rb.sql"; fi
  python3 -I -c 'import sys; s=open(sys.argv[1]).read(); sys.exit(3) if sys.argv[2] not in s else open(sys.argv[4],"w").write(s.replace(sys.argv[2], sys.argv[3]))' "$src" "$old" "$new" "$tmp/m_$name.sql" || { echo "FAIL: mutant $name does not apply (text not found: vacuous control)"; return; }
  chmod 644 "$tmp/m_$name.sql"; if [ "$which" = link ]; then a="$tmp/m_$name.sql"; else r="$tmp/m_$name.sql"; fi
  GP=0; GT=0; out="$("grp_$group" "$a" "$r" 2>&1 || true)"
  if echo "$out" | grep '^FAIL' | grep -qF -- "$expect"; then npass=$((npass+1)); else echo "FAIL: negative control $name was NOT caught (expected a failing check containing: $expect)"; echo "$out" | { grep '^FAIL' || true; } | head -3 | sed 's/^/    /'; fi
}
GP_SAVE=$GP; GT_SAVE=$GT
neg m01_insert_guard_removed link main "/CREATE TRIGGER legal_evidence_refs_link_insert_guard/,/EXECUTE FUNCTION public.legal_evidence_link_insert_guard();/d" 'INSERT with a version'
neg m02_retarget_check_removed link main "/IF OLD.document_version_id IS NOT NULL AND NEW.document_version_id IS DISTINCT FROM OLD.document_version_id THEN/,/END IF;/d" 'cannot be retargeted'
neg m03_journal_mask_not_extended link main "s/dimension NOT IN ('evidence_confidence', 'evidence_attachment')/dimension NOT IN ('evidence_confidence')/" 'journal mask'
neg m04_unique_index_allows_null_requirement_duplicates link main "s/(matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT/(matter_id, requirement_id, document_version_id)/" 'NULL (unassigned) requirement'
neg m05_withdrawal_time_from_caller link main "s/IF withdrawing THEN NEW.withdrawn_at := now(); END IF;//" 'server supplies the withdrawal time'
neg m06_journal_trigger_removed link main "/CREATE TRIGGER legal_evidence_refs_link_journal/,/EXECUTE FUNCTION public.legal_evidence_link_journal();/d" 'journal event'
neg m07_actor_never_required link main "s/PERFORM public.legal_actor();//;s/public.legal_actor(), NEW.id/'nobody', NEW.id/" 'no actor'
neg m08_attach_may_change_other_fields link main "/IF (NEW.matter_id, NEW.requirement_id, NEW.ref_kind/,/END IF;/d" 'also changes confidence'
neg m09_replay_not_recognised link main "s/IF r.document_version_id IS NOT DISTINCT FROM p_version_id AND r.withdrawn_at IS NULL AND r.revision = p_expected_revision + 1 THEN RETURN 'already_attached'; END IF;//" 'exact replay'
neg m10_commands_security_definer link main "s/LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS \$\$\$/LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, pg_temp AS \$\$/" 'wrong-scope'
neg m11_unbound_row_may_be_withdrawn link main "/IF OLD.document_version_id IS NULL AND NEW.withdrawn_at IS NOT NULL THEN/,/END IF;/d;/ADD CONSTRAINT legal_evidence_refs_withdrawal_requires_version_chk/,/CHECK (withdrawn_at IS NULL OR document_version_id IS NOT NULL);/d" 'unbound ref cannot be withdrawn'
neg m12_rollback_ignores_bound_evidence rb rollback "/IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % evidence reference/d" 'BOUND'
neg m13_rollback_ignores_journal_custody rb rollback "/IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % attachment\/withdrawal journal event/d" 'journal custody'
neg m14_rollback_skips_trigger_shape_check rb rollback "/IF (SELECT count(\*) FROM pg_catalog.pg_trigger l, pg_catalog.pg_trigger e/,/END IF;/d" 'wrong function'
neg m15_apply_alter_unqualified link shadow "s/ALTER TABLE public.legal_evidence_refs ADD COLUMN/ALTER TABLE legal_evidence_refs ADD COLUMN/" 'SHADOW apply (look-alike schema first)'
neg m16_apply_lock_unqualified link shadow "s/LOCK TABLE public.legal_evidence_refs, public.legal_case_events/LOCK TABLE legal_evidence_refs, legal_case_events/" 'SEQUENCES'
neg m17_rollback_count_unqualified rb shadow "s/FROM public.legal_evidence_refs WHERE document_version_id IS NOT NULL OR withdrawn_at IS NOT NULL/FROM legal_evidence_refs WHERE document_version_id IS NOT NULL OR withdrawn_at IS NOT NULL/" 'EMPTY look-alike'
neg m18_functions_resolve_actor_via_search_path link shadow "s/ SET search_path = pg_catalog, pg_temp//g;s/public\.legal_actor()/legal_actor()/g" 'look-alike legal_actor'
neg m19_apply_catalog_unqualified link shadow "s/pg_catalog\.pg_attribute/pg_attribute/g" 'look-alike catalog tables'
neg m20_concurrent_replay_not_serialised link conc "s/SELECT \* INTO r FROM public.legal_evidence_refs WHERE id = p_evidence_id FOR UPDATE;/SELECT * INTO r FROM public.legal_evidence_refs WHERE id = p_evidence_id;/" 'CONCURRENT'

# --- v2 controls: each removes exactly ONE of the new protections
negr m21_apply_accepts_partial_002 link apply_refusals "('legal_cases','unit_id','units'), ('legal_cases','tenant_id','tenants'), ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','property_id','properties'), ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)" "('legal_matter_properties','property_id','properties')) v(child, col, parent)" 'partial 002'
negr m22_apply_ignores_trigger_enablement link apply_refusals "AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0 AND t.tgqual IS NULL" "AND t.tgtype = 19 AND t.tgnargs = 0 AND t.tgqual IS NULL" 'DISABLED'
negr m23_apply_ignores_trigger_shape link apply_refusals "AND t.tgtype = 19 AND t.tgenabled = 'O' AND t.tgnargs = 0 AND t.tgqual IS NULL" "AND t.tgenabled = 'O' AND t.tgnargs = 0 AND t.tgqual IS NULL" 'reshaped to AFTER UPDATE'
negr m24_apply_ignores_trigger_binding link apply_refusals "IF n <> 1 THEN RAISE EXCEPTION 'evidence linkage refused: expected exactly one trigger bound to legal_evidence_guard() on legal_evidence_refs, found % (no changes made)', n; END IF;" "" 'wrongly bound'
negr m25_apply_compares_policy_by_substring link apply_refusals "AND pg_catalog.pg_get_expr(l.polwithcheck, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polwithcheck, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')) THEN" "AND true) THEN" 'WITH CHECK was changed to false'
negr m26_apply_ignores_policy_using link apply_refusals "AND pg_catalog.pg_get_expr(l.polqual, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polqual, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')" "AND true" 'USING was changed to true'
negr m27_apply_accepts_any_dimension_check link apply_refusals "AND pg_catalog.pg_get_constraintdef(l.oid) = pg_catalog.pg_get_constraintdef(e.oid)) THEN" "AND pg_catalog.pg_get_constraintdef(l.oid) ~ 'evidence_confidence') THEN" 'extra value'
negr m28_apply_ignores_extra_policy link apply_refusals "IF (SELECT count(*) FROM pg_catalog.pg_policy p WHERE p.polrelid = 'public.legal_case_events'::regclass) <> 1
     OR NOT EXISTS" "IF NOT EXISTS" 'extra journal policy'
negr m29_command_overflow_not_bounded link main "OR p_expected_revision > 2147483646 THEN
    RAISE EXCEPTION 'legal: invalid attachment request'" "THEN
    RAISE EXCEPTION 'legal: invalid attachment request'" 'integer bounds'
negr m30_rollback_ignores_policy_with_check rb rollback "AND pg_catalog.pg_get_expr(l.polwithcheck, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polwithcheck, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')) THEN" "AND true) THEN" 'WITH CHECK was changed to false'
negr m31_rollback_ignores_policy_using rb rollback "AND pg_catalog.pg_get_expr(l.polqual, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polqual, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')" "AND true" 'USING true'
negr m32_rollback_ignores_withdrawal_check rb rollback "AND pg_catalog.pg_get_constraintdef(l.oid) = pg_catalog.pg_get_constraintdef(e.oid)) <> 1 THEN" "AND true) <> 1 THEN" 'weakened withdrawal CHECK'
negr m33_rollback_ignores_index_predicate rb rollback "AND pg_catalog.pg_get_expr(l.indpred, l.indrelid) IS NOT DISTINCT FROM pg_catalog.pg_get_expr(e.indpred, e.indrelid)) <> 1 THEN" "AND true) <> 1 THEN" 'changed index predicate'
negr m34_rollback_ignores_null_semantics rb rollback "l.indnullsnotdistinct = e.indnullsnotdistinct" "true" 'NULLS DISTINCT semantics'
negx m35_rollback_ignores_index_keys rb rollback 'AND l\.indnkeyatts = 3 AND l\.indnatts = e\.indnatts AND lc\.relam = ec\.relam\s+AND \(SELECT array_agg.*?a\.attnum = k\.attnum\)\s+= \(SELECT array_agg.*?a\.attnum = k\.attnum\)' 'AND lc.relam = ec.relam' 'different key columns'
negr m36_rollback_ignores_fk_actions rb rollback "AND c.confdeltype = 'r' AND c.confupdtype = 'a' AND c.confmatchtype = 's' AND NOT c.condeferrable AND c.convalidated) <> 1 THEN" "AND c.confdeltype = 'r') <> 1 THEN" 'ON UPDATE CASCADE'
negr m37_rollback_ignores_trigger_when rb rollback "AND substring(pg_catalog.pg_get_triggerdef(l.oid) from ' FOR EACH ROW.*') = substring(pg_catalog.pg_get_triggerdef(e.oid) from ' FOR EACH ROW.*')) <> 3 THEN" "AND true) <> 3 THEN" 'changed WHEN clause'
negr m38_rollback_ignores_trigger_enablement rb rollback "AND l.tgenabled = 'O' AND l.tgnargs = 0" "AND l.tgnargs = 0" 'DISABLED link guard'
negr m39_rollback_ignores_trigger_timing rb rollback "AND l.tgfoid = e.tgfoid AND l.tgtype = e.tgtype" "AND l.tgfoid = e.tgfoid" 'reshaped to BEFORE UPDATE'
negr m40_rollback_accepts_any_dimension_check rb rollback "AND pg_catalog.pg_get_constraintdef(l.oid) = pg_catalog.pg_get_constraintdef(e.oid)) THEN
    RAISE EXCEPTION 'rollback refused: the journal dimension CHECK" "AND pg_catalog.pg_get_constraintdef(l.oid) ~ 'evidence_attachment') THEN
    RAISE EXCEPTION 'rollback refused: the journal dimension CHECK" 'dimension CHECK with an extra value'
GP=$GP_SAVE; GT=$GT_SAVE

echo "[legal-evidence-link-db] real proposal: ${real_pass}/${real_total} checks (main + apply refusals + rollback + concurrency + schema shadows), negative controls ${npass}/${ntotal}"
if [ "$real_pass" = "$real_total" ] && [ "$real_total" -gt 0 ] && [ "$npass" = "$ntotal" ] && [ "$ntotal" -gt 0 ]; then echo "[legal-evidence-link-db] PASS (reconstruction proof only; SQL integrity is not document authorization)"; else echo "[legal-evidence-link-db] FAIL"; exit 1; fi
