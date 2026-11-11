\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean); GRANT ALL ON results TO PUBLIC;
CREATE OR REPLACE FUNCTION pg_temp.err(sql text, state text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN OTHERS THEN RETURN SQLSTATE = state; END $$;
CREATE TABLE _legacy AS SELECT (SELECT count(*) FROM files) f, (SELECT md5(string_agg(doorloop_id||coalesce(name,''), '' ORDER BY id)) FROM files) h,
  (SELECT count(*) FROM pg_policies WHERE tablename='files_new') p, has_table_privilege('anon','files_new','insert') a, has_table_privilege('authenticated','files','delete') b;
\i :proposal

-- fixtures (superuser)
INSERT INTO document_records (id, name, section, classification, home_kind, home_owner_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000a1','Agreement A','management-contracts','general','owner',17,'t'),
  ('00000000-0000-4000-8000-0000000000a2','Tax summary','financial-tax','financial_tax','owner',17,'t'),
  ('00000000-0000-4000-8000-0000000000b1','Agreement B','management-contracts','general','owner',18,'t');
INSERT INTO document_records (id, name, section, classification, home_kind, home_property_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000c1','Tenant file','tenant-documents','general','property',42,'t');
INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000a1',17,42,'t'),('00000000-0000-4000-8000-0000000000a1',17,43,'t'),('00000000-0000-4000-8000-0000000000b1',18,44,'t');
INSERT INTO document_versions (id, document_id, version_number, byte_size, sha256, media_type, provider, provider_object_ref, provider_revision, created_by) VALUES
  ('00000000-0000-4000-8000-0000000001a1','00000000-0000-4000-8000-0000000000a1',1,100,repeat('a',64),'application/pdf','synthetic','obj-a1','r1','t'),
  ('00000000-0000-4000-8000-0000000001a2','00000000-0000-4000-8000-0000000000a1',2,120,repeat('b',64),'application/pdf','synthetic','obj-a1','r2','t');

-- identity, home and classification
INSERT INTO results SELECT 'one agreement is stored ONCE and covers two properties (two links, one record, one object)',
  (SELECT count(*)=2 FROM document_property_links WHERE document_id='00000000-0000-4000-8000-0000000000a1')
  AND (SELECT count(*)=1 FROM document_records WHERE name='Agreement A') AND (SELECT count(DISTINCT provider_object_ref)=1 FROM document_versions WHERE document_id='00000000-0000-4000-8000-0000000000a1');
INSERT INTO results SELECT 'a record with both homes, or neither, is rejected (sections valid for the kind, so only the home rule can reject)',
  pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,home_property_id,created_by) VALUES ('x','correspondence','general','owner',17,42,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,home_property_id,created_by) VALUES ('x','legal','general','property',17,42,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,created_by) VALUES ('x','correspondence','general','owner','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,created_by) VALUES ('x','legal','general','property','t')$$, '23514');
INSERT INTO results SELECT 'section must match the home kind (owner sections vs property sections)',
  pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','tenant-documents','general','owner',17,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_property_id,created_by) VALUES ('x','correspondence','general','property',42,'t')$$, '23514');
INSERT INTO results SELECT 'classification is mandatory and closed; names cannot be paths or contain control characters',
  pg_temp.err($$INSERT INTO document_records (name,section,home_kind,home_owner_id,created_by) VALUES ('x','correspondence','owner',17,'t')$$, '23502')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','correspondence','secret','owner',17,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('a/b','correspondence','general','owner',17,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES (E'a\nb','correspondence','general','owner',17,'t')$$, '23514');
INSERT INTO results SELECT 'native owner and property ids are enforced by foreign keys',
  pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_owner_id,created_by) VALUES ('x','correspondence','general','owner',999,'t')$$, '23503')
  AND pg_temp.err($$INSERT INTO document_records (name,section,classification,home_kind,home_property_id,created_by) VALUES ('x','legal','general','property',999,'t')$$, '23503');

-- linked agreements cover only the home owner's properties
INSERT INTO results SELECT 'linking an agreement to a property the home owner does not own is rejected',
  pg_temp.err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',17,44,'t')$$, '23503');
INSERT INTO results SELECT 'a link cannot claim a different owner than the document home',
  pg_temp.err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',18,44,'t')$$, '23503');
INSERT INTO results SELECT 'a property-home document cannot be linked as an owner agreement',
  pg_temp.err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000c1',17,42,'t')$$, '23503');
INSERT INTO results SELECT 'a duplicate link is rejected and links are immutable',
  pg_temp.err($$INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',17,42,'t')$$, '23505')
  AND pg_temp.err($$UPDATE document_property_links SET created_by='z'$$, '42501');
INSERT INTO results SELECT 'an ownership link cannot be removed from under a linked document (custody)',
  pg_temp.err($$DELETE FROM property_owners WHERE property_id=42 AND owner_id=17$$, '23503');

-- immutable, contiguous versions; retry/conflict; byte limits
INSERT INTO results SELECT 'version numbers are contiguous: a gap is rejected, a duplicate number is rejected',
  pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',4,1,repeat('c',64),'application/pdf','synthetic','obj-a1','r4','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',2,1,repeat('c',64),'application/pdf','synthetic','obj-a1','r9','t')$$, '23514');
INSERT INTO results SELECT 'the same provider revision cannot be registered twice (no duplicate storage), even for another document',
  pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',3,1,repeat('c',64),'application/pdf','synthetic','obj-a1','r2','t')$$, '23505')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,1,repeat('c',64),'application/pdf','synthetic','obj-a1','r2','t')$$, '23505');
INSERT INTO results SELECT 'digest, size and media type are validated',
  pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,1,repeat('C',64),'application/pdf','synthetic','o','r','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,1,'abc','application/pdf','synthetic','o','r','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,-1,repeat('c',64),'application/pdf','synthetic','o','r','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,9007199254740992,repeat('c',64),'application/pdf','synthetic','o','r','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,1,repeat('c',64),'not a type','synthetic','o','r','t')$$, '23514');
INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',1,9007199254740991,repeat('c',64),'application/pdf','synthetic','o-big','r','t');   -- must succeed (ON_ERROR_STOP)
INSERT INTO results SELECT 'a version at the JS safe-integer ceiling is accepted and stored exactly',
  (SELECT byte_size = 9007199254740991 FROM document_versions WHERE provider_object_ref='o-big');
INSERT INTO results SELECT 'versions are immutable: UPDATE and DELETE are rejected',
  pg_temp.err($$UPDATE document_versions SET sha256 = repeat('d',64)$$, '42501') AND pg_temp.err($$DELETE FROM document_versions$$, '42501');
INSERT INTO results SELECT 'the current-version view returns the highest version', (SELECT version_number = 2 FROM document_current_versions WHERE document_id='00000000-0000-4000-8000-0000000000a1');

-- verified delivery receipts
INSERT INTO document_deliveries (version_id, status, provider_receipt_ref, recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','pending','rc-1','t');
INSERT INTO document_deliveries (version_id, status, provider_receipt_ref, verified_sha256, verified_byte_size, recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','verified','rc-2',repeat('b',64),120,'t');
INSERT INTO results SELECT 'a verified receipt must carry the REGISTERED digest and size (foreign key), a mismatch is rejected',
  pg_temp.err($$INSERT INTO document_deliveries (version_id,status,verified_sha256,verified_byte_size,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','verified',repeat('c',64),120,'t')$$, '23503')
  AND pg_temp.err($$INSERT INTO document_deliveries (version_id,status,verified_sha256,verified_byte_size,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','verified',repeat('b',64),121,'t')$$, '23503');
INSERT INTO results SELECT 'verified requires the digest and size; other statuses must not carry them',
  pg_temp.err($$INSERT INTO document_deliveries (version_id,status,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','verified','t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_deliveries (version_id,status,verified_sha256,verified_byte_size,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','failed',repeat('b',64),120,'t')$$, '23514')
  AND pg_temp.err($$INSERT INTO document_deliveries (version_id,status,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','shipped','t')$$, '23514');
INSERT INTO results SELECT 'receipts are append-only and a receipt reference is unique per version',
  pg_temp.err($$UPDATE document_deliveries SET status='failed'$$, '42501') AND pg_temp.err($$DELETE FROM document_deliveries$$, '42501')
  AND pg_temp.err($$INSERT INTO document_deliveries (version_id,status,provider_receipt_ref,recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','pending','rc-1','t')$$, '23505');
INSERT INTO results SELECT 'the latest receipt decides: verified now', (SELECT status='verified' FROM document_latest_deliveries WHERE version_id='00000000-0000-4000-8000-0000000001a2');
INSERT INTO document_deliveries (version_id, status, provider_receipt_ref, note, recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a2','reconciliation','rc-3','digest drift observed','t');
INSERT INTO results SELECT 'a later reconciliation supersedes an earlier verified receipt', (SELECT status='reconciliation' FROM document_latest_deliveries WHERE version_id='00000000-0000-4000-8000-0000000001a2');

-- records are immutable except one-way retirement
INSERT INTO results SELECT 'a record cannot be renamed, reclassified, re-homed or deleted',
  pg_temp.err($$UPDATE document_records SET name='renamed' WHERE id='00000000-0000-4000-8000-0000000000a1'$$, '42501')
  AND pg_temp.err($$UPDATE document_records SET classification='general' WHERE id='00000000-0000-4000-8000-0000000000a2'$$, '42501')
  AND pg_temp.err($$UPDATE document_records SET home_owner_id=18 WHERE id='00000000-0000-4000-8000-0000000000a1'$$, '42501')
  AND pg_temp.err($$DELETE FROM document_records WHERE id='00000000-0000-4000-8000-0000000000a1'$$, '42501');
UPDATE document_records SET status='retired', retired_at=now() WHERE id='00000000-0000-4000-8000-0000000000b1';
INSERT INTO results SELECT 'a record can be retired once; a retired record takes no new version and cannot be revived',
  (SELECT status='retired' FROM document_records WHERE id='00000000-0000-4000-8000-0000000000b1')
  AND pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000b1',2,1,repeat('e',64),'application/pdf','synthetic','o-ret','r','t')$$, '23514')
  AND pg_temp.err($$UPDATE document_records SET status='active', retired_at=NULL WHERE id='00000000-0000-4000-8000-0000000000b1'$$, '42501');

-- caller-role boundaries: default-deny
INSERT INTO results SELECT 'anon and authenticated hold no privilege on any new table or view',
  NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE grantee IN ('anon','authenticated','PUBLIC') AND table_name IN ('document_records','document_property_links','document_versions','document_deliveries','document_current_versions','document_latest_deliveries'));
INSERT INTO results SELECT 'row-level security is on for every new table', (SELECT bool_and(relrowsecurity) FROM pg_class WHERE relname IN ('document_records','document_property_links','document_versions','document_deliveries'));
INSERT INTO results SELECT 'the runtime role is NOBYPASSRLS and read-only', (SELECT NOT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname='ecc_documents_runtime')
  AND NOT has_table_privilege('ecc_documents_runtime','document_records','insert') AND NOT has_table_privilege('ecc_documents_runtime','document_versions','update');
SET ROLE ecc_documents_runtime;
SELECT set_config('ecc.scope_refs','scope-a,scope-b',false);
INSERT INTO results SELECT 'with RLS and no policy the runtime role sees NOTHING, even with a scope setting (default-deny until the mapping gate is met)',
  (SELECT count(*)=0 FROM document_records) AND (SELECT count(*)=0 FROM document_versions) AND (SELECT count(*)=0 FROM document_deliveries)
  AND (SELECT count(*)=0 FROM document_property_links) AND (SELECT count(*)=0 FROM document_current_versions) AND (SELECT count(*)=0 FROM document_latest_deliveries);
INSERT INTO results SELECT 'the runtime role cannot write', pg_temp.err($$INSERT INTO document_versions (document_id,version_number,byte_size,sha256,media_type,provider,provider_object_ref,provider_revision,created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',3,1,repeat('c',64),'application/pdf','synthetic','z','z','t')$$, '42501');
RESET ROLE;
SELECT set_config('ecc.scope_refs','',false);
SET ROLE anon;
INSERT INTO results SELECT 'anon is refused outright', pg_temp.err($$SELECT * FROM document_records$$, '42501');
RESET ROLE;

-- legacy tables are untouched
INSERT INTO results SELECT 'legacy file tables are unchanged: rows, policies and grants',
  (SELECT f=50 AND h=(SELECT md5(string_agg(doorloop_id||coalesce(name,''), '' ORDER BY id)) FROM files) AND p=(SELECT count(*) FROM pg_policies WHERE tablename='files_new')
          AND a=has_table_privilege('anon','files_new','insert') AND b=has_table_privilege('authenticated','files','delete') FROM _legacy);
SELECT name, ok FROM results WHERE ok IS NOT TRUE;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total FROM results;
