-- PROPOSAL ONLY. Guarded PARTIAL rollback / disable procedure for 001. NOT AN EXACT RESTORE.
--
-- Removed by this script (only if every new table is empty; otherwise it refuses):
--   new tables, view legal_matter_award_totals, the guard/immutability/append-only triggers and their functions,
--   the runtime-role policies on legal_cases and legal_case_events, all privileges of ecc_legal_runtime, the role itself.
-- RESIDUAL STATE left in place on purpose (additive or custody-protecting; changing it needs its own reviewed decision):
--   * legal_cases columns scope_ref, jurisdiction_ref, court_ref, docket_number, revision; legal_case_events columns
--     dimension, actor, subject_id, source; index legal_cases_docket_identity_uq and legal_cases_case_number_idx.
--   * case_type: the single union CHECK stays (the original conflicting pair is NOT recreated).
--   * case_number stays nullable and its global UNIQUE constraint is NOT recreated (recreate only after a duplicate check).
--   * legal_case_events_matter_fk (NOT VALID) stays.
--   * RLS stays ENABLED on the 11 tables and anon/authenticated/PUBLIC privileges stay REVOKED. The original broad
--     grants are deliberately NOT restored; restoring them is a separate, explicit security decision.
-- Consequence: after this script no role but the owner/service role can use the legal tables; legacy callers that relied on
-- anon/authenticated DML stay blocked. The result is NOT the original schema or the original permissions.
BEGIN;
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['legal_source_links','legal_evidence_refs','legal_evidence_requirements','legal_award_obligors',
    'legal_awards','legal_matter_properties','legal_parties'] LOOP
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % holds % rows (legal custody)', t, n; END IF;
  END LOOP;
END $$;
DROP VIEW IF EXISTS legal_matter_award_totals;
DROP TABLE legal_source_links, legal_evidence_refs, legal_evidence_requirements, legal_award_obligors,
  legal_awards, legal_matter_properties, legal_parties;
DROP TRIGGER IF EXISTS legal_cases_guard ON legal_cases;
DROP TRIGGER IF EXISTS legal_events_no_mutate ON legal_case_events;
DROP POLICY IF EXISTS legal_cases_rt ON legal_cases;
DROP POLICY IF EXISTS legal_case_events_rt ON legal_case_events;
DROP FUNCTION IF EXISTS legal_matter_guard(), legal_award_guard(), legal_evidence_guard(), legal_matter_id_immutable(),
  legal_events_append_only(), legal_scope_ok(text), legal_actor();
DROP OWNED BY ecc_legal_runtime;   -- revokes its remaining privileges
DROP ROLE IF EXISTS ecc_legal_runtime;
COMMIT;
