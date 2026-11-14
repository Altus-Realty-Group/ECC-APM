-- Synthetic rows in every NEW table of both proposals (so populated rollback refusal is meaningful). Superuser; no real data.
\set ON_ERROR_STOP on
INSERT INTO legal_cases (id, case_type, status, scope_ref, court_ref, docket_number) VALUES ('00000000-0000-4000-8000-00000000a001','collections','filed','scopeA','courtX','D-1');
INSERT INTO legal_parties (id, matter_id, role, display_name) VALUES
  ('00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a001','defendant','Party A1'),
  ('00000000-0000-4000-8000-00000000a102','00000000-0000-4000-8000-00000000a001','defendant','Party A2');
INSERT INTO legal_awards (id, matter_id, award_kind, amount_cents, currency) VALUES ('00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a001','damages',100000,'USD');
INSERT INTO legal_award_obligors (matter_id, award_id, party_id, liability) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a101','sole');
INSERT INTO legal_evidence_requirements (id, matter_id, requirement_key) VALUES ('00000000-0000-4000-8000-00000000a301','00000000-0000-4000-8000-00000000a001','lease');
INSERT INTO legal_evidence_refs (matter_id, ref_kind, storage_ref) VALUES ('00000000-0000-4000-8000-00000000a001','doc','opaque-1');
INSERT INTO legal_matter_properties (matter_id, property_id) VALUES ('00000000-0000-4000-8000-00000000a001','00000000-0000-4000-8000-000000000042');
INSERT INTO legal_source_links (matter_id, source_system, source_id) VALUES ('00000000-0000-4000-8000-00000000a001','synthetic','S-1');
INSERT INTO legal_case_events (legal_case_id, event_type) VALUES ('00000000-0000-4000-8000-00000000a001','note');
INSERT INTO document_records (id, name, section, classification, home_kind, home_owner_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1','Agreement A','management-contracts','general','owner',17,'t');
INSERT INTO document_records (id, name, section, classification, home_kind, home_property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000c1','Tenant file','tenant-documents','general','property',42,'t');
INSERT INTO document_property_links (document_id, owner_id, property_id, created_by) VALUES ('00000000-0000-4000-8000-0000000000a1',17,42,'t');
INSERT INTO document_versions (id, document_id, version_number, byte_size, sha256, media_type, provider, provider_object_ref, provider_revision, created_by) VALUES
  ('00000000-0000-4000-8000-0000000001a1','00000000-0000-4000-8000-0000000000a1',1,100,repeat('a',64),'application/pdf','synthetic','obj-a1','r1','t');
INSERT INTO document_deliveries (version_id, status, provider_receipt_ref, verified_sha256, verified_byte_size, recorded_by) VALUES ('00000000-0000-4000-8000-0000000001a1','verified','rcpt-1',repeat('a',64),100,'t');
