\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean);
\i :proposal
-- 1) populated table => rollback refuses and changes nothing
INSERT INTO legal_cases (case_type,status,scope_ref) VALUES ('other','draft','s');
INSERT INTO legal_parties (matter_id, role, display_name) SELECT id,'other','p' FROM legal_cases WHERE scope_ref='s';
SELECT count(*) AS parties_before FROM legal_parties \gset
\set ON_ERROR_STOP off
\i :rollback
\set ON_ERROR_STOP on
ROLLBACK;
INSERT INTO results SELECT 'rollback refused while populated; tables and role intact',
  (SELECT count(*)=:parties_before FROM legal_parties) AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_legal_runtime');
-- 2) empty => partial cleanup with documented residual state
DELETE FROM legal_parties; DELETE FROM legal_cases WHERE scope_ref='s';
\i :rollback
INSERT INTO results SELECT 'new tables dropped', NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename IN ('legal_parties','legal_awards','legal_award_obligors','legal_evidence_refs','legal_evidence_requirements','legal_source_links','legal_matter_properties'));
INSERT INTO results SELECT 'runtime role, functions and triggers removed', NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_legal_runtime')
  AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname IN ('legal_scope_ok','legal_actor','legal_matter_guard','legal_award_guard','legal_evidence_guard'))
  AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname IN ('legal_cases_guard','legal_events_no_mutate') AND NOT tgisinternal);
INSERT INTO results SELECT 'RESIDUAL: additive columns retained', EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_cases' AND column_name IN ('scope_ref','revision'))
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_case_events' AND column_name='dimension');
INSERT INTO results SELECT 'RESIDUAL: union case_type check retained, original pair NOT recreated',
  EXISTS (SELECT 1 FROM pg_constraint WHERE conname='legal_cases_case_type_v2_chk')
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('legal_cases_case_type_check','legal_cases_case_type_chk'));
INSERT INTO results SELECT 'RESIDUAL: case_number stays nullable, global unique NOT recreated',
  (SELECT is_nullable='YES' FROM information_schema.columns WHERE table_name='legal_cases' AND column_name='case_number')
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='legal_cases_case_number_key');
INSERT INTO results SELECT 'RESIDUAL: RLS stays enabled and anon/authenticated grants stay revoked (NOT restored)',
  (SELECT relrowsecurity FROM pg_class WHERE relname='legal_cases')
  AND NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated') AND table_name LIKE 'legal%');
SELECT name, ok FROM results WHERE NOT ok;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total FROM results;
