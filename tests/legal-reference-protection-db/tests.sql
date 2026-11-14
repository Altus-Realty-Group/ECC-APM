-- 002 reference protection on the combined reconstruction (001 then D1 then 002). Variables: -v legal -v documents -v ref (proposal paths) -v guard_md5 (md5 of the pristine 001 legal_matter_guard body).
-- Every check lands in `results`; the last line is `passed|total`. Synthetic rows only.
\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean);
CREATE FUNCTION pg_temp.expect_err(sql text, state text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE = state; END $$;
\i :legal
\i :documents
-- the six references 002 rewrites, identified by (child, column) exactly as the proposal does
CREATE TABLE _six AS SELECT c.conname, c.conrelid::regclass::text child, a.attname col, c.confrelid::regclass::text parent, c.confdeltype act, pg_get_constraintdef(c.oid) def
  FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
  WHERE c.contype='f' AND ((c.conrelid='legal_cases'::regclass AND a.attname IN ('property_id','unit_id','tenant_id','lease_id'))
                        OR (c.conrelid='legal_matter_properties'::regclass AND a.attname IN ('unit_id','lease_id')));
CREATE FUNCTION pg_temp.rest() RETURNS text LANGUAGE sql AS $$   -- everything 002 must NOT change, as one digest
  SELECT md5(string_agg(x, E'\n' ORDER BY x)) FROM (
    SELECT 'fn '||proname||' '||md5(prosrc)||' '||coalesce(proacl::text,'') x FROM pg_proc WHERE pronamespace='public'::regnamespace
    UNION ALL SELECT 'trg '||pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
    UNION ALL SELECT 'pol '||tablename||' '||policyname||' '||cmd||' '||roles::text||' '||coalesce(qual,'')||' '||coalesce(with_check,'') FROM pg_policies WHERE schemaname='public'
    UNION ALL SELECT 'rel '||relname||' '||relkind::text||' '||relrowsecurity::text||' '||relowner::regrole||' '||coalesce(relacl::text,'')||' '||coalesce(reloptions::text,'') FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v') AND relname !~ '^(_|results$)'
    UNION ALL SELECT 'idx '||indexdef FROM pg_indexes WHERE schemaname='public' AND tablename !~ '^(_|results$)'
    UNION ALL SELECT 'con '||conrelid::regclass||' '||conname||' '||pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid<>0 AND conrelid::regclass::text !~ '^(_|results$)' AND conname NOT IN (SELECT conname FROM _six)
    UNION ALL SELECT 'col '||table_name||'.'||column_name||' '||data_type||' '||is_nullable||' '||coalesce(column_default,'') FROM information_schema.columns WHERE table_schema='public' AND table_name !~ '^(_|results$)'
    UNION ALL SELECT 'role '||rolname||' '||rolbypassrls::text||rolcanlogin::text||rolsuper::text FROM pg_roles WHERE rolname LIKE 'ecc\_%'
  ) s $$;
CREATE TABLE _pre AS SELECT pg_temp.rest() d, (SELECT count(*) FROM _six) six, (SELECT md5(prosrc) FROM pg_proc WHERE proname='legal_matter_guard') guard,
  (SELECT indexdef FROM pg_indexes WHERE indexname='legal_cases_docket_identity_uq') dk,
  (SELECT string_agg(pg_get_constraintdef(oid),'|') FROM pg_constraint WHERE conrelid='legal_matter_properties'::regclass AND contype='u') uq;
INSERT INTO results SELECT 'before 002: exactly six SET NULL references exist (4 legal_cases + legal_matter_properties unit/lease), all single-column to id_uuid',
  (SELECT six=6 FROM _pre) AND (SELECT bool_and(act='n' AND def ~ '\(id_uuid\)') FROM _six);
\i :ref
INSERT INTO results SELECT 'the six references keep name, column and target; only the delete action changed to RESTRICT',
  (SELECT count(*)=6 FROM _six s JOIN pg_constraint c ON c.conname=s.conname AND c.conrelid=s.child::regclass AND c.confdeltype='r' AND c.confrelid=s.parent::regclass
      WHERE replace(pg_get_constraintdef(c.oid),'ON DELETE RESTRICT','ON DELETE SET NULL')=s.def)
  AND (SELECT count(*)=1 FROM pg_constraint WHERE conrelid='legal_matter_properties'::regclass AND contype='f' AND confdeltype='r' AND pg_get_constraintdef(oid) ~ 'property_id');
INSERT INTO results SELECT 'legal_matter_guard is byte-identical to the reviewed 001 function (no trigger-depth test, no revision exemption)', (SELECT md5(prosrc) FROM pg_proc WHERE proname='legal_matter_guard')=:'guard_md5';
INSERT INTO results SELECT 'everything else is byte-identical: functions (legal_matter_guard included), triggers, policies, ACLs, indexes, other constraints, columns, roles',
  (SELECT d FROM _pre)=pg_temp.rest() AND (SELECT guard FROM _pre)=(SELECT md5(prosrc) FROM pg_proc WHERE proname='legal_matter_guard')
  AND (SELECT count(*)=1 FROM pg_trigger WHERE tgname='legal_cases_guard' AND NOT tgisinternal);
INSERT INTO results SELECT 'NULLS NOT DISTINCT uniqueness is untouched; legal_parties.tenant_id (out of scope) is still ON DELETE SET NULL',
  (SELECT uq FROM _pre) = (SELECT string_agg(pg_get_constraintdef(oid),'|') FROM pg_constraint WHERE conrelid='legal_matter_properties'::regclass AND contype='u')
  AND (SELECT string_agg(pg_get_constraintdef(oid),'|') FROM pg_constraint WHERE conrelid='legal_matter_properties'::regclass AND contype='u') ~ 'NULLS NOT DISTINCT'
  AND (SELECT confdeltype='n' FROM pg_constraint WHERE conrelid='legal_parties'::regclass AND contype='f' AND confrelid='tenants'::regclass);

-- ===== fixtures (uuid ...0e00NN <-> numeric NN is NOT assumed anywhere: every reference is by id_uuid) =====
INSERT INTO properties(id,id_uuid) VALUES (81,'00000000-0000-4000-8000-0000000e0081'),(82,'00000000-0000-4000-8000-0000000e0082'),(85,'00000000-0000-4000-8000-0000000e0085'),(92,'00000000-0000-4000-8000-0000000e0092');
INSERT INTO units(id,id_uuid) VALUES (83,'00000000-0000-4000-8000-0000000e0083'),(84,'00000000-0000-4000-8000-0000000e0084'),(86,'00000000-0000-4000-8000-0000000e0086'),(93,'00000000-0000-4000-8000-0000000e0093');
INSERT INTO tenants(id,id_uuid) VALUES (87,'00000000-0000-4000-8000-0000000e0087'),(88,'00000000-0000-4000-8000-0000000e0088');
INSERT INTO leases(id,id_uuid) VALUES (89,'00000000-0000-4000-8000-0000000e0089'),(90,'00000000-0000-4000-8000-0000000e0090'),(91,'00000000-0000-4000-8000-0000000e0091');
INSERT INTO legal_cases(id,case_type,status,scope_ref,property_id,unit_id,tenant_id,lease_id) VALUES
  ('00000000-0000-4000-8000-0000000f0a01','other','draft','scopeA','00000000-0000-4000-8000-0000000e0081','00000000-0000-4000-8000-0000000e0083','00000000-0000-4000-8000-0000000e0087','00000000-0000-4000-8000-0000000e0089'),
  ('00000000-0000-4000-8000-0000000f0b01','other','draft','scopeB',NULL,NULL,NULL,NULL);
-- the collision shape: a property-only link plus links that point at a unit and at a lease of the SAME property
INSERT INTO legal_matter_properties(id,matter_id,property_id,unit_id,lease_id) VALUES
  ('00000000-0000-4000-8000-0000000f1001','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-0000000e0085',NULL,NULL),
  ('00000000-0000-4000-8000-0000000f1002','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-0000000e0085','00000000-0000-4000-8000-0000000e0084',NULL),
  ('00000000-0000-4000-8000-0000000f1003','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-0000000e0085',NULL,'00000000-0000-4000-8000-0000000e0090'),
  ('00000000-0000-4000-8000-0000000f1004','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-0000000e0092','00000000-0000-4000-8000-0000000e0093',NULL);
CREATE TABLE _snap AS SELECT (SELECT count(*) FROM legal_matter_properties) links,
  (SELECT md5(string_agg(t::text,'|' ORDER BY id)) FROM legal_matter_properties t) link_h, (SELECT md5(string_agg(t::text,'|' ORDER BY id)) FROM legal_cases t WHERE id='00000000-0000-4000-8000-0000000f0a01') case_h;
CREATE FUNCTION pg_temp.intact() RETURNS boolean LANGUAGE sql AS $$
  SELECT (SELECT links FROM _snap)=(SELECT count(*) FROM legal_matter_properties)
     AND (SELECT link_h FROM _snap)=(SELECT md5(string_agg(t::text,'|' ORDER BY id)) FROM legal_matter_properties t)
     AND (SELECT case_h FROM _snap)=(SELECT md5(string_agg(t::text,'|' ORDER BY id)) FROM legal_cases t WHERE id='00000000-0000-4000-8000-0000000f0a01') $$;

-- ===== every referenced parent deletion fails 23503 and preserves rows =====
INSERT INTO results SELECT 'deleting a property/unit/tenant/lease referenced by legal_cases fails 23503 (not 40001) and nothing changes',
  pg_temp.expect_err($$DELETE FROM properties WHERE id=81$$,'23503') AND pg_temp.expect_err($$DELETE FROM units WHERE id=83$$,'23503')
  AND pg_temp.expect_err($$DELETE FROM tenants WHERE id=87$$,'23503') AND pg_temp.expect_err($$DELETE FROM leases WHERE id=89$$,'23503')
  AND EXISTS (SELECT 1 FROM properties WHERE id=81) AND EXISTS (SELECT 1 FROM units WHERE id=83) AND EXISTS (SELECT 1 FROM tenants WHERE id=87) AND EXISTS (SELECT 1 FROM leases WHERE id=89)
  AND pg_temp.intact();
INSERT INTO results SELECT 'deleting a unit or lease referenced by legal_matter_properties fails 23503 and every link is preserved byte-for-byte',
  pg_temp.expect_err($$DELETE FROM units WHERE id=84$$,'23503') AND pg_temp.expect_err($$DELETE FROM leases WHERE id=90$$,'23503') AND pg_temp.expect_err($$DELETE FROM units WHERE id=93$$,'23503')
  AND EXISTS (SELECT 1 FROM units WHERE id=84) AND EXISTS (SELECT 1 FROM leases WHERE id=90) AND pg_temp.intact();
INSERT INTO results SELECT 'property-only-link collision: deleting the unit no longer SET NULLs into a duplicate (no 23505, no silent merge); property-only link and unit link both survive',
  pg_temp.expect_err($$DELETE FROM units WHERE id=84$$,'23503')
  AND (SELECT count(*)=1 FROM legal_matter_properties WHERE id='00000000-0000-4000-8000-0000000f1001' AND unit_id IS NULL AND lease_id IS NULL)
  AND (SELECT unit_id='00000000-0000-4000-8000-0000000e0084' FROM legal_matter_properties WHERE id='00000000-0000-4000-8000-0000000f1002') AND pg_temp.intact();
INSERT INTO results SELECT 'the NULLS NOT DISTINCT unique still refuses a second property-only link',
  pg_temp.expect_err($$INSERT INTO legal_matter_properties(matter_id,property_id) VALUES ('00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-0000000e0085')$$,'23505');

-- ===== unreferenced parents delete normally =====
DELETE FROM properties WHERE id=82; DELETE FROM units WHERE id=86; DELETE FROM tenants WHERE id=88; DELETE FROM leases WHERE id=91;
INSERT INTO results SELECT 'unreferenced property, unit, tenant and lease delete normally', NOT EXISTS (SELECT 1 FROM properties WHERE id=82) AND NOT EXISTS (SELECT 1 FROM units WHERE id=86)
  AND NOT EXISTS (SELECT 1 FROM tenants WHERE id=88) AND NOT EXISTS (SELECT 1 FROM leases WHERE id=91);

-- ===== strict revisions, as owner and as the scoped runtime role =====
INSERT INTO results SELECT 'missing, stale and skipped revisions on a legal_cases unlink all still fail 40001 (owner)',
  pg_temp.expect_err($$UPDATE legal_cases SET property_id=NULL WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001')
  AND pg_temp.expect_err($$UPDATE legal_cases SET property_id=NULL, revision=1 WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001')
  AND pg_temp.expect_err($$UPDATE legal_cases SET property_id=NULL, revision=3 WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001') AND pg_temp.intact();
SET ROLE ecc_legal_runtime;
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1, set_config('ecc.actor','tester',false) AS c2 \gset
SELECT pg_temp.expect_err($$UPDATE legal_cases SET unit_id=NULL WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001')
  AND pg_temp.expect_err($$UPDATE legal_cases SET unit_id=NULL, revision=1 WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001')
  AND pg_temp.expect_err($$UPDATE legal_cases SET unit_id=NULL, revision=7 WHERE id='00000000-0000-4000-8000-0000000f0a01'$$,'40001') AS ok1 \gset
RESET ROLE;
INSERT INTO results VALUES ('missing, stale and skipped revisions also fail 40001 for the in-scope runtime role, and nothing changed', nullif(:'ok1','')::boolean AND pg_temp.intact());

-- ===== wrong-scope and no-context unlinking changes nothing =====
SET ROLE ecc_legal_runtime;
SELECT set_config('ecc.scope_refs','scopeB',false) AS c1 \gset
WITH u AS (UPDATE legal_cases SET property_id=NULL, unit_id=NULL, tenant_id=NULL, lease_id=NULL, revision=revision+1 WHERE id='00000000-0000-4000-8000-0000000f0a01' RETURNING 1) SELECT count(*)=0 AS ok1 FROM u \gset
WITH u AS (UPDATE legal_matter_properties SET unit_id=NULL WHERE id='00000000-0000-4000-8000-0000000f1004' RETURNING 1) SELECT count(*)=0 AS ok2 FROM u \gset
SELECT pg_temp.expect_err($$UPDATE legal_cases SET scope_ref='scopeA', revision=revision+1 WHERE id='00000000-0000-4000-8000-0000000f0b01'$$,'42501') AS ok3 \gset
SELECT set_config('ecc.scope_refs','',false) AS c1 \gset
WITH u AS (UPDATE legal_cases SET property_id=NULL, revision=revision+1 WHERE id='00000000-0000-4000-8000-0000000f0a01' RETURNING 1) SELECT count(*)=0 AS ok4 FROM u \gset
RESET ROLE;
INSERT INTO results VALUES ('wrong-scope runtime role cannot unlink a legal_cases reference (0 rows, case unchanged)', nullif(:'ok1','')::boolean AND pg_temp.intact()),
  ('wrong-scope runtime role cannot unlink a legal_matter_properties reference (0 rows)', nullif(:'ok2','')::boolean AND pg_temp.intact()),
  ('wrong-scope role cannot move a case into another scope to reach it (42501)', nullif(:'ok3','')::boolean),
  ('runtime role with no scope context unlinks nothing (fail closed)', nullif(:'ok4','')::boolean AND pg_temp.intact());

-- ===== explicit authorized revisioned unlinking, then the former parents delete =====
SET ROLE ecc_legal_runtime;
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1 \gset
WITH u AS (UPDATE legal_cases SET property_id=NULL, unit_id=NULL, tenant_id=NULL, lease_id=NULL, revision=revision+1 WHERE id='00000000-0000-4000-8000-0000000f0a01' RETURNING 1) SELECT count(*)=1 AS ok1 FROM u \gset
SELECT (SELECT revision=2 AND property_id IS NULL AND unit_id IS NULL AND tenant_id IS NULL AND lease_id IS NULL FROM legal_cases WHERE id='00000000-0000-4000-8000-0000000f0a01') AS ok2 \gset
-- legal_matter_properties: an unlink that would duplicate an existing link is refused (a person resolves it; nothing is merged or deleted) ...
SELECT pg_temp.expect_err($$UPDATE legal_matter_properties SET unit_id=NULL WHERE id='00000000-0000-4000-8000-0000000f1002'$$,'23505')
  AND pg_temp.expect_err($$UPDATE legal_matter_properties SET lease_id=NULL WHERE id='00000000-0000-4000-8000-0000000f1003'$$,'23505') AS ok3 \gset
-- ... while one that does not collide succeeds
WITH u AS (UPDATE legal_matter_properties SET unit_id=NULL WHERE id='00000000-0000-4000-8000-0000000f1004' RETURNING 1) SELECT count(*)=1 AS ok4 FROM u \gset
RESET ROLE;
INSERT INTO results VALUES ('authorized scoped revisioned unlink (revision+1) clears all four legal_cases references and bumps the revision', nullif(:'ok1','')::boolean AND nullif(:'ok2','')::boolean),
  ('a legal_matter_properties unlink that would duplicate another link is refused 23505; nothing merged or deleted', nullif(:'ok3','')::boolean AND (SELECT count(*)=4 FROM legal_matter_properties)),
  ('a non-colliding legal_matter_properties unlink succeeds explicitly', nullif(:'ok4','')::boolean AND (SELECT unit_id IS NULL FROM legal_matter_properties WHERE id='00000000-0000-4000-8000-0000000f1004'));
DELETE FROM properties WHERE id=81; DELETE FROM units WHERE id=83; DELETE FROM tenants WHERE id=87; DELETE FROM leases WHERE id=89; DELETE FROM units WHERE id=93;
INSERT INTO results SELECT 'after explicit unlinking the former parents delete normally; still-linked units and leases stay protected',
  NOT EXISTS (SELECT 1 FROM properties WHERE id=81) AND NOT EXISTS (SELECT 1 FROM units WHERE id IN (83,93)) AND NOT EXISTS (SELECT 1 FROM tenants WHERE id=87) AND NOT EXISTS (SELECT 1 FROM leases WHERE id=89)
  AND EXISTS (SELECT 1 FROM units WHERE id=84) AND EXISTS (SELECT 1 FROM leases WHERE id=90);
INSERT INTO results SELECT 'role privileges and RLS are unchanged by 002 and the journal is untouched', (SELECT d FROM _pre)=pg_temp.rest();
SELECT name FROM results WHERE ok IS NOT TRUE;
SELECT count(*) FILTER (WHERE ok) || '|' || count(*) FROM results;
