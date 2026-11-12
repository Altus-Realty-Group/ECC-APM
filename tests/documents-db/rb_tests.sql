\set ON_ERROR_STOP on
SET client_min_messages=warning;
CREATE TABLE results(name text, ok boolean);
\i :proposal
INSERT INTO document_records (name, section, classification, home_kind, home_owner_id, created_by) VALUES ('Agreement','management-contracts','general','owner',17,'t');
\set ON_ERROR_STOP off
\i :rollback
\set ON_ERROR_STOP on
ROLLBACK;
INSERT INTO results SELECT 'rollback refused while populated; tables and role intact', (SELECT count(*)=1 FROM document_records) AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_documents_runtime');
TRUNCATE document_records CASCADE;
\i :rollback
INSERT INTO results SELECT 'rollback on empty tables removes the tables, views and role',
  NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename LIKE 'document\_%') AND NOT EXISTS (SELECT 1 FROM pg_views WHERE viewname LIKE 'document\_%')
  AND NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ecc_documents_runtime') AND NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname LIKE 'document\_%');
INSERT INTO results SELECT 'rollback leaves the inspected native tables and legacy tables alone', (SELECT count(*)=3 FROM property_owners) AND (SELECT count(*)=50 FROM files);
SELECT name, ok FROM results WHERE ok IS NOT TRUE;
SELECT count(*) FILTER (WHERE ok) AS passed, count(*) AS total FROM results;
