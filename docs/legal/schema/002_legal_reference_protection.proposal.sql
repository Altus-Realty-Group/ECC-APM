-- PROPOSAL ONLY (ECC-L1-REFERENCE-PROTECTION-v1). NOT APPLIED to any database. Follow-up to 001_native_legal_foundation.proposal.sql.
-- Technical reference-preservation change, NOT a legal retention determination.
--
-- Problem (reproduced in tests/legal-documents-db): 001's legal_matter_guard (revision compare-and-set) also fires for the referential UPDATE of the
-- catalog-verified ON DELETE SET NULL on legal_cases.{property,unit,tenant,lease}_id, so deleting a referenced parent fails 40001. And 001's
-- legal_matter_properties.{unit,lease}_id are SET NULL under a NULLS NOT DISTINCT unique, so the same delete can collide (23505) with a property-only link.
--
-- Change: those six references become ON DELETE RESTRICT, so a referenced parent can never be deleted, and nothing is nulled, merged or deleted implicitly.
-- NOT changed: legal_matter_guard and every revision check (no trigger-depth test, no exemption); the NULLS NOT DISTINCT unique; legal_parties.tenant_id
-- (still SET NULL, out of scope); legal_matter_properties.property_id (already RESTRICT, only verified). Clearing a reference is an explicit revisioned
-- UPDATE (legal_cases: revision = r + 1) by an authorized scoped caller.
--
-- Apply order: 001 first (and any time before runtime use of the legal tables; D1 is independent), then this file, in the same maintenance window.
-- SCHEMA TARGETING: every relation this script locks, alters, references or reads is schema-qualified (public.*, pg_catalog.*), so a same-named relation
-- earlier in search_path (another schema, or a temporary table) is never locked, altered or referenced; only the verified public objects are touched.
-- Run with ON_ERROR_STOP: one transaction, so a refusal leaves no change. One-time apply: it refuses anything that is not the expected 001/baseline shape.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.legal_cases') IS NULL OR to_regclass('public.legal_matter_properties') IS NULL OR to_regprocedure('public.legal_matter_guard()') IS NULL THEN
    RAISE EXCEPTION 'reference protection refused: apply 001_native_legal_foundation first (no changes made)';
  END IF;
END $$;
LOCK TABLE public.legal_cases, public.legal_matter_properties IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  spec record; k record; n int; col_attnum int2; pk_attnum int2;
BEGIN

  -- Pass 1: validate EVERY expected definition before changing any. Identification is by exact child column, target table/column and action;
  -- an unexpected, duplicated, composite, deferrable, unvalidated or differently-acting definition is refused, never "fixed".
  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties','n'), ('legal_cases','unit_id','units','n'),
      ('legal_cases','tenant_id','tenants','n'),      ('legal_cases','lease_id','leases','n'),
      ('legal_matter_properties','unit_id','units','n'), ('legal_matter_properties','lease_id','leases','n'),
      ('legal_matter_properties','property_id','properties','r')) v(child, col, parent, act)
  LOOP
    SELECT attnum INTO col_attnum FROM pg_catalog.pg_attribute WHERE attrelid = ('public.'||spec.child)::regclass AND attname = spec.col AND NOT attisdropped;
    SELECT attnum INTO pk_attnum  FROM pg_catalog.pg_attribute WHERE attrelid = ('public.'||spec.parent)::regclass AND attname = 'id_uuid' AND NOT attisdropped;
    IF col_attnum IS NULL OR pk_attnum IS NULL THEN RAISE EXCEPTION 'reference protection refused: %.% or %.id_uuid is missing (no changes made)', spec.child, spec.col, spec.parent; END IF;
    SELECT count(*) INTO n FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF n <> 1 THEN RAISE EXCEPTION 'reference protection refused: %.% is in % foreign key definition(s), expected exactly 1 (no changes made)', spec.child, spec.col, n; END IF;
    SELECT * INTO k FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF k.conkey <> ARRAY[col_attnum] OR k.confrelid <> ('public.'||spec.parent)::regclass OR k.confkey <> ARRAY[pk_attnum]
       OR k.confupdtype <> 'a' OR k.confmatchtype <> 's' OR k.condeferrable OR NOT k.convalidated OR k.conparentid <> 0 OR k.confdeltype <> spec.act::"char" THEN
      RAISE EXCEPTION 'reference protection refused: %.% -> %(id_uuid) is not the expected single-column definition with delete action % (found action %); no changes made',
        spec.child, spec.col, spec.parent, spec.act, k.confdeltype;
    END IF;
  END LOOP;

  -- Pass 2: rewrite only the six SET NULL references. Same constraint name, same column, same target; only the delete action changes.
  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties'), ('legal_cases','unit_id','units'),
      ('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)
  LOOP
    SELECT c.conname INTO k FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f'
      AND (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = spec.col) = ANY (c.conkey);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', spec.child, k.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I (id_uuid) ON DELETE RESTRICT', spec.child, k.conname, spec.col, spec.parent);
  END LOOP;
END $$;

COMMIT;
