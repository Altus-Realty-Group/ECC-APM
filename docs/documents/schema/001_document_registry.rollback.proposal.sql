-- PROPOSAL ONLY. Guarded PARTIAL rollback for 001. NOT AN EXACT RESTORE and never touches legacy tables.
-- Refuses (changing nothing, when run with ON_ERROR_STOP) while any new table holds rows or the runtime role owns/holds anything else.
-- Removes: the four new tables, two views, triggers/functions, the runtime role's privileges on them, and the role itself.
-- Retains: nothing it created, except that REVOKEd anon/authenticated/PUBLIC access never applied to legacy tables (none was changed).
BEGIN;
LOCK TABLE document_deliveries, document_versions, document_property_links, document_records IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE t text; n bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['document_deliveries','document_versions','document_property_links','document_records'] LOOP
    EXECUTE format('SELECT count(*) FROM %I', t) INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % holds % rows (custody)', t, n; END IF;
  END LOOP;
END $$;
DROP VIEW IF EXISTS document_latest_deliveries, document_current_versions;
DROP TABLE document_deliveries, document_versions, document_property_links, document_records;
DROP FUNCTION IF EXISTS document_version_guard(), document_record_guard(), document_append_only();
DO $$
DECLARE owned bigint; held bigint; cur_db oid := (SELECT oid FROM pg_database WHERE datname = current_database());
BEGIN
  SELECT count(*) INTO owned FROM pg_shdepend d JOIN pg_roles r ON r.oid = d.refobjid WHERE r.rolname = 'ecc_documents_runtime' AND d.deptype = 'o' AND d.dbid = cur_db;
  SELECT count(*) INTO held FROM pg_shdepend d JOIN pg_roles r ON r.oid = d.refobjid WHERE r.rolname = 'ecc_documents_runtime' AND d.deptype <> 'o' AND d.dbid = cur_db;
  IF owned > 0 OR held > 0 THEN
    RAISE EXCEPTION 'rollback refused: ecc_documents_runtime owns % object(s) and holds % other dependency(ies) (role custody)', owned, held;
  END IF;
END $$;
DROP ROLE ecc_documents_runtime;
COMMIT;
