\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean); GRANT ALL ON results TO PUBLIC;
CREATE OR REPLACE FUNCTION pg_temp.expect_err(sql text, state text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE = state; END $$;
CREATE TABLE _chk AS SELECT (SELECT count(*) FROM legacy_staging) n, (SELECT md5(string_agg(payload::text, '' ORDER BY id)) FROM legacy_staging) h;
GRANT ALL ON _chk TO PUBLIC;
\i :proposal
-- fixtures (as superuser)
INSERT INTO legal_cases (case_number, case_type, status, scope_ref, court_ref, docket_number)
  VALUES (NULL,'collections','filed','scopeA','courtX','D-1'), (NULL,'eviction_and_damages','filed','scopeB','courtX','D-1');
INSERT INTO legal_parties (matter_id, role, display_name)
  SELECT id, 'defendant', 'Party One' FROM legal_cases WHERE scope_ref='scopeA'
  UNION ALL SELECT id, 'defendant', 'Party Two' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_awards (matter_id, award_kind) SELECT id,'rent' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_awards (matter_id, award_kind, amount_cents, currency) SELECT id,'fees',0,'USD' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_awards (matter_id, award_kind, amount_cents, currency) SELECT id,'damages',100000,'USD' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_award_obligors SELECT a.id, p.id, 'joint' FROM legal_awards a, legal_parties p WHERE a.award_kind='damages';
INSERT INTO legal_award_obligors SELECT a.id, p.id, 'joint' FROM legal_awards a, legal_parties p WHERE a.award_kind='rent';
INSERT INTO legal_evidence_requirements (matter_id, requirement_key) SELECT id,'lease' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_evidence_refs (matter_id, ref_kind, storage_ref, restricted)
  SELECT id,'doc','opaque-1',false FROM legal_cases WHERE scope_ref='scopeA'
  UNION ALL SELECT id,'doc','opaque-2',true FROM legal_cases WHERE scope_ref='scopeA';

INSERT INTO results SELECT 'case_type collections+eviction_and_damages now writable', count(*)=2 FROM legal_cases WHERE case_type IN ('collections','eviction_and_damages');
INSERT INTO results SELECT 'docket identity is scoped: same docket in two scopes ok', true;
INSERT INTO results SELECT 'duplicate docket within scope rejected', pg_temp.expect_err($$INSERT INTO legal_cases (case_type,status,scope_ref,court_ref,docket_number) VALUES ('other','draft','scopeA','courtX','D-1')$$, '23505');
INSERT INTO legal_cases (case_type,status) VALUES ('other','draft'),('other','draft');
INSERT INTO results SELECT 'unknown docket (NULL case_number/scope) allowed twice', (SELECT count(*)=2 FROM legal_cases WHERE case_number IS NULL AND scope_ref IS NULL);
INSERT INTO results SELECT 'null amount stays NULL (unknown)', (SELECT amount_cents IS NULL AND currency IS NULL FROM legal_awards WHERE award_kind='rent');
INSERT INTO results SELECT 'explicit zero is distinct from NULL', (SELECT amount_cents = 0 FROM legal_awards WHERE award_kind='fees');
INSERT INTO results SELECT 'amount without currency rejected', pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents) SELECT id,'rent',5 FROM legal_cases LIMIT 1$$, '23514');
INSERT INTO results SELECT 'negative amount rejected', pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents,currency) SELECT id,'rent',-1,'USD' FROM legal_cases LIMIT 1$$, '23514');
INSERT INTO results SELECT 'joint award counted once (2 obligors, 100000)', (SELECT known_cents = 100000 FROM legal_matter_award_totals WHERE currency='USD');
INSERT INTO results SELECT 'unknown awards counted separately, not summed as 0', (SELECT unknown_count = 1 FROM legal_matter_award_totals WHERE currency IS NULL);
INSERT INTO results SELECT 'obligor table has no money column', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_award_obligors' AND column_name ~ 'cent|amount');
INSERT INTO results SELECT 'legacy staging rows preserved (216, same hash)', (SELECT n=216 AND h=(SELECT md5(string_agg(payload::text,'' ORDER BY id)) FROM legacy_staging) FROM _chk);
INSERT INTO results SELECT 'anon has no DML on legal tables', NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated') AND table_name LIKE 'legal%');
INSERT INTO results SELECT 'runtime role is NOBYPASSRLS', (SELECT NOT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname='ecc_legal_runtime');

-- caller-role boundaries
SET ROLE ecc_legal_runtime;
INSERT INTO results SELECT 'runtime without context sees nothing (fail closed)', (SELECT count(*) FROM legal_cases)=0 AND (SELECT count(*) FROM legal_awards)=0;
SELECT set_config('ecc.scope_refs','scopeA',false), set_config('ecc.actor','tester',false);
INSERT INTO results SELECT 'scopeA sees only own matter', (SELECT count(*)=1 AND bool_and(scope_ref='scopeA') FROM legal_cases);
INSERT INTO results SELECT 'scopeA sees own children only', (SELECT count(*)=2 FROM legal_parties) AND (SELECT count(*)=3 FROM legal_awards);
INSERT INTO results SELECT 'restricted evidence masked by default', (SELECT count(*)=1 FROM legal_evidence_refs);
SELECT set_config('ecc.restricted_evidence','on',false);
INSERT INTO results SELECT 'restricted evidence visible with grant', (SELECT count(*)=2 FROM legal_evidence_refs);
SELECT set_config('ecc.restricted_evidence','off',false);
INSERT INTO results SELECT 'cannot write into other scope', pg_temp.expect_err($$INSERT INTO legal_cases (case_type,status,scope_ref) VALUES ('other','draft','scopeB')$$, '42501');
INSERT INTO results SELECT 'runtime cannot UPDATE journal', pg_temp.expect_err($$UPDATE legal_case_events SET event_type='x'$$, '42501');
INSERT INTO results SELECT 'runtime cannot DELETE journal', pg_temp.expect_err($$DELETE FROM legal_case_events$$, '42501');
INSERT INTO results SELECT 'runtime cannot read legacy case_history', (SELECT count(*)=0 FROM case_history);

-- revisions + dimensions kept separate and journalled
UPDATE legal_awards SET judgment_verification='verified', revision=1 WHERE award_kind='damages';
INSERT INTO results SELECT 'verification change bumps revision', (SELECT revision=2 FROM legal_awards WHERE award_kind='damages');
INSERT INTO results SELECT 'stale revision rejected', pg_temp.expect_err($$UPDATE legal_awards SET collection_readiness='ready', revision=1 WHERE award_kind='damages'$$, '40001');
UPDATE legal_awards SET collection_readiness='ready', revision=2 WHERE award_kind='damages';
INSERT INTO results SELECT 'verification and readiness are independent', (SELECT judgment_verification='verified' AND collection_readiness='ready' FROM legal_awards WHERE award_kind='damages');
UPDATE legal_cases SET status='pending_hearing', revision=1 WHERE scope_ref='scopeA';
INSERT INTO results SELECT 'matter lifecycle change does not touch awards', (SELECT count(*)=2 FROM legal_awards WHERE judgment_verification='unverified') ;
INSERT INTO results SELECT 'journal has one row per dimension change with actor', (SELECT count(*)=3 AND bool_and(actor='tester') AND count(DISTINCT dimension)=3 FROM legal_case_events);
RESET ROLE;
SELECT set_config('ecc.actor','',false);
SET ROLE ecc_legal_runtime; SELECT set_config('ecc.scope_refs','scopeA',false);
INSERT INTO results SELECT 'no actor context => change refused', pg_temp.expect_err($$UPDATE legal_cases SET status='closed', revision=2 WHERE scope_ref='scopeA'$$, '42501');
RESET ROLE;
SELECT name, ok FROM results WHERE NOT ok;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total FROM results;
