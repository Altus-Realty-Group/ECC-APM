-- 003 evidence linkage on the corrected combined reconstruction: 001, D1, 002, then 003. Variables: -v legal -v documents -v ref -v link (proposal paths) -v fixtures.
-- Every check lands in `results`; the last line is `passed|total`. Synthetic rows only. SQL integrity here is NOT document authorization.
\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean);
CREATE FUNCTION pg_temp.expect_err(sql text, state text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE = state; END $$;
CREATE FUNCTION pg_temp.outcome(sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text; BEGIN EXECUTE sql INTO r; RETURN r; EXCEPTION WHEN OTHERS THEN RETURN 'ERR:' || SQLSTATE; END $$;
CREATE FUNCTION pg_temp.privs(r text) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(c.relname||':'||p, ',' ORDER BY c.relname, p), '') FROM pg_class c
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
  WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','v','p') AND c.relname !~ '^(_|results$)' AND has_table_privilege(r, c.oid, p) $$;
\i :legal
\i :documents
\i :ref

-- ===== fixtures that exist BEFORE 003: D1 documents/versions, L1 matters/requirements and LEGACY evidence refs (see fixtures.sql) =====
\i :fixtures
CREATE TABLE _leg AS SELECT md5(string_agg(row(id,matter_id,requirement_id,ref_kind,storage_ref,confidence,restricted,revision)::text,'|' ORDER BY id)) h, count(*) n FROM legal_evidence_refs;
CREATE TABLE _pre AS SELECT
  (SELECT string_agg(relname||relkind::text, ',' ORDER BY relname) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v','p') AND relname !~ '^(_|results$)') rels,
  (SELECT string_agg(rolname, ',' ORDER BY rolname) FROM pg_roles WHERE rolname LIKE 'ecc\_%') roles,
  pg_temp.privs('ecc_legal_runtime') pl, pg_temp.privs('ecc_documents_runtime') pd, pg_temp.privs('anon') pa, pg_temp.privs('authenticated') pu,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') pols,
  (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace) fns,
  (SELECT count(*) FROM pg_trigger WHERE tgrelid='legal_evidence_refs'::regclass AND NOT tgisinternal) trgs;
\i :link

-- ===== legacy refs stay unbound; nothing is parsed or rewritten =====
INSERT INTO results SELECT 'legacy refs: new fields NULL on every row, original columns byte-identical, no row added or rewritten',
  (SELECT count(*)=6 AND bool_and(document_version_id IS NULL AND withdrawn_at IS NULL) FROM legal_evidence_refs)
  AND (SELECT h FROM _leg)=(SELECT md5(string_agg(row(id,matter_id,requirement_id,ref_kind,storage_ref,confidence,restricted,revision)::text,'|' ORDER BY id)) FROM legal_evidence_refs)
  AND (SELECT count(*)=0 FROM legal_case_events WHERE dimension IN ('evidence_attachment','evidence_confidence'));
INSERT INTO results SELECT 'a storage_ref equal to a registered version id does NOT bind it; no function or constraint reads storage_ref as an identity',
  (SELECT document_version_id IS NULL FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001')
  AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname ~ '^legal_(evidence_link|attach_evidence|withdraw_evidence)' AND prosrc ~* 'storage_ref\s*(::uuid|~|like|=)')
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='legal_evidence_refs'::regclass AND pg_get_constraintdef(oid) ~ 'storage_ref');
INSERT INTO results SELECT 'object delta: 2 columns, 1 FK, 1 CHECK, 1 partial unique index, 3 triggers, 5 functions; ZERO new tables/views/roles/grants/policies',
  (SELECT count(*)=2 FROM information_schema.columns WHERE table_name='legal_evidence_refs' AND column_name IN ('document_version_id','withdrawn_at'))
  AND (SELECT string_agg(relname||relkind::text, ',' ORDER BY relname) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v','p') AND relname !~ '^(_|results$)')=(SELECT rels FROM _pre)
  AND (SELECT string_agg(rolname, ',' ORDER BY rolname) FROM pg_roles WHERE rolname LIKE 'ecc\_%')=(SELECT roles FROM _pre)
  AND pg_temp.privs('ecc_legal_runtime')=(SELECT pl FROM _pre) AND pg_temp.privs('ecc_documents_runtime')=(SELECT pd FROM _pre)
  AND pg_temp.privs('anon')=(SELECT pa FROM _pre) AND pg_temp.privs('authenticated')=(SELECT pu FROM _pre)
  AND (SELECT count(*) FROM pg_policies WHERE schemaname='public')=(SELECT pols FROM _pre)
  AND (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace)=(SELECT fns FROM _pre)+5
  AND (SELECT count(*) FROM pg_trigger WHERE tgrelid='legal_evidence_refs'::regclass AND NOT tgisinternal)=(SELECT trgs FROM _pre)+3
  AND (SELECT count(*)=1 FROM pg_indexes WHERE indexname='legal_evidence_refs_binding_uq' AND indexdef ~ 'NULLS NOT DISTINCT' AND indexdef ~ 'document_version_id IS NOT NULL');

-- ===== direct INSERT cannot carry a binding or a withdrawal =====
INSERT INTO legal_evidence_refs (id, matter_id, requirement_id, ref_kind, storage_ref) VALUES
  ('00000000-0000-4000-8000-00000000e101','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a301','doc','n1'),
  ('00000000-0000-4000-8000-00000000e102','00000000-0000-4000-8000-0000000f0a01',NULL,'doc','n2'),
  ('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a302','doc','n3'),
  ('00000000-0000-4000-8000-00000000e104','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a302','doc','n4'),
  ('00000000-0000-4000-8000-00000000e105','00000000-0000-4000-8000-0000000f0a01',NULL,'doc','n5');
INSERT INTO results SELECT 'owner INSERT with a version, a withdrawal, or both is refused 23514 (no journal or revision bypass); an unbound INSERT works',
  pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,document_version_id) VALUES ('00000000-0000-4000-8000-0000000f0a01','doc','x','00000000-0000-4000-8000-0000000001a1')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,document_version_id,withdrawn_at) VALUES ('00000000-0000-4000-8000-0000000f0a01','doc','x','00000000-0000-4000-8000-0000000001a1',now())$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,withdrawn_at) VALUES ('00000000-0000-4000-8000-0000000f0a01','doc','x',now())$$,'23514')
  AND (SELECT count(*)=11 FROM legal_evidence_refs) AND (SELECT count(*)=0 FROM legal_case_events WHERE dimension='evidence_attachment');

-- ===== runtime-role context helpers: scopeA caller with an actor =====
SET ROLE ecc_legal_runtime;
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1, set_config('ecc.actor','tester',false) AS c2, set_config('ecc.restricted_evidence','off',false) AS c3 \gset
SELECT pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,document_version_id) VALUES ('00000000-0000-4000-8000-0000000f0a01','doc','x','00000000-0000-4000-8000-0000000001a1')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,withdrawn_at) VALUES ('00000000-0000-4000-8000-0000000f0a01','doc','x',now())$$,'23514') AS ok1 \gset
RESET ROLE;
INSERT INTO results VALUES ('the scoped runtime role cannot INSERT a bound or withdrawn reference either', nullif(:'ok1','')::boolean);

-- ===== valid attachment: exact registered version, expected revision, actor, journal =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-0000000001a1',1)$$) AS o1 \gset
RESET ROLE;
INSERT INTO results SELECT 'valid attach (expected revision 1, actor set): returns attached, binds exactly that version, revision 2, confidence/requirement/restricted untouched',
  :'o1'='attached' AND (SELECT document_version_id='00000000-0000-4000-8000-0000000001a1' AND revision=2 AND confidence='unreviewed' AND requirement_id='00000000-0000-4000-8000-00000000a301' AND NOT restricted AND withdrawn_at IS NULL
     FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001');
INSERT INTO results SELECT 'attach appended exactly one content-free journal event in the same statement (states and subject only; no version, document or name)',
  (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001' AND dimension='evidence_attachment')
  AND (SELECT event_type='evidence_attached' AND from_status='unbound' AND to_status='attached' AND actor='tester' AND metadata IS NULL AND legal_case_id='00000000-0000-4000-8000-0000000f0a01'
     FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001' AND dimension='evidence_attachment')
  AND NOT EXISTS (SELECT 1 FROM legal_case_events WHERE dimension='evidence_attachment' AND (to_jsonb(legal_case_events)::text ~ '0000000001a|Agreement|synthetic'));

-- ===== one version, several requirements and matters, bytes never copied =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e004','00000000-0000-4000-8000-0000000001a1',1)$$) AS o1 \gset
SELECT set_config('ecc.scope_refs','scopeB',false) AS c1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e005','00000000-0000-4000-8000-0000000001a1',1)$$) AS o2 \gset
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1 \gset
RESET ROLE;
INSERT INTO results SELECT 'the same version supports a distinct requirement (same matter) and another matter through separate refs; no document or version row is copied',
  :'o1'='attached' AND :'o2'='attached' AND (SELECT count(*)=3 FROM legal_evidence_refs WHERE document_version_id='00000000-0000-4000-8000-0000000001a1')
  AND (SELECT count(*)=3 FROM document_versions) AND (SELECT count(*)=2 FROM document_records);

-- ===== duplicate bindings: no second row, no second event; null requirement included; replay is a no-op =====
SELECT count(*) AS ev_before FROM legal_case_events WHERE dimension='evidence_attachment' \gset
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e101','00000000-0000-4000-8000-0000000001a1',1)$$) AS o1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-0000000001a1',1)$$) AS o2 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e002','00000000-0000-4000-8000-0000000001a2',1)$$) AS o3 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e102','00000000-0000-4000-8000-0000000001a2',1)$$) AS o4 \gset
RESET ROLE;
INSERT INTO results SELECT 'a second ref for the same matter/requirement/version is refused 23505; the loser stays unbound at revision 1 with no event',
  :'o1'='ERR:23505' AND (SELECT document_version_id IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e101')
  AND (SELECT count(*)=0 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e101');
INSERT INTO results SELECT 'an exact replay of a completed attach returns already_attached and adds no row, no revision and no event',
  :'o2'='already_attached' AND (SELECT revision=2 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001' AND dimension='evidence_attachment');
INSERT INTO results SELECT 'a NULL (unassigned) requirement is a real binding key: the duplicate is refused 23505 (NULLS NOT DISTINCT) and journals nothing',
  :'o3'='attached' AND :'o4'='ERR:23505' AND (SELECT document_version_id IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e102')
  AND (SELECT count(*)=0 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e102');
INSERT INTO results SELECT 'total attachment events equal total successful attaches (4): duplicates and replays created none', (SELECT count(*)=:ev_before+1 FROM legal_case_events WHERE dimension='evidence_attachment') AND :ev_before=3;

-- ===== invalid versions, stale/omitted/skipped revisions: refused, nothing changes =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-00000000dead',1)$$) AS o1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103',NULL,1)$$) AS o2 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',0)$$) AS o3 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',NULL)$$) AS o4 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',7)$$) AS o5 \gset
SELECT pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1' WHERE id='00000000-0000-4000-8000-00000000e103'$$,'40001') AS o6 \gset
SELECT pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', revision=3 WHERE id='00000000-0000-4000-8000-00000000e103'$$,'40001') AS o7 \gset
RESET ROLE;
INSERT INTO results SELECT 'unknown version 23503; NULL/zero/missing expected revision 22023; stale revision 40001; omitted revision and skipped revision 40001; row and journal unchanged',
  :'o1'='ERR:23503' AND :'o2'='ERR:22023' AND :'o3'='ERR:22023' AND :'o4'='ERR:22023' AND :'o5'='ERR:40001' AND nullif(:'o6','')::boolean AND nullif(:'o7','')::boolean
  AND (SELECT document_version_id IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e103') AND (SELECT count(*)=0 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e103');

-- ===== actor, scope and context: unavailable is indistinguishable and changes nothing =====
SET ROLE ecc_legal_runtime;
SELECT set_config('ecc.actor','',false) AS c1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',1)$$) AS o1 \gset
SELECT pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', revision=2 WHERE id='00000000-0000-4000-8000-00000000e103'$$,'42501') AS o2 \gset
SELECT set_config('ecc.actor','tester',false) AS c1, set_config('ecc.scope_refs','scopeB',false) AS c2 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',1)$$) AS o3 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-0000000001a1',1)$$) AS o4 \gset
SELECT pg_temp.outcome($$SELECT legal_withdraw_evidence_version('00000000-0000-4000-8000-00000000e001',2)$$) AS o5 \gset
SELECT set_config('ecc.scope_refs','',false) AS c1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',1)$$) AS o6 \gset
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1 \gset
RESET ROLE;
INSERT INTO results SELECT 'no actor: command and direct UPDATE both 42501 and nothing changes; wrong-scope and no-context callers get the same 42501 (even for an existing, already-bound ref)',
  :'o1'='ERR:42501' AND nullif(:'o2','')::boolean AND :'o3'='ERR:42501' AND :'o4'='ERR:42501' AND :'o5'='ERR:42501' AND :'o6'='ERR:42501'
  AND (SELECT document_version_id IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e103')
  AND (SELECT revision=2 AND withdrawn_at IS NULL FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001');

-- ===== bound association is immutable; attach/withdraw change nothing else =====
INSERT INTO results SELECT 'a bound ref cannot be retargeted (23514), unbound (23514), moved to another requirement (23514) or another matter (23514); no journal row results',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001a2', revision=3 WHERE id='00000000-0000-4000-8000-00000000e001'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id=NULL, revision=3 WHERE id='00000000-0000-4000-8000-00000000e001'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET requirement_id='00000000-0000-4000-8000-00000000a302', revision=3 WHERE id='00000000-0000-4000-8000-00000000e001'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET matter_id='00000000-0000-4000-8000-0000000f0b01', revision=3 WHERE id='00000000-0000-4000-8000-00000000e001'$$,'23514')
  AND (SELECT document_version_id='00000000-0000-4000-8000-0000000001a1' AND revision=2 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001');
INSERT INTO results SELECT 'an attach that also changes confidence, requirement, restricted or storage_ref is refused 23514 (attachment never changes confidence or requirement status)',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', confidence='high', revision=2 WHERE id='00000000-0000-4000-8000-00000000e104'$$,'23514') IS NOT NULL
  AND (SELECT document_version_id IS NULL AND confidence='unreviewed' FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e104')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', storage_ref='changed', revision=2 WHERE id='00000000-0000-4000-8000-00000000e104'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', restricted=true, revision=2 WHERE id='00000000-0000-4000-8000-00000000e104'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', requirement_id=NULL, revision=2 WHERE id='00000000-0000-4000-8000-00000000e104'$$,'23514');
INSERT INTO results SELECT 'same-matter requirement integrity is preserved: a requirement of another matter is refused by the composite FK (23503)',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET requirement_id='00000000-0000-4000-8000-00000000b301', revision=2 WHERE id='00000000-0000-4000-8000-00000000e104'$$,'23503');

-- ===== confidence guard and journal protocol retained on a bound ref =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.expect_err($$UPDATE legal_evidence_refs SET confidence='high' WHERE id='00000000-0000-4000-8000-00000000e001'$$,'40001') AS o1 \gset
SELECT pg_temp.outcome($$UPDATE legal_evidence_refs SET confidence='high', revision=3 WHERE id='00000000-0000-4000-8000-00000000e001' RETURNING 'ok'$$) AS o2 \gset
RESET ROLE;
INSERT INTO results SELECT 'confidence update on a bound ref still needs revision+1 (40001 without), succeeds with it, journals one evidence_confidence event and keeps the binding',
  nullif(:'o1','')::boolean AND :'o2'='ok' AND (SELECT confidence='high' AND revision=3 AND document_version_id='00000000-0000-4000-8000-0000000001a1' FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001' AND dimension='evidence_confidence')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e001' AND dimension='evidence_attachment');
INSERT INTO results SELECT 'a stale replay is a conflict, not a replay: after another change the old expected revision is refused',
  pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-0000000001a1',1)$$) IN ('ERR:23514','ERR:40001') AND (SELECT revision=3 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e001');

-- ===== withdrawal: explicit actor + expected revision, server time, one event, no restore, withdrawn rows still count =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_withdraw_evidence_version('00000000-0000-4000-8000-00000000e002',2)$$) AS o1 \gset
SELECT pg_temp.outcome($$SELECT legal_withdraw_evidence_version('00000000-0000-4000-8000-00000000e002',2)$$) AS o2 \gset
SELECT pg_temp.outcome($$SELECT legal_withdraw_evidence_version('00000000-0000-4000-8000-00000000e105',1)$$) AS o3 \gset
RESET ROLE;
INSERT INTO results SELECT 'withdraw: returns withdrawn, revision+1, exactly one evidence_withdrawn event; replay returns already_withdrawn with no new event; an unbound ref cannot be withdrawn (23514)',
  :'o1'='withdrawn' AND :'o2'='already_withdrawn' AND :'o3'='ERR:23514'
  AND (SELECT withdrawn_at IS NOT NULL AND revision=3 AND document_version_id='00000000-0000-4000-8000-0000000001a2' FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e002')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e002' AND event_type='evidence_withdrawn' AND from_status='attached' AND to_status='withdrawn')
  AND (SELECT count(*)=1 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e002' AND event_type='evidence_attached');
SET ROLE ecc_legal_runtime;
UPDATE legal_evidence_refs SET withdrawn_at='2000-01-01T00:00:00Z', revision=revision+1 WHERE id='00000000-0000-4000-8000-00000000e004';
RESET ROLE;
INSERT INTO results SELECT 'the server supplies the withdrawal time: a caller-supplied 2000-01-01 is replaced by the database clock',
  (SELECT withdrawn_at > now() - interval '5 minutes' AND withdrawn_at <= now() FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e004');
INSERT INTO results SELECT 'withdrawn evidence cannot be restored (23514), re-withdrawn (23514) or retargeted; its version and requirement stay bound',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET withdrawn_at=NULL, revision=revision+1 WHERE id='00000000-0000-4000-8000-00000000e002'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET withdrawn_at=now()+interval '1 day', revision=revision+1 WHERE id='00000000-0000-4000-8000-00000000e002'$$,'23514')
  AND (SELECT document_version_id='00000000-0000-4000-8000-0000000001a2' AND withdrawn_at IS NOT NULL FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e002');
INSERT INTO results SELECT 'a WITHDRAWN binding still counts: re-attaching its version to another ref of the same matter/requirement (null) is refused 23505, never an implicit restore',
  pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e105','00000000-0000-4000-8000-0000000001a2',1)$$)='ERR:23505'
  AND (SELECT document_version_id IS NULL FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e105');

INSERT INTO results SELECT 'a direct UPDATE that withdraws an UNBOUND ref, or attaches and withdraws in one statement, is refused 23514: an unbound ref cannot be withdrawn',
  pg_temp.expect_err($$UPDATE legal_evidence_refs SET withdrawn_at=now(), revision=2 WHERE id='00000000-0000-4000-8000-00000000e103'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_evidence_refs SET document_version_id='00000000-0000-4000-8000-0000000001b1', withdrawn_at=now(), revision=2 WHERE id='00000000-0000-4000-8000-00000000e103'$$,'23514')
  AND (SELECT document_version_id IS NULL AND withdrawn_at IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e103');

-- ===== atomicity: a failing journal insert leaves no binding, no revision and no event =====
BEGIN;
REVOKE INSERT ON public.legal_case_events FROM ecc_legal_runtime;
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e103','00000000-0000-4000-8000-0000000001b1',1)$$) AS o1 \gset
RESET ROLE;
ROLLBACK;
INSERT INTO results SELECT 'atomic: when the journal append fails (42501) the attach fails with it: ref still unbound at revision 1, no event',
  :'o1'='ERR:42501' AND (SELECT document_version_id IS NULL AND revision=1 FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e103')
  AND (SELECT count(*)=0 FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e103')
  AND has_table_privilege('ecc_legal_runtime','legal_case_events','INSERT');

-- ===== journal privacy: attachment/withdrawal events follow the evidence-subject mask =====
SET ROLE ecc_legal_runtime;
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e003','00000000-0000-4000-8000-0000000001b1',1)$$) AS o1 \gset
SELECT set_config('ecc.restricted_evidence','on',false) AS c1 \gset
SELECT pg_temp.outcome($$SELECT legal_attach_evidence_version('00000000-0000-4000-8000-00000000e003','00000000-0000-4000-8000-0000000001b1',1)$$) AS o2 \gset
SELECT pg_temp.outcome($$SELECT legal_withdraw_evidence_version('00000000-0000-4000-8000-00000000e003',2)$$) AS o3 \gset
SELECT (SELECT count(*) FROM legal_case_events WHERE dimension='evidence_attachment') AS vis_on, (SELECT count(*) FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e003') AS e3_on \gset
SELECT set_config('ecc.restricted_evidence','off',false) AS c1 \gset
SELECT (SELECT count(*) FROM legal_case_events WHERE dimension='evidence_attachment') AS vis_off, (SELECT count(*) FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e003') AS e3_off,
       (SELECT count(*) FROM legal_case_events WHERE event_type IN ('evidence_attached','evidence_withdrawn')) AS vis_types_off \gset
SELECT set_config('ecc.scope_refs','scopeB',false) AS c1 \gset
SELECT (SELECT count(*) FROM legal_case_events WHERE dimension='evidence_attachment') AS vis_b, (SELECT count(*) FROM legal_case_events WHERE subject_id='00000000-0000-4000-8000-00000000e003') AS e3_b \gset
SELECT set_config('ecc.scope_refs','',false) AS c1 \gset
SELECT (SELECT count(*) FROM legal_case_events) AS vis_none \gset
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1 \gset
RESET ROLE;
INSERT INTO results SELECT 'restricted evidence cannot be attached without the restricted-evidence context (42501), and with it both the attachment and the withdrawal succeed',
  :'o1'='ERR:42501' AND :'o2'='attached' AND :'o3'='withdrawn';
INSERT INTO results SELECT 'journal mask: with restricted evidence on the runtime role sees its 7 attachment events (matter B''s is out of scope); with it off the 2 events of the restricted ref disappear (count AND ids), leaving 5',
  :vis_on=7 AND :e3_on=2 AND :vis_off=5 AND :e3_off=0 AND :vis_types_off=5;
INSERT INTO results SELECT 'a wrong-scope role sees only its own matter''s attachment event (1) and none of the scopeA evidence; a no-context role sees no journal row at all',
  :vis_b=1 AND :e3_b=0 AND :vis_none=0;
INSERT INTO results SELECT 'the owner (no RLS) can still see all events: the mask is a runtime-role boundary, not a deletion', (SELECT count(*)=8 FROM legal_case_events WHERE dimension='evidence_attachment');

-- ===== isolation, custody and default-deny unchanged by 003 =====
INSERT INTO results SELECT 'privileges are exactly as before 003 for both runtime roles, anon and authenticated; no new table, role, view, policy or grant',
  pg_temp.privs('ecc_legal_runtime')=(SELECT pl FROM _pre) AND pg_temp.privs('ecc_documents_runtime')=(SELECT pd FROM _pre)
  AND pg_temp.privs('anon')=(SELECT pa FROM _pre) AND pg_temp.privs('authenticated')=(SELECT pu FROM _pre)
  AND (SELECT count(*) FROM pg_policies WHERE schemaname='public')=(SELECT pols FROM _pre);
SET ROLE ecc_legal_runtime;
SELECT pg_temp.expect_err('SELECT count(*) FROM document_versions','42501') AND pg_temp.expect_err('SELECT count(*) FROM document_records','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM document_current_versions','42501') AS ok1 \gset
RESET ROLE;
SET ROLE ecc_documents_runtime;
SELECT pg_temp.expect_err('SELECT count(*) FROM legal_evidence_refs','42501') AND pg_temp.expect_err('SELECT count(*) FROM legal_case_events','42501')
  AND pg_temp.expect_err('SELECT legal_attach_evidence_version(''00000000-0000-4000-8000-00000000e103'',''00000000-0000-4000-8000-0000000001b1'',1)','42501')
  AND (SELECT count(*)=0 FROM document_versions) AS ok2 \gset
RESET ROLE;
SET ROLE anon; SELECT pg_temp.expect_err('SELECT legal_attach_evidence_version(''00000000-0000-4000-8000-00000000e103'',''00000000-0000-4000-8000-0000000001b1'',1)','42501') AND pg_temp.expect_err('SELECT 1 FROM legal_evidence_refs','42501') AS ok3 \gset
RESET ROLE; SET ROLE authenticated; SELECT pg_temp.expect_err('SELECT legal_withdraw_evidence_version(''00000000-0000-4000-8000-00000000e001'',3)','42501') AND pg_temp.expect_err('SELECT 1 FROM legal_case_events','42501') AS ok4 \gset
RESET ROLE;
INSERT INTO results VALUES ('the legal role has no door into D1 despite the FK (the version is a key it can name, not data it can read)', nullif(:'ok1','')::boolean),
  ('the documents role is refused on every evidence/journal object and the command; it still sees zero D1 rows (default deny, no policy)', nullif(:'ok2','')::boolean),
  ('anon is refused (42501) on the commands and the evidence table', nullif(:'ok3','')::boolean), ('authenticated is refused (42501) on the commands and the journal', nullif(:'ok4','')::boolean);
INSERT INTO results SELECT 'the commands are SECURITY INVOKER with a pinned search_path (they add no privilege); the three triggers are bound to the three guard functions',
  (SELECT bool_and(NOT prosecdef AND proconfig::text ~ 'search_path=pg_catalog, pg_temp') FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('legal_attach_evidence_version','legal_withdraw_evidence_version','legal_evidence_link_guard','legal_evidence_link_insert_guard','legal_evidence_link_journal'))
  AND (SELECT count(*)=3 FROM pg_trigger t WHERE t.tgrelid='legal_evidence_refs'::regclass AND NOT t.tgisinternal AND t.tgname LIKE 'legal\_evidence\_refs\_link\_%');
INSERT INTO results SELECT 'legacy refs that were never attached (e006) are still byte-identical and unbound after every scenario',
  (SELECT document_version_id IS NULL AND withdrawn_at IS NULL AND revision=1 AND storage_ref='ExhibitF.pdf' FROM legal_evidence_refs WHERE id='00000000-0000-4000-8000-00000000e006');
SELECT name FROM results WHERE ok IS NOT TRUE;
SELECT count(*) FILTER (WHERE ok) || '|' || count(*) FROM results;
