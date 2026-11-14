-- PROPOSAL ONLY. Guarded PARTIAL rollback for 002_legal_reference_protection.proposal.sql. NOT AN EXACT RESTORE of anything beyond the six delete actions.
--
-- Restores ON DELETE SET NULL (the catalog-verified baseline action for legal_cases; the 001 action for legal_matter_properties) on the six references.
-- CONSEQUENCE: while 001's legal_matter_guard is still installed, SET NULL brings back the defect 002 removes (a referenced parent delete fails 40001 on
-- legal_cases, or collides 23505 under the NULLS NOT DISTINCT unique on legal_matter_properties). So this script REFUSES, changing nothing, while the 001
-- guard is installed and any of those references is populated: unlink them first (explicit revisioned UPDATEs; a legal_matter_properties unlink that would
-- duplicate an existing link must be resolved by a person, never merged here).
-- If 001 has already been rolled back (guard gone), SET NULL is harmless and is restored even with populated legal_cases references.
-- ORDER: roll back 002 BEFORE 001. Rolling back 001 first (tables must be empty) leaves legal_cases RESTRICT as a residual restriction until this script runs
-- (it then skips the dropped legal_matter_properties). Neither script restores anything else, and neither is a legal-retention decision.
-- Run with ON_ERROR_STOP: one transaction; a refusal leaves no change.
BEGIN;
LOCK TABLE legal_cases IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF to_regclass('public.legal_matter_properties') IS NOT NULL THEN LOCK TABLE legal_matter_properties IN ACCESS EXCLUSIVE MODE; END IF; END $$;

DO $$
DECLARE
  spec record; k record; n bigint; col_attnum int2; pk_attnum int2; cname text;
  guard_installed boolean := EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'legal_cases_guard' AND tgrelid = 'public.legal_cases'::regclass AND NOT tgisinternal);
  has_links boolean := to_regclass('public.legal_matter_properties') IS NOT NULL;
BEGIN
  -- the six references must be in exactly the applied (RESTRICT) shape, else this script was not what applied them
  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties'), ('legal_cases','unit_id','units'),
      ('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)
  LOOP
    CONTINUE WHEN spec.child = 'legal_matter_properties' AND NOT has_links;
    SELECT attnum INTO col_attnum FROM pg_attribute WHERE attrelid = ('public.'||spec.child)::regclass AND attname = spec.col AND NOT attisdropped;
    SELECT attnum INTO pk_attnum  FROM pg_attribute WHERE attrelid = ('public.'||spec.parent)::regclass AND attname = 'id_uuid' AND NOT attisdropped;
    SELECT count(*) INTO n FROM pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF n <> 1 THEN RAISE EXCEPTION 'rollback refused: %.% is in % foreign key definition(s), expected exactly 1 (no changes made)', spec.child, spec.col, n; END IF;
    SELECT * INTO k FROM pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF k.conkey <> ARRAY[col_attnum] OR k.confrelid <> ('public.'||spec.parent)::regclass OR k.confkey <> ARRAY[pk_attnum]
       OR k.confupdtype <> 'a' OR k.confmatchtype <> 's' OR k.condeferrable OR NOT k.convalidated OR k.conparentid <> 0 OR k.confdeltype <> 'r' THEN
      RAISE EXCEPTION 'rollback refused: %.% is not the expected RESTRICT definition produced by 002 (found action %); no changes made', spec.child, spec.col, k.confdeltype;
    END IF;
  END LOOP;

  -- populated-reference refusal (only while the guard that makes SET NULL unsafe is installed)
  IF guard_installed THEN
    FOREACH cname IN ARRAY ARRAY['property_id','unit_id','tenant_id','lease_id'] LOOP
      EXECUTE format('SELECT count(*) FROM legal_cases WHERE %I IS NOT NULL', cname) INTO n;
      IF n > 0 THEN RAISE EXCEPTION 'rollback refused: legal_cases.% holds % populated reference(s) while legal_matter_guard is installed (reference custody); unlink them first', cname, n; END IF;
    END LOOP;
    IF has_links THEN
      FOREACH cname IN ARRAY ARRAY['unit_id','lease_id'] LOOP
        EXECUTE format('SELECT count(*) FROM legal_matter_properties WHERE %I IS NOT NULL', cname) INTO n;
        IF n > 0 THEN RAISE EXCEPTION 'rollback refused: legal_matter_properties.% holds % populated reference(s) (reference custody); unlink them first', cname, n; END IF;
      END LOOP;
    END IF;
  END IF;

  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties'), ('legal_cases','unit_id','units'),
      ('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)
  LOOP
    CONTINUE WHEN spec.child = 'legal_matter_properties' AND NOT has_links;
    SELECT c.conname INTO k FROM pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f'
      AND (SELECT attnum FROM pg_attribute WHERE attrelid = c.conrelid AND attname = spec.col) = ANY (c.conkey);
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', spec.child, k.conname);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I (id_uuid) ON DELETE SET NULL', spec.child, k.conname, spec.col, spec.parent);
  END LOOP;
END $$;
COMMIT;
