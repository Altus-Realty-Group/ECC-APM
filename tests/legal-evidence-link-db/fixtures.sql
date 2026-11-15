-- Synthetic fixtures that exist BEFORE 003 is applied (D1 documents/versions, L1 matters/requirements, LEGACY evidence refs). Superuser; no real data.
\set ON_ERROR_STOP on
INSERT INTO document_records (id, name, section, classification, home_kind, home_owner_id, created_by) VALUES
  ('00000000-0000-4000-8000-0000000000a1','Agreement A','management-contracts','general','owner',17,'t'),
  ('00000000-0000-4000-8000-0000000000a2','Other doc','correspondence','general','owner',18,'t');
INSERT INTO document_versions (id, document_id, version_number, byte_size, sha256, media_type, provider, provider_object_ref, provider_revision, created_by) VALUES
  ('00000000-0000-4000-8000-0000000001a1','00000000-0000-4000-8000-0000000000a1',1,100,repeat('a',64),'application/pdf','synthetic','o1','r1','t'),
  ('00000000-0000-4000-8000-0000000001a2','00000000-0000-4000-8000-0000000000a1',2,120,repeat('b',64),'application/pdf','synthetic','o1','r2','t'),
  ('00000000-0000-4000-8000-0000000001b1','00000000-0000-4000-8000-0000000000a2',1,50,repeat('c',64),'application/pdf','synthetic','o2','r1','t');
INSERT INTO legal_cases (id, case_type, status, scope_ref) VALUES
  ('00000000-0000-4000-8000-0000000f0a01','other','draft','scopeA'),('00000000-0000-4000-8000-0000000f0b01','other','draft','scopeB');
INSERT INTO legal_evidence_requirements (id, matter_id, requirement_key) VALUES
  ('00000000-0000-4000-8000-00000000a301','00000000-0000-4000-8000-0000000f0a01','lease'),
  ('00000000-0000-4000-8000-00000000a302','00000000-0000-4000-8000-0000000f0a01','notice'),
  ('00000000-0000-4000-8000-00000000b301','00000000-0000-4000-8000-0000000f0b01','lease');
-- legacy refs: e1's storage_ref is EXACTLY a registered version id (it must still be unbound); e3 is restricted
INSERT INTO legal_evidence_refs (id, matter_id, requirement_id, ref_kind, storage_ref, restricted) VALUES
  ('00000000-0000-4000-8000-00000000e001','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a301','doc','00000000-0000-4000-8000-0000000001a1',false),
  ('00000000-0000-4000-8000-00000000e002','00000000-0000-4000-8000-0000000f0a01',NULL,'doc','opaque-2',false),
  ('00000000-0000-4000-8000-00000000e003','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a301','doc','opaque-3',true),
  ('00000000-0000-4000-8000-00000000e004','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a302','doc','opaque-4',false),
  ('00000000-0000-4000-8000-00000000e005','00000000-0000-4000-8000-0000000f0b01','00000000-0000-4000-8000-00000000b301','doc','opaque-5',false),
  ('00000000-0000-4000-8000-00000000e006','00000000-0000-4000-8000-0000000f0a01','00000000-0000-4000-8000-00000000a302','doc','ExhibitF.pdf',false);
