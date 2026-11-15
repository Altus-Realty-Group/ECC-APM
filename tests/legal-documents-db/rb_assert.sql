-- End-state assertions after a rollback scenario. -v scenario=2|3|4 ; output: `name|t` or `name|f` per line.
\set ON_ERROR_STOP on
SELECT :scenario = 2 AS s2, :scenario = 3 AS s3, :scenario = 4 AS s4, :scenario IN (3,4) AS l1gone, :scenario IN (2,4) AS d1gone \gset
-- documented D1 outcome (exact removal) when D1 was rolled back
\if :d1gone
SELECT 'D1 rolled back: tables, views, functions and role are all gone', NOT EXISTS (SELECT 1 FROM pg_class WHERE relname LIKE 'document\_%') AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE 'document\_%') AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_documents_runtime');
\else
SELECT 'D1 intact: 4 tables + 2 views, role, RLS on with no policy, rows preserved',
  (SELECT count(*)=6 FROM pg_class WHERE relname LIKE 'document\_%' AND relkind IN ('r','v')) AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_documents_runtime')
  AND (SELECT count(*)=0 FROM pg_policies WHERE tablename LIKE 'document\_%') AND (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname LIKE 'document\_%' AND relkind='r')
  AND (SELECT count(*)=2 FROM document_records) AND (SELECT count(*)=1 FROM document_versions) AND (SELECT count(*)=1 FROM document_deliveries) AND (SELECT count(*)=1 FROM document_property_links);
\endif
-- baseline identity tables untouched in every scenario
SELECT 'owners/properties/property_owners and legacy file tables keep their rows', (SELECT count(*)=2 FROM owners) AND (SELECT count(*)=3 FROM properties) AND (SELECT count(*)=3 FROM property_owners)
  AND (SELECT count(*)=50 FROM files) AND (SELECT count(*)=2 FROM files_new) AND (SELECT count(*)=216 FROM legacy_staging);
\if :l1gone
SELECT 'L1 rolled back: new tables, view, role, functions and triggers are gone',
  NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename IN ('legal_parties','legal_awards','legal_award_obligors','legal_evidence_refs','legal_evidence_requirements','legal_source_links','legal_matter_properties'))
  AND NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname='legal_matter_award_totals') AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_legal_runtime')
  AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('legal_scope_ok','legal_actor','legal_matter_guard','legal_award_guard','legal_evidence_guard','legal_initial_dimensions','legal_matter_id_immutable','legal_events_append_only'))
  AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('legal_cases_guard','legal_events_no_mutate') AND NOT tgisinternal);
SELECT 'RESIDUAL (documented, NOT restoration): additive columns, union case_type CHECK, nullable case_number without global UNIQUE, journal FK stay',
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_cases' AND column_name IN ('scope_ref','revision','docket_number'))
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_case_events' AND column_name='dimension')
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname='legal_cases_case_type_v2_chk')
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('legal_cases_case_type_check','legal_cases_case_type_chk','legal_cases_case_number_key'))
  AND (SELECT is_nullable='YES' FROM information_schema.columns WHERE table_name='legal_cases' AND column_name='case_number')
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname='legal_case_events_matter_fk');
SELECT 'RESIDUAL: RLS stays enabled and anon/authenticated privileges are NOT restored on the legacy legal tables',
  (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('legal_cases','legal_case_events','case_history','case_tags'))
  AND NOT EXISTS (SELECT 1 FROM pg_class c, aclexplode(c.relacl) a WHERE c.relname IN ('legal_cases','legal_case_events','case_history','case_tags') AND a.grantee::regrole::text IN ('anon','authenticated'));
SELECT 'original legal rows (SYN-1, SYN-1b, their event/history/tag) survive the partial cleanup, still unscoped',
  (SELECT count(*)=2 FROM legal_cases WHERE case_number IN ('SYN-1','SYN-1b') AND scope_ref IS NULL) AND (SELECT count(*)=1 FROM case_history) AND (SELECT count(*)=1 FROM case_tags);
\else
SELECT 'L1 intact: 7 new tables, view, role, triggers, rows preserved',
  (SELECT count(*)=7 FROM pg_tables WHERE tablename IN ('legal_parties','legal_awards','legal_award_obligors','legal_evidence_refs','legal_evidence_requirements','legal_source_links','legal_matter_properties'))
  AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_legal_runtime') AND (SELECT count(*)=2 FROM legal_parties) AND (SELECT count(*)=1 FROM legal_awards) AND (SELECT count(*)=1 FROM legal_matter_properties)
  AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='legal_cases_guard' AND NOT tgisinternal);
\endif
\if :s2
SELECT 'D1 rollback did not remove or weaken the legal role: exact L1 privileges still held, no D1 privilege left behind',
  has_table_privilege('ecc_legal_runtime','legal_awards','update') AND NOT has_table_privilege('ecc_legal_runtime','legal_awards','delete') AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relname LIKE 'document\_%');
\endif
