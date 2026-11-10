-- PROPOSAL ONLY. Guarded rollback for 001. Refuses to drop any table that holds rows.
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
-- Columns/constraints added to legal_cases and legal_case_events are left in place (additive, harmless); the
-- case_type constraint is intentionally not reverted to the conflicting pair.
COMMIT;
