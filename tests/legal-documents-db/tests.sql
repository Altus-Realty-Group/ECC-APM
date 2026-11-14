-- Combined L1 + D1 rehearsal on ONE reconstructed baseline. Variables: -v legal=<L1 proposal> -v documents=<D1 proposal> -v fp=<fp.sql>
-- Never stops on an assertion failure: every check lands in `results`; the last line is `passed|total`.
\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean);   -- superuser-only on purpose: role-context checks pass their result back with \gset
CREATE FUNCTION pg_temp.expect_err(sql text, state text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE = state; END $$;
CREATE FUNCTION pg_temp.fp(tables text, funcs text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE r text;
BEGIN
  SELECT md5(string_agg(x, E'\n' ORDER BY x)) INTO r FROM (
    SELECT 'col '||table_name||'.'||column_name||' '||data_type||' '||is_nullable||' '||coalesce(column_default,'') x FROM information_schema.columns WHERE table_schema='public' AND table_name ~ tables
    UNION ALL SELECT 'con '||conrelid::regclass||' '||conname||' '||pg_get_constraintdef(oid)||' '||convalidated::text FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid<>0 AND conrelid::regclass::text ~ tables
    UNION ALL SELECT 'idx '||indexdef FROM pg_indexes WHERE schemaname='public' AND tablename ~ tables
    UNION ALL SELECT 'trg '||pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text ~ tables
    UNION ALL SELECT 'pol '||tablename||' '||policyname||' '||cmd||' '||roles::text||' '||coalesce(qual,'')||' '||coalesce(with_check,'') FROM pg_policies WHERE schemaname='public' AND tablename ~ tables
    UNION ALL SELECT 'rel '||relname||' '||relkind::text||' '||relrowsecurity::text||relforcerowsecurity::text||' '||relowner::regrole||' '||coalesce(relacl::text,'')||' '||coalesce(reloptions::text,'') FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v','p') AND relname ~ tables
    UNION ALL SELECT 'fn '||proname||' '||md5(prosrc)||' '||coalesce(proacl::text,'') FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname ~ funcs
  ) s;
  RETURN r;
END $$;
-- row-content fingerprint over the BASELINE columns of every pre-existing table (legal tables hash only their original columns)
CREATE FUNCTION pg_temp.rows() RETURNS TABLE(name text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'owners', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM owners t
  UNION ALL SELECT 'properties', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM properties t
  UNION ALL SELECT 'property_owners', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY property_id, owner_id),'')) FROM property_owners t
  UNION ALL SELECT 'units', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id_uuid),'')) FROM units t
  UNION ALL SELECT 'tenants', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id_uuid),'')) FROM tenants t
  UNION ALL SELECT 'leases', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id_uuid),'')) FROM leases t
  UNION ALL SELECT 'files', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM files t
  UNION ALL SELECT 'files_new', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM files_new t
  UNION ALL SELECT 'legacy_staging', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM legacy_staging t
  UNION ALL SELECT 'legal_cases', count(*), md5(coalesce(string_agg(row(id,case_number,case_type,status,property_id,unit_id,tenant_id,lease_id,court_name,balance_at_filing_cents,created_at,updated_at,last_state_changed_at,collection_status)::text,'|' ORDER BY id),'')) FROM legal_cases
  UNION ALL SELECT 'legal_case_events', count(*), md5(coalesce(string_agg(row(id,legal_case_id,event_type,from_status,to_status,metadata,created_at,created_by,request_id)::text,'|' ORDER BY id),'')) FROM legal_case_events
  UNION ALL SELECT 'case_history', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM case_history t
  UNION ALL SELECT 'case_tags', count(*), md5(coalesce(string_agg(t::text,'|' ORDER BY id),'')) FROM case_tags t
$$;
CREATE TABLE _pre AS SELECT * FROM pg_temp.rows();
-- baseline objects NEITHER proposal may alter (everything except the four legal tables L1 documents as changed)
CREATE TABLE _fp AS SELECT 'baseline_untouched'::text k, pg_temp.fp('^(owners|properties|property_owners|units|tenants|leases|files|files_new|legacy_staging)$','^$') v;
INSERT INTO _fp SELECT 'pre_legal_cases', pg_temp.fp('^(legal_cases|legal_case_events|case_history|case_tags)$','^$');
INSERT INTO results SELECT 'baseline reconstruction has BOTH key families on properties (bigint id PK, separate uuid id_uuid UNIQUE)',
  (SELECT data_type='bigint' FROM information_schema.columns WHERE table_name='properties' AND column_name='id')
  AND (SELECT data_type='uuid' FROM information_schema.columns WHERE table_name='properties' AND column_name='id_uuid')
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='properties'::regclass AND contype='p' AND pg_get_constraintdef(oid)='PRIMARY KEY (id)')
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='properties'::regclass AND contype='u' AND pg_get_constraintdef(oid)='UNIQUE (id_uuid)');

-- ===== apply in order: L1 then D1 =====
\i :legal
INSERT INTO _fp SELECT 'l1_after_l1', pg_temp.fp('^(legal_|case_)','^legal_');
INSERT INTO results SELECT 'no document object exists after L1 alone', NOT EXISTS (SELECT 1 FROM pg_class WHERE relname LIKE 'document\_%') AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_documents_runtime');
\i :documents
INSERT INTO _fp SELECT 'l1_after_d1', pg_temp.fp('^(legal_|case_)','^legal_');
INSERT INTO _fp SELECT 'baseline_after_both', pg_temp.fp('^(owners|properties|property_owners|units|tenants|leases|files|files_new|legacy_staging)$','^$');

-- ===== baseline preservation =====
INSERT INTO results SELECT 'D1 application changed nothing in any L1 object (columns, constraints, triggers, policies, ACLs, functions)',
  (SELECT v FROM _fp WHERE k='l1_after_l1') = (SELECT v FROM _fp WHERE k='l1_after_d1');
INSERT INTO results SELECT 'neither proposal altered any untouched baseline table (structure, constraints, ACLs, policy)',
  (SELECT v FROM _fp WHERE k='baseline_untouched') = (SELECT v FROM _fp WHERE k='baseline_after_both');
INSERT INTO results SELECT 'every baseline row is preserved byte-for-byte (original columns, all 13 tables)',
  (SELECT count(*)=13 FROM _pre) AND NOT EXISTS (SELECT 1 FROM _pre p JOIN pg_temp.rows() r USING (name) WHERE (p.n,p.h) IS DISTINCT FROM (r.n,r.h));
INSERT INTO results SELECT 'legacy file tables keep rows, the permissive policy and the observed anon/authenticated grants',
  (SELECT count(*)=50 FROM files) AND (SELECT count(*)=2 FROM files_new) AND (SELECT count(*)=1 FROM pg_policies WHERE tablename='files_new')
  AND has_table_privilege('anon','files_new','insert') AND has_table_privilege('authenticated','files','delete');
INSERT INTO results SELECT 'baseline legal rows stay unscoped: scope_ref NULL until a reviewed backfill (no backfill ran)',
  (SELECT count(*)=2 AND bool_and(scope_ref IS NULL AND docket_number IS NULL AND revision=1) FROM legal_cases);
INSERT INTO results SELECT 'L1 documented changes are exactly what changed on legal tables (anon/authenticated revoked, RLS on, union case_type, case_number nullable)',
  (SELECT v FROM _fp WHERE k='pre_legal_cases') <> pg_temp.fp('^(legal_cases|legal_case_events|case_history|case_tags)$','^$')
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('legal_cases_case_type_check','legal_cases_case_type_chk','legal_cases_case_number_key'))
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conname='legal_cases_case_type_v2_chk')
  AND (SELECT is_nullable='YES' FROM information_schema.columns WHERE table_name='legal_cases' AND column_name='case_number')
  AND (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('legal_cases','legal_case_events','case_history','case_tags'))
  AND NOT EXISTS (SELECT 1 FROM pg_class c, aclexplode(c.relacl) a WHERE c.relname IN ('legal_cases','legal_case_events','case_history','case_tags') AND a.grantee::regrole::text IN ('anon','authenticated'));

-- ===== identity anchors: two key families, never equated =====
INSERT INTO results SELECT 'every L1 foreign key into the baseline targets the legacy uuid key id_uuid',
  (SELECT count(*)>=7 FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text ~ '^legal_' AND confrelid::regclass::text IN ('properties','units','tenants','leases'))
  AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.contype='f' AND c.conrelid::regclass::text ~ '^legal_' AND c.confrelid::regclass::text IN ('properties','units','tenants','leases')
        AND (SELECT array_agg(a.attname::text) FROM pg_attribute a WHERE a.attrelid=c.confrelid AND a.attnum=ANY(c.confkey)) <> ARRAY['id_uuid']);
INSERT INTO results SELECT 'every D1 foreign key into the baseline targets the native numeric keys (owners.id, properties.id, property_owners PK)',
  (SELECT count(*)=3 FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text ~ '^document_' AND confrelid::regclass::text IN ('owners','properties','property_owners'))
  AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.contype='f' AND c.conrelid::regclass::text ~ '^document_' AND c.confrelid::regclass::text IN ('owners','properties','property_owners')
        AND (SELECT array_agg(a.attname::text ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.confrelid AND a.attnum=ANY(c.confkey)) NOT IN (ARRAY['id'], ARRAY['property_id','owner_id']));
INSERT INTO results SELECT 'no column of any D1 table is uuid-typed toward the baseline, and no L1 table carries a numeric owner/property key',
  NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name ~ '^document_' AND column_name IN ('property_uuid','id_uuid'))
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name ~ '^legal_' AND column_name IN ('owner_id','home_owner_id','home_property_id') )
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name ~ '^legal_' AND column_name='property_id' AND data_type<>'uuid');
INSERT INTO results SELECT 'no foreign key, view, policy, trigger or function body links the two domains in either direction',
  NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype='f' AND ((conrelid::regclass::text ~ '^(legal_|case_)' AND confrelid::regclass::text ~ '^document_') OR (conrelid::regclass::text ~ '^document_' AND confrelid::regclass::text ~ '^(legal_|case_)')))
  AND NOT EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND ((viewname ~ '^legal_' AND definition ~ 'document_') OR (viewname ~ '^document_' AND definition ~ '(legal_|case_)')))
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE (tablename ~ '^legal_' AND (qual ~ 'document_' OR with_check ~ 'document_')) OR (tablename ~ '^document_'))
  AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND ((proname ~ '^legal_' AND prosrc ~ 'document_') OR (proname ~ '^document_' AND prosrc ~ '(legal_|case_|id_uuid)')));

-- ===== role custody =====
INSERT INTO results SELECT 'both runtime roles are NOLOGIN, NOBYPASSRLS, not super/createrole/createdb/replication, no connection grant',
  (SELECT count(*)=2 AND bool_and(NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolreplication) FROM pg_roles WHERE rolname IN ('ecc_legal_runtime','ecc_documents_runtime'));
INSERT INTO results SELECT 'neither role is a member of anything, has members, or owns any object in this database',
  NOT EXISTS (SELECT 1 FROM pg_auth_members WHERE roleid::regrole::text IN ('ecc_legal_runtime','ecc_documents_runtime') OR member::regrole::text IN ('ecc_legal_runtime','ecc_documents_runtime'))
  AND NOT EXISTS (SELECT 1 FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid WHERE r.rolname IN ('ecc_legal_runtime','ecc_documents_runtime') AND d.deptype='o' AND d.dbid=(SELECT oid FROM pg_database WHERE datname=current_database()))
  AND NOT has_schema_privilege('ecc_legal_runtime','public','CREATE') AND NOT has_schema_privilege('ecc_documents_runtime','public','CREATE')
  AND NOT has_database_privilege('ecc_legal_runtime',current_database(),'CREATE') AND NOT has_database_privilege('ecc_documents_runtime',current_database(),'CREATE');
CREATE FUNCTION pg_temp.privs(r text) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(c.relname||':'||p, ',' ORDER BY c.relname, p), '') FROM pg_class c
  CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
  WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','v','m','p','S') AND c.relname NOT IN ('results','_pre','_fp')
    AND CASE WHEN c.relkind='S' THEN has_sequence_privilege(r, c.oid, 'USAGE') OR has_sequence_privilege(r, c.oid, 'UPDATE')
             ELSE has_table_privilege(r, c.oid, p) END
$$;
INSERT INTO results SELECT 'ecc_legal_runtime holds EXACTLY the documented L1 privileges and nothing on any D1 or baseline object',
  pg_temp.privs('ecc_legal_runtime') = (SELECT string_agg(rel||':'||p, ',' ORDER BY rel, p) FROM (
    SELECT r rel, p FROM unnest(ARRAY['legal_cases','legal_parties','legal_matter_properties','legal_awards','legal_evidence_requirements','legal_evidence_refs','legal_source_links']) r, unnest(ARRAY['SELECT','INSERT','UPDATE']) p
    UNION ALL SELECT r, p FROM unnest(ARRAY['legal_award_obligors','legal_case_events']) r, unnest(ARRAY['SELECT','INSERT']) p
    UNION ALL SELECT r, 'SELECT' FROM unnest(ARRAY['case_history','case_tags','legal_matter_award_totals']) r) e);
INSERT INTO results SELECT 'ecc_documents_runtime holds EXACTLY SELECT on the four D1 tables and two D1 views, nothing else',
  pg_temp.privs('ecc_documents_runtime') = (SELECT string_agg(r||':SELECT', ',' ORDER BY r) FROM unnest(ARRAY['document_records','document_property_links','document_versions','document_deliveries','document_current_versions','document_latest_deliveries']) r);
INSERT INTO results SELECT 'anon, authenticated and PUBLIC hold nothing on any of the 11 L1 tables or any D1 table/view',
  NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','v') AND (c.relname ~ '^(legal_|document_)' OR c.relname IN ('case_history','case_tags'))
    AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT') OR has_table_privilege('anon',c.oid,'INSERT') OR has_table_privilege('authenticated',c.oid,'INSERT')
      OR has_table_privilege('anon',c.oid,'UPDATE') OR has_table_privilege('authenticated',c.oid,'UPDATE') OR has_table_privilege('anon',c.oid,'DELETE') OR has_table_privilege('authenticated',c.oid,'DELETE')))
  AND NOT EXISTS (SELECT 1 FROM pg_class c, aclexplode(c.relacl) a WHERE c.relnamespace='public'::regnamespace AND c.relname ~ '^(legal_|document_)' AND a.grantee=0);

-- ===== default-deny boundaries (catalog) =====
INSERT INTO results SELECT 'RLS is enabled on all 11 L1 tables and all 4 D1 tables; D1 tables have NO policy; every D1/L1 view is security_invoker',
  (SELECT count(*)=15 AND bool_and(relrowsecurity) FROM pg_class WHERE relkind='r' AND relnamespace='public'::regnamespace AND (relname ~ '^(legal_|document_)' AND relname <> 'results' OR relname IN ('case_history','case_tags')))
  AND (SELECT count(*)=0 FROM pg_policies WHERE tablename ~ '^document_')
  AND (SELECT count(*)=3 AND bool_and(reloptions::text ~ 'security_invoker=true') FROM pg_class WHERE relkind='v' AND relnamespace='public'::regnamespace AND relname ~ '^(legal_|document_)');
INSERT INTO results SELECT 'case_history and case_tags have RLS on and no runtime policy (legacy rows stay unreadable)',
  (SELECT count(*)=0 FROM pg_policies WHERE tablename IN ('case_history','case_tags')) AND (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('case_history','case_tags'));

-- ===== fixtures (superuser). L1 matters in two scopes; D1 records for owners/properties; one legacy-uuid property link =====
INSERT INTO legal_cases (id, case_type, status, scope_ref, court_ref, docket_number) VALUES
  ('00000000-0000-4000-8000-00000000a001','collections','filed','scopeA','courtX','D-1'),
  ('00000000-0000-4000-8000-00000000b001','eviction_and_damages','filed','scopeB','courtX','D-1');
INSERT INTO legal_parties (id, matter_id, role, display_name) VALUES
  ('00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a001','defendant','Party A1'),
  ('00000000-0000-4000-8000-00000000a102','00000000-0000-4000-8000-00000000a001','defendant','Party A2'),
  ('00000000-0000-4000-8000-00000000b101','00000000-0000-4000-8000-00000000b001','defendant','Party B1');
INSERT INTO legal_awards (id, matter_id, award_kind, amount_cents, currency) VALUES
  ('00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a001','damages',100000,'USD'),
  ('00000000-0000-4000-8000-00000000a202','00000000-0000-4000-8000-00000000a001','rent',NULL,NULL),
  ('00000000-0000-4000-8000-00000000b201','00000000-0000-4000-8000-00000000b001','costs',NULL,NULL);
INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability) VALUES
  ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a101','joint'),
  ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a102','joint');
INSERT INTO legal_evidence_requirements (id, matter_id, requirement_key) VALUES ('00000000-0000-4000-8000-00000000a301','00000000-0000-4000-8000-00000000a001','lease');
INSERT INTO legal_evidence_refs (matter_id, ref_kind, storage_ref, restricted) VALUES
  ('00000000-0000-4000-8000-00000000a001','doc','opaque-open',false),('00000000-0000-4000-8000-00000000a001','doc','opaque-restricted',true);
INSERT INTO legal_matter_properties (matter_id, property_id) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-000000000042');  -- legacy uuid ...0042
INSERT INTO legal_source_links (matter_id, source_system, source_id) VALUES ('00000000-0000-4000-8000-00000000a001','synthetic','S-1');
INSERT INTO legal_case_events (legal_case_id, event_type) VALUES ('00000000-0000-4000-8000-00000000a001','note');
INSERT INTO document_records (id, name, section, classification, home_kind, home_owner_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000a1','Agreement A','management-contracts','general','owner',17,'t'),
  ('00000000-0000-4000-8000-0000000000a2','Tax summary','financial-tax','financial_tax','owner',17,'t'),
  ('00000000-0000-4000-8000-0000000000b1','Agreement B','management-contracts','general','owner',18,'t');
INSERT INTO document_records (id, name, section, classification, home_kind, home_property_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000c1','Tenant file','tenant-documents','general','property',42,'t');                 -- numeric 42
INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000a1',17,42,'t'),('00000000-0000-4000-8000-0000000000a1',17,43,'t'),('00000000-0000-4000-8000-0000000000b1',18,44,'t');
INSERT INTO document_versions (id, document_id, version_number, byte_size, sha256, media_type, provider, provider_object_ref, provider_revision, created_by) VALUES
  ('00000000-0000-4000-8000-0000000001a1','00000000-0000-4000-8000-0000000000a1',1,100,repeat('a',64),'application/pdf','synthetic','obj-a1','r1','t');
INSERT INTO document_deliveries (version_id, status, provider_receipt_ref, verified_sha256, verified_byte_size, recorded_by) VALUES
  ('00000000-0000-4000-8000-0000000001a1','verified','rcpt-1',repeat('a',64),100,'t');

-- ===== identity trap: the legal link (uuid ...0042) and the document home (numeric 42) are DIFFERENT properties =====
INSERT INTO results SELECT 'uuid ...0042 resolves to numeric property 43 and numeric 42 to uuid ...0043: no suffix/ordinal equivalence is built into either domain',
  (SELECT p.id=43 FROM legal_matter_properties l JOIN properties p ON p.id_uuid=l.property_id)
  AND (SELECT p.id_uuid='00000000-0000-4000-8000-000000000043' FROM document_records d JOIN properties p ON p.id=d.home_property_id WHERE d.name='Tenant file');
INSERT INTO results SELECT 'a link to a uuid that exists nowhere is rejected, and so is a document home that exists nowhere (each domain checks its own key only)',
  pg_temp.expect_err($$INSERT INTO legal_matter_properties (matter_id, property_id) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-000000000099')$$,'23503')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_property_id,created_by) VALUES ('x','legal','general','property',999,'t')$$,'23503');

-- ===== L1 constraints (combined state) =====
INSERT INTO results SELECT 'L1: union case_type writable; docket identity unique within scope; same docket in another scope allowed; global case_number no longer unique',
  (SELECT count(*)=2 FROM legal_cases WHERE case_type IN ('collections','eviction_and_damages'))
  AND pg_temp.expect_err($$INSERT INTO legal_cases (case_type,status,scope_ref,court_ref,docket_number) VALUES ('other','draft','scopeA','courtX','D-1')$$,'23505')
;
INSERT INTO legal_cases (case_type,status,case_number) VALUES ('other','draft','DUP'),('other','draft','DUP');
INSERT INTO results SELECT 'L1: duplicate case_number is now allowed (documented residual of the dropped global UNIQUE)', (SELECT count(*)=2 FROM legal_cases WHERE case_number='DUP');
INSERT INTO results SELECT 'L1: amount/currency pairing, non-negative amounts and unknown-is-NULL (never 0)',
  pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents) VALUES ('00000000-0000-4000-8000-00000000a001','rent',5)$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,amount_cents,currency) VALUES ('00000000-0000-4000-8000-00000000a001','rent',-1,'USD')$$,'23514')
  AND (SELECT amount_cents IS NULL AND currency IS NULL FROM legal_awards WHERE id='00000000-0000-4000-8000-00000000a202');
INSERT INTO results SELECT 'L1: joint award is counted once (2 obligors, 100000) and unknown awards are counted separately',
  (SELECT known_cents=100000 AND unknown_count=0 AND award_count=1 FROM legal_matter_award_totals WHERE matter_id='00000000-0000-4000-8000-00000000a001' AND currency='USD')
  AND (SELECT known_cents IS NULL AND unknown_count=1 FROM legal_matter_award_totals WHERE matter_id='00000000-0000-4000-8000-00000000a001' AND currency IS NULL)
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='legal_award_obligors' AND column_name ~ 'cent|amount');
INSERT INTO results SELECT 'L1: an obligor cannot join an award to a party of ANOTHER matter (same-matter composite FKs)',
  pg_temp.expect_err($$INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000a202','00000000-0000-4000-8000-00000000b101','sole')$$,'23503');
INSERT INTO results SELECT 'L1: omitted/stale revision is refused (40001); matter_id is immutable (23514); journal is append-only even for the owner (42501)',
  pg_temp.expect_err($$UPDATE legal_awards SET judgment_verification='verified' WHERE id='00000000-0000-4000-8000-00000000a201'$$,'40001')
  AND pg_temp.expect_err($$UPDATE legal_parties SET matter_id='00000000-0000-4000-8000-00000000b001' WHERE id='00000000-0000-4000-8000-00000000a101'$$,'23514')
  AND pg_temp.expect_err($$UPDATE legal_case_events SET event_type='x' WHERE event_type='note'$$,'42501')
  AND pg_temp.expect_err($$DELETE FROM legal_case_events WHERE event_type='note'$$,'42501');
INSERT INTO results SELECT 'L1: awards/evidence cannot be born past their initial dimension; duplicate property-only link rejected (NULLS NOT DISTINCT)',
  pg_temp.expect_err($$INSERT INTO legal_awards (matter_id,award_kind,judgment_verification) VALUES ('00000000-0000-4000-8000-00000000a001','other','verified')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_evidence_refs (matter_id,ref_kind,storage_ref,confidence) VALUES ('00000000-0000-4000-8000-00000000a001','doc','x','high')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO legal_matter_properties (matter_id, property_id) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-000000000042')$$,'23505');
INSERT INTO results SELECT 'L1: the NOT VALID journal FK is retained and still rejects a new orphan event',
  (SELECT NOT convalidated FROM pg_constraint WHERE conname='legal_case_events_matter_fk')
  AND pg_temp.expect_err($$INSERT INTO legal_case_events (legal_case_id,event_type) VALUES ('00000000-0000-4000-8000-0000000fffff','orphan')$$,'23503');

-- ===== D1 constraints (combined state) =====
INSERT INTO results SELECT 'D1: one agreement is stored once and covers two properties of its owner; both homes/neither home rejected; section must fit the home kind',
  (SELECT count(*)=2 FROM document_property_links WHERE document_id='00000000-0000-4000-8000-0000000000a1') AND (SELECT count(*)=1 FROM document_records WHERE name='Agreement A')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,home_property_id,created_by) VALUES ('x','correspondence','general','owner',17,42,'t')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','tenant-documents','general','owner',17,'t')$$,'23514');
INSERT INTO results SELECT 'D1: classification is mandatory and closed; the financial-tax section can never be general/confidential',
  pg_temp.expect_err($$INSERT INTO document_records (name,section,home_kind,home_owner_id,created_by) VALUES ('x','correspondence','owner',17,'t')$$,'23502')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','correspondence','secret','owner',17,'t')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','financial-tax','general','owner',17,'t')$$,'23514')
  AND pg_temp.expect_err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','financial-tax','confidential','owner',17,'t')$$,'23514');
INSERT INTO results SELECT 'D1: a link must be to a property the home owner really owns and name the home owner; duplicates and link edits are refused',
  pg_temp.expect_err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',17,44,'t')$$,'23503')
  AND pg_temp.expect_err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',18,44,'t')$$,'23503')
  AND pg_temp.expect_err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',17,42,'t')$$,'23505')
  AND pg_temp.expect_err($$UPDATE document_property_links SET created_by='z'$$,'42501');
INSERT INTO results SELECT 'D1: versions are contiguous and immutable; a verified receipt must carry the registered digest and size',
  pg_temp.expect_err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',3,1,repeat('c',64),'application/pdf','synthetic','o','r9','t')$$,'23514')
  AND pg_temp.expect_err($$UPDATE document_versions SET byte_size=1$$,'42501') AND pg_temp.expect_err($$DELETE FROM document_deliveries$$,'42501')
  AND pg_temp.expect_err($$INSERT INTO document_deliveries (version_id,status,verified_sha256,verified_byte_size,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a1','verified',repeat('b',64),100,'t')$$,'23503');
INSERT INTO results SELECT 'D1: records are never deleted, never edited, and retire only once',
  pg_temp.expect_err($$DELETE FROM document_records WHERE name='Agreement B'$$,'42501')
  AND pg_temp.expect_err($$UPDATE document_records SET name='renamed' WHERE name='Agreement B'$$,'42501');

-- ===== shared-key custody: baseline rows referenced by BOTH domains cannot disappear =====
INSERT INTO properties (id, name, id_uuid) VALUES (45,'Legal-only link','00000000-0000-4000-8000-000000000045'),(46,'Legacy-ref only','00000000-0000-4000-8000-000000000046');
INSERT INTO legal_matter_properties (matter_id, property_id) VALUES ('00000000-0000-4000-8000-00000000b001','00000000-0000-4000-8000-000000000045');
INSERT INTO legal_cases (id, case_type, status, property_id) VALUES ('00000000-0000-4000-8000-0000000c0003','other','draft','00000000-0000-4000-8000-000000000046');
INSERT INTO results SELECT 'a property used by a document link cannot be deleted (ownership link cascade is blocked by D1 RESTRICT)',
  pg_temp.expect_err($$DELETE FROM properties WHERE id=44$$,'23503') AND pg_temp.expect_err($$DELETE FROM property_owners WHERE property_id=42 AND owner_id=17$$,'23503');
INSERT INTO results SELECT 'a property used by an L1 matter link cannot be deleted (RESTRICT)', pg_temp.expect_err($$DELETE FROM properties WHERE id=45$$,'23503');
-- KNOWN INCOMPATIBILITY (reported, NOT fixed here; independent of D1, reproduced on L1 alone in run.sh): the baseline foreign keys
-- legal_cases.{property,unit,tenant,lease}_id are ON DELETE SET NULL, but L1's legal_matter_guard (BEFORE UPDATE, revision compare-and-set)
-- also fires for that referential UPDATE, sees the revision unchanged and raises 40001. Deleting a referenced property/unit/tenant/lease
-- therefore FAILS under L1 instead of nulling the reference. This pins the CURRENT behaviour so a deliberate fix must update the record.
INSERT INTO results SELECT 'KNOWN INCOMPATIBILITY (L1 vs baseline FK action): deleting a property referenced by legal_cases.property_id fails 40001 under L1',
  pg_temp.expect_err($$DELETE FROM properties WHERE id=46$$,'40001')
  AND (SELECT count(*)=4 FROM pg_constraint WHERE conrelid='legal_cases'::regclass AND contype='f' AND confdeltype='n')
  AND (SELECT property_id IS NOT NULL FROM legal_cases WHERE id='00000000-0000-4000-8000-0000000c0003');
INSERT INTO results SELECT 'an owner with a document home cannot be deleted', pg_temp.expect_err($$DELETE FROM owners WHERE id=17$$,'23503');

-- ===== runtime-role behaviour with real rows present =====
SELECT (SELECT count(*) FROM document_records) AS docs_total, (SELECT count(*) FROM legal_cases WHERE scope_ref IS NOT NULL) AS legal_scoped \gset
INSERT INTO results SELECT 'fixtures are present (so zero-row results below mean denial, not emptiness)', :docs_total=4 AND :legal_scoped=2;

SET ROLE ecc_legal_runtime;
SELECT count(*) = 0 AS ok1 FROM legal_cases \gset
SELECT set_config('ecc.scope_refs','scopeA',false) AS c1, set_config('ecc.actor','tester',false) AS c2 \gset
SELECT (SELECT count(*)=1 AND bool_and(scope_ref='scopeA') FROM legal_cases) AND (SELECT count(*)=2 FROM legal_parties) AND (SELECT count(*)=2 FROM legal_awards)
  AND (SELECT count(*)=1 FROM legal_evidence_refs) AND (SELECT count(*)=0 FROM case_history) AS ok2 \gset
SELECT pg_temp.expect_err($$INSERT INTO legal_cases (case_type,status,scope_ref) VALUES ('other','draft','scopeB')$$,'42501')
  AND pg_temp.expect_err($$UPDATE legal_case_events SET event_type='x'$$,'42501') AND pg_temp.expect_err($$DELETE FROM legal_case_events$$,'42501') AS ok3 \gset
-- cross-role isolation: with a VALID legal scope in force, the legal role still has no door into D1, the baseline or the legacy file tables
SELECT pg_temp.expect_err('SELECT count(*) FROM document_records','42501') AND pg_temp.expect_err('SELECT count(*) FROM document_versions','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM document_current_versions','42501') AND pg_temp.expect_err('INSERT INTO document_records(name,section,classification,home_kind,home_owner_id,created_by) VALUES (''x'',''correspondence'',''general'',''owner'',17,''t'')','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM properties','42501') AND pg_temp.expect_err('SELECT count(*) FROM owners','42501') AND pg_temp.expect_err('SELECT count(*) FROM property_owners','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM files','42501') AND pg_temp.expect_err('SELECT count(*) FROM files_new','42501') AND pg_temp.expect_err('SELECT count(*) FROM legacy_staging','42501') AS ok4 \gset
-- the journal evidence policy and legal views still work under the combined install
SELECT (SELECT known_cents=100000 FROM legal_matter_award_totals WHERE currency='USD') AS ok5 \gset
RESET ROLE;
INSERT INTO results VALUES ('legal role: no context sees nothing', nullif(:'ok1','')::boolean), ('legal role: scopeA sees only its own matter, children and no legacy history', nullif(:'ok2','')::boolean),
  ('legal role: cross-scope write and journal mutation refused', nullif(:'ok3','')::boolean),
  ('CROSS-ROLE: legal role (valid scope set) is refused on every D1 object, baseline table and legacy file table', nullif(:'ok4','')::boolean),
  ('legal role: sanctioned aggregate view works under the combined install', nullif(:'ok5','')::boolean);

SET ROLE ecc_documents_runtime;
SELECT (SELECT count(*)=0 FROM document_records) AND (SELECT count(*)=0 FROM document_versions) AND (SELECT count(*)=0 FROM document_deliveries)
  AND (SELECT count(*)=0 FROM document_property_links) AND (SELECT count(*)=0 FROM document_current_versions) AND (SELECT count(*)=0 FROM document_latest_deliveries) AS ok1 \gset
-- the SAME legal scope context the legal role used does not open D1: scope settings are not a D1 grant
SELECT set_config('ecc.scope_refs','scopeA,scopeB',false) AS c1, set_config('ecc.actor','tester',false) AS c2, set_config('ecc.restricted_evidence','on',false) AS c3 \gset
SELECT (SELECT count(*)=0 FROM document_records) AND (SELECT count(*)=0 FROM document_versions) AS ok2 \gset
SELECT pg_temp.expect_err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',2,1,repeat('c',64),'application/pdf','synthetic','z','z','t')$$,'42501')
  AND pg_temp.expect_err('UPDATE document_records SET status=''retired'',retired_at=now()','42501') AS ok3 \gset
SELECT pg_temp.expect_err('SELECT count(*) FROM legal_cases','42501') AND pg_temp.expect_err('SELECT count(*) FROM legal_awards','42501') AND pg_temp.expect_err('SELECT count(*) FROM legal_case_events','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM legal_matter_award_totals','42501') AND pg_temp.expect_err('SELECT count(*) FROM case_history','42501')
  AND pg_temp.expect_err('INSERT INTO legal_parties(matter_id,role,display_name) VALUES (''00000000-0000-4000-8000-00000000a001'',''other'',''x'')','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM properties','42501') AND pg_temp.expect_err('SELECT count(*) FROM owners','42501') AND pg_temp.expect_err('SELECT count(*) FROM property_owners','42501')
  AND pg_temp.expect_err('SELECT count(*) FROM files','42501') AND pg_temp.expect_err('SELECT count(*) FROM files_new','42501') AS ok4 \gset
RESET ROLE;
INSERT INTO results VALUES ('documents role: default-deny (RLS on, no policy) returns zero rows from every D1 table and view while rows exist', nullif(:'ok1','')::boolean),
  ('documents role: legal scope/actor/restricted-evidence settings do not open D1', nullif(:'ok2','')::boolean), ('documents role: writes refused (read-only runtime)', nullif(:'ok3','')::boolean),
  ('CROSS-ROLE: documents role (with legal context set) is refused on every L1 object, baseline table and legacy file table', nullif(:'ok4','')::boolean);

SET ROLE anon; SELECT pg_temp.expect_err('SELECT 1 FROM document_records','42501') AND pg_temp.expect_err('SELECT 1 FROM legal_cases','42501') AND pg_temp.expect_err('SELECT 1 FROM legal_awards','42501')
  AND pg_temp.expect_err('SELECT 1 FROM case_history','42501') AND pg_temp.expect_err('SELECT 1 FROM document_current_versions','42501') AS ok1 \gset
RESET ROLE; SET ROLE authenticated;
SELECT pg_temp.expect_err('SELECT 1 FROM document_records','42501') AND pg_temp.expect_err('SELECT 1 FROM legal_cases','42501') AND pg_temp.expect_err('INSERT INTO legal_cases(case_type,status) VALUES (''other'',''draft'')','42501')
  AND pg_temp.expect_err('SELECT 1 FROM case_tags','42501') AS ok2 \gset
RESET ROLE;
INSERT INTO results VALUES ('anon is refused on L1 and D1 objects', nullif(:'ok1','')::boolean), ('authenticated is refused on L1 and D1 objects, including the legacy tables L1 revoked', nullif(:'ok2','')::boolean);

-- tail: baseline rows still intact after the whole run (the fixtures above touched only NEW rows and rows created here)
INSERT INTO results SELECT 'both original legal cases are still present and unscoped after all fixtures',
  (SELECT count(*)=2 FROM legal_cases WHERE case_number IN ('SYN-1','SYN-1b') AND scope_ref IS NULL);
SELECT name FROM results WHERE ok IS NOT TRUE;
SELECT count(*) FILTER (WHERE ok) || '|' || count(*) FROM results;
