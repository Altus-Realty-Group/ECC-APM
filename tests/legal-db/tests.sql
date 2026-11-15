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
  SELECT id, 'defendant', 'Party One' FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1'
  UNION ALL SELECT id, 'defendant', 'Party Two' FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1';
INSERT INTO legal_awards (matter_id, award_kind) SELECT id,'rent' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_awards (matter_id, award_kind, amount_cents, currency) SELECT id,'fees',0,'USD' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_awards (matter_id, award_kind, amount_cents, currency) SELECT id,'damages',100000,'USD' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability) SELECT a.matter_id, a.id, p.id, 'joint' FROM legal_awards a JOIN legal_parties p ON p.matter_id=a.matter_id WHERE a.award_kind='damages';
INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability) SELECT a.matter_id, a.id, p.id, 'joint' FROM legal_awards a JOIN legal_parties p ON p.matter_id=a.matter_id WHERE a.award_kind='rent' AND a.matter_id IN (SELECT id FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1');
INSERT INTO legal_evidence_requirements (matter_id, requirement_key) SELECT id,'lease' FROM legal_cases WHERE scope_ref='scopeA';
INSERT INTO legal_evidence_refs (matter_id, ref_kind, storage_ref, restricted)
  SELECT id,'doc','opaque-1',false FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1'
  UNION ALL SELECT id,'doc','opaque-2',true FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1';

INSERT INTO legal_cases (case_type,status,scope_ref,court_ref,docket_number) VALUES ('other','filed','scopeA','courtX','D-2');
INSERT INTO legal_parties (matter_id, role, display_name) SELECT id,'defendant','Other Matter Party' FROM legal_cases WHERE docket_number='D-2';
INSERT INTO legal_parties (matter_id, role, display_name) SELECT id,'defendant','ScopeB Party' FROM legal_cases WHERE scope_ref='scopeB';
INSERT INTO legal_awards (matter_id, award_kind) SELECT id,'costs' FROM legal_cases WHERE scope_ref='scopeB';
INSERT INTO legal_evidence_requirements (matter_id, requirement_key) SELECT id,'other-matter-req' FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA';
INSERT INTO legal_evidence_requirements (matter_id, requirement_key) SELECT id,'scopeB-req' FROM legal_cases WHERE scope_ref='scopeB';
CREATE TABLE _b AS SELECT a.matter_id mb, a.id aid, p.id pid, r.id rid, (SELECT id FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA') ma
  FROM legal_awards a JOIN legal_parties p ON p.matter_id=a.matter_id JOIN legal_evidence_requirements r ON r.matter_id=a.matter_id
  WHERE a.matter_id=(SELECT id FROM legal_cases WHERE scope_ref='scopeB');
GRANT SELECT ON _b TO PUBLIC;
INSERT INTO properties DEFAULT VALUES;
INSERT INTO legal_matter_properties (matter_id, property_id) SELECT (SELECT id FROM legal_cases WHERE docket_number='D-2'), id_uuid FROM properties LIMIT 1;
INSERT INTO results SELECT 'duplicate property-only link (NULL unit/lease) rejected',
  pg_temp.expect_err($$INSERT INTO legal_matter_properties (matter_id, property_id) SELECT (SELECT id FROM legal_cases WHERE docket_number='D-2'), id_uuid FROM properties LIMIT 1$$, '23505');
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
INSERT INTO results SELECT 'unknown awards counted separately, not summed as 0', (SELECT unknown_count = 1 FROM legal_matter_award_totals t JOIN legal_cases m ON m.id=t.matter_id WHERE t.currency IS NULL AND m.scope_ref='scopeA');
INSERT INTO results SELECT 'obligor table has no money column', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_award_obligors' AND column_name ~ 'cent|amount');
INSERT INTO results SELECT 'legacy staging rows preserved (216, same hash)', (SELECT n=216 AND h=(SELECT md5(string_agg(payload::text,'' ORDER BY id)) FROM legacy_staging) FROM _chk);
INSERT INTO results SELECT 'anon has no DML on legal tables', NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated') AND table_name LIKE 'legal%');
INSERT INTO results SELECT 'runtime role is NOBYPASSRLS', (SELECT NOT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname='ecc_legal_runtime');

-- caller-role boundaries
SET ROLE ecc_legal_runtime;
INSERT INTO results SELECT 'runtime without context sees nothing (fail closed)', (SELECT count(*) FROM legal_cases)=0 AND (SELECT count(*) FROM legal_awards)=0;
SELECT set_config('ecc.scope_refs','scopeA',false), set_config('ecc.actor','tester',false);
INSERT INTO results SELECT 'scopeA sees only own matter', (SELECT count(*)=2 AND bool_and(scope_ref='scopeA') FROM legal_cases);
INSERT INTO results SELECT 'scopeA sees own children only', (SELECT count(*)=3 FROM legal_parties) AND (SELECT count(*)=3 FROM legal_awards);
INSERT INTO results SELECT 'restricted evidence masked by default', (SELECT count(*)=1 FROM legal_evidence_refs);
SELECT set_config('ecc.restricted_evidence','on',false);
INSERT INTO results SELECT 'restricted evidence visible with grant', (SELECT count(*)=2 FROM legal_evidence_refs);
SELECT set_config('ecc.restricted_evidence','off',false);
INSERT INTO results SELECT 'cannot write into other scope', pg_temp.expect_err($$INSERT INTO legal_cases (case_type,status,scope_ref) VALUES ('other','draft','scopeB')$$, '42501');
INSERT INTO results SELECT 'runtime cannot UPDATE journal', pg_temp.expect_err($$UPDATE legal_case_events SET event_type='x'$$, '42501');
INSERT INTO results SELECT 'runtime cannot DELETE journal', pg_temp.expect_err($$DELETE FROM legal_case_events$$, '42501');
INSERT INTO results SELECT 'runtime cannot read legacy case_history', (SELECT count(*)=0 FROM case_history);

-- revisions + dimensions kept separate and journalled
UPDATE legal_awards SET judgment_verification='verified', revision=2 WHERE award_kind='damages';
INSERT INTO results SELECT 'verification change bumps revision', (SELECT revision=2 FROM legal_awards WHERE award_kind='damages');
INSERT INTO results SELECT 'stale revision rejected', pg_temp.expect_err($$UPDATE legal_awards SET collection_readiness='ready', revision=2 WHERE award_kind='damages'$$, '40001');
UPDATE legal_awards SET collection_readiness='ready', revision=3 WHERE award_kind='damages';
INSERT INTO results SELECT 'verification and readiness are independent', (SELECT judgment_verification='verified' AND collection_readiness='ready' FROM legal_awards WHERE award_kind='damages');
UPDATE legal_cases SET status='pending_hearing', revision=2 WHERE scope_ref='scopeA' AND docket_number='D-1';
INSERT INTO results SELECT 'matter lifecycle change does not touch awards', (SELECT count(*)=2 FROM legal_awards WHERE judgment_verification='unverified') ;
INSERT INTO results SELECT 'journal has one row per dimension change with actor', (SELECT count(*)=3 AND bool_and(actor='tester') AND count(DISTINCT dimension)=3 FROM legal_case_events);

-- evidence confidence: guarded + journalled (still scopeA runtime, actor 'tester')
UPDATE legal_evidence_refs SET confidence='high', revision=2 WHERE storage_ref='opaque-1';
INSERT INTO results SELECT 'evidence confidence change bumps revision', (SELECT revision=2 AND confidence='high' FROM legal_evidence_refs WHERE storage_ref='opaque-1');
INSERT INTO results SELECT 'evidence confidence stale revision rejected', pg_temp.expect_err($$UPDATE legal_evidence_refs SET confidence='low', revision=2 WHERE storage_ref='opaque-1'$$, '40001');
INSERT INTO results SELECT 'evidence_confidence journalled with actor', (SELECT count(*)=1 AND bool_and(actor='tester' AND from_status='unreviewed' AND to_status='high') FROM legal_case_events WHERE dimension='evidence_confidence');
INSERT INTO results SELECT 'all four dimensions never cross-write', (SELECT count(DISTINCT dimension)=4 FROM legal_case_events);

-- review fix: revision cannot be bypassed by omitting it; rows cannot be born at final dimension values
INSERT INTO results SELECT 'omitted revision rejected on matter, award and evidence',
  pg_temp.expect_err($$UPDATE legal_cases SET status='closed' WHERE scope_ref='scopeA' AND docket_number='D-1'$$, '40001')
  AND pg_temp.expect_err($$UPDATE legal_awards SET judgment_verification='disputed' WHERE award_kind='damages'$$, '40001')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET confidence='low' WHERE storage_ref='opaque-1'$$, '40001');
INSERT INTO results SELECT 'omitted-revision writes changed nothing',
  (SELECT status='pending_hearing' FROM legal_cases WHERE scope_ref='scopeA' AND docket_number='D-1')
  AND (SELECT judgment_verification='verified' FROM legal_awards WHERE award_kind='damages')
  AND (SELECT confidence='high' FROM legal_evidence_refs WHERE storage_ref='opaque-1');
INSERT INTO results SELECT 'insert of an already-verified/ready award rejected (no actor needed to try)',
  pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,judgment_verification) SELECT id,'rent','verified' FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA'$$, '23514')
  AND pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,collection_readiness) SELECT id,'rent','ready' FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA'$$, '23514')
  AND pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,revision) SELECT id,'rent',9 FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA'$$, '23514');
INSERT INTO results SELECT 'insert of high-confidence evidence rejected',
  pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,confidence) SELECT id,'doc','born-high','high' FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA'$$, '23514');

-- matter integrity at the constraint boundary (same scope, different matter)
INSERT INTO results SELECT 'obligor: award of matter D-1 + party of matter D-2 rejected (FK)',
  pg_temp.expect_err($$INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability)
    SELECT a.matter_id, a.id, p.id, 'joint' FROM legal_awards a, legal_parties p
    WHERE a.award_kind='fees' AND p.display_name='Other Matter Party'$$, '23503');
INSERT INTO results SELECT 'obligor: claiming the other matter id for a D-1 award rejected (FK)',
  pg_temp.expect_err($$INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability)
    SELECT p.matter_id, a.id, p.id, 'joint' FROM legal_awards a, legal_parties p
    WHERE a.award_kind='fees' AND p.display_name='Other Matter Party'$$, '23503');
INSERT INTO results SELECT 'evidence ref: requirement from another matter in same scope rejected (FK)',
  pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id, requirement_id, ref_kind, storage_ref)
    SELECT m.id, r.id, 'doc', 'x' FROM legal_cases m, legal_evidence_requirements r
    WHERE m.docket_number='D-1' AND m.scope_ref='scopeA' AND r.requirement_key='other-matter-req'$$, '23503');
-- different scope
INSERT INTO results SELECT 'obligor: scopeB rows written by scopeA caller rejected (RLS), no row stored',
  pg_temp.expect_err($$INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability)
    SELECT mb, aid, pid, 'joint' FROM _b$$, '42501');
INSERT INTO results SELECT 'evidence ref: scopeB requirement into scopeA matter rejected (FK, ids supplied explicitly)',
  pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id, requirement_id, ref_kind, storage_ref)
    SELECT ma, rid, 'doc', 'y' FROM _b$$, '23503');
INSERT INTO results SELECT 'evidence ref: scopeA matter id on a scopeB row rejected (RLS)',
  pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id, requirement_id, ref_kind, storage_ref)
    SELECT mb, rid, 'doc', 'z' FROM _b$$, '42501');
-- matter association cannot be moved by update
INSERT INTO results SELECT 'award matter_id immutable',
  pg_temp.expect_err($$UPDATE legal_awards SET matter_id=(SELECT id FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA'), revision=2 WHERE award_kind='fees'$$, '23514');
INSERT INTO results SELECT 'party matter_id immutable',
  pg_temp.expect_err($$UPDATE legal_parties SET matter_id=(SELECT id FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA') WHERE display_name='Party One'$$, '23514');
INSERT INTO results SELECT 'evidence ref matter_id immutable',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET matter_id=(SELECT id FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA'), revision=3 WHERE storage_ref='opaque-1'$$, '23514');

-- money rules shared with shared/legal/contracts.ts parseMoney
INSERT INTO results SELECT 'NULL amount with currency rejected (matches contract)',
  pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents,currency) SELECT id,'rent',NULL,'USD' FROM legal_cases WHERE docket_number='D-1' AND scope_ref='scopeA'$$, '23514');
INSERT INTO legal_awards (matter_id,award_kind,amount_cents,currency)
  SELECT id,'rent',9007199254740991,'USD' FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA';   -- must succeed (ON_ERROR_STOP)
INSERT INTO results SELECT 'amount at JS MAX_SAFE_INTEGER stored exactly',
  (SELECT amount_cents = 9007199254740991 AND currency = 'USD' FROM legal_awards a JOIN legal_cases m ON m.id=a.matter_id WHERE m.docket_number='D-2' AND m.scope_ref='scopeA');
INSERT INTO results SELECT 'amount one above JS MAX_SAFE_INTEGER rejected by the cap',
  pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents,currency) SELECT id,'rent',9007199254740992,'USD' FROM legal_cases WHERE docket_number='D-2' AND scope_ref='scopeA'$$, '23514');

-- journal must not leak restricted evidence: an entitled caller changes restricted confidence, an unentitled caller reads the journal
SELECT set_config('ecc.restricted_evidence','on',false);
UPDATE legal_evidence_refs SET confidence='medium', revision=2 WHERE storage_ref='opaque-2';
INSERT INTO results SELECT 'entitled caller sees the restricted evidence_confidence journal row',
  (SELECT count(*)=2 FROM legal_case_events WHERE dimension='evidence_confidence');
SELECT set_config('ecc.restricted_evidence','off',false);
INSERT INTO results SELECT 'unentitled same-scope caller does not see restricted evidence journal row or its id/confidence',
  (SELECT count(*)=1 AND bool_and(to_status='high') FROM legal_case_events WHERE dimension='evidence_confidence')
  AND NOT EXISTS (SELECT 1 FROM legal_case_events WHERE to_status='medium');

-- context isolation: transaction-local settings do not leak across transactions (pool reuse)
RESET ROLE;
SELECT set_config('ecc.scope_refs','',false), set_config('ecc.actor','',false), set_config('ecc.restricted_evidence','off',false);
SET ROLE ecc_legal_runtime;
BEGIN;
SELECT set_config('ecc.scope_refs','scopeA',true);
INSERT INTO results SELECT 'tx-local context visible inside its transaction', (SELECT count(*)=2 FROM legal_cases);
COMMIT;
INSERT INTO results SELECT 'tx-local context cleared after commit (no pool leak)', (SELECT count(*)=0 FROM legal_cases);
-- documented LIMITATION: the runtime role can set its own custom settings; policies filter a trusted context, they do not verify it
SELECT set_config('ecc.scope_refs','scopeB',false);
INSERT INTO results SELECT 'LIMITATION documented: runtime can self-assign scope (not grant verification)', (SELECT count(*)=1 FROM legal_cases);
SELECT set_config('ecc.scope_refs','',false);
RESET ROLE;
SET ROLE ecc_legal_runtime; SELECT set_config('ecc.scope_refs','scopeA',false), set_config('ecc.actor','tester',false);
RESET ROLE;
SELECT set_config('ecc.actor','',false);
SET ROLE ecc_legal_runtime; SELECT set_config('ecc.scope_refs','scopeA',false);
INSERT INTO results SELECT 'no actor => confidence change refused and NOT applied (audit failure rolls the change back)',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET confidence='low', revision=3 WHERE storage_ref='opaque-1'$$, '42501');
INSERT INTO results SELECT 'confidence and revision unchanged after refused change', (SELECT confidence='high' AND revision=2 FROM legal_evidence_refs WHERE storage_ref='opaque-1');
INSERT INTO results SELECT 'no actor context => change refused', pg_temp.expect_err($$UPDATE legal_cases SET status='closed', revision=3 WHERE scope_ref='scopeA' AND docket_number='D-1'$$, '42501');
RESET ROLE;
SELECT name, ok FROM results WHERE NOT ok;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total FROM results;
