-- PROPOSAL ONLY. Guarded PARTIAL rollback for 002_legal_reference_protection.proposal.sql. NOT AN EXACT RESTORE of anything beyond the six delete actions.
--
-- Restores ON DELETE SET NULL (the catalog-verified baseline action for legal_cases; the 001 action for legal_matter_properties) on the six references.
-- CONSEQUENCES, and the two INDEPENDENT custody rules that follow from them:
--   (1) legal_matter_properties: SET NULL on unit_id/lease_id can collide (23505) with a property-only link under the NULLS NOT DISTINCT unique and would rewrite
--       a legal link implicitly. That hazard does NOT depend on any trigger, so the script REFUSES whenever the table exists and any unit_id/lease_id is populated.
--       Unlink explicitly first; a link that would duplicate another is resolved by a person, never merged here.
--   (2) legal_cases: while 001's legal_matter_guard is bound to legal_cases, SET NULL brings back the 40001 delete defect, so the script REFUSES while any of the
--       four references is populated. The guard is detected by the FUNCTION it runs (any non-internal trigger on public.legal_cases bound to
--       public.legal_matter_guard()), never by trigger name, so renaming the trigger does not bypass the rule. A trigger NAMED legal_cases_guard that is bound
--       to anything else, or that exists while the function does not, is an unexpected trigger state and also refuses. If no trigger is bound to the guard
--       (001 rolled back, or its trigger deliberately dropped) SET NULL is the baseline behaviour and populated legal_cases references may return to it.
-- ORDER: roll back 002 BEFORE 001. Rolling back 001 first (its tables must be empty) leaves legal_cases RESTRICT as a residual restriction until this script
-- runs (it then skips the dropped legal_matter_properties). Neither script restores anything else, and neither is a legal-retention decision.
-- SCHEMA TARGETING: every relation locked, altered, referenced or read is schema-qualified (public.*, pg_catalog.*); a same-named schema or temporary relation
-- earlier in search_path is never touched and never consulted for the populated-row checks.
-- Run with ON_ERROR_STOP: one transaction; a refusal leaves no change.
BEGIN;
LOCK TABLE public.legal_cases IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF to_regclass('public.legal_matter_properties') IS NOT NULL THEN LOCK TABLE public.legal_matter_properties IN ACCESS EXCLUSIVE MODE; END IF; END $$;

DO $$
DECLARE
  spec record; k record; n bigint; col_attnum int2; pk_attnum int2; cname text;
  guard_fn regprocedure := to_regprocedure('public.legal_matter_guard()');
  has_links boolean := to_regclass('public.legal_matter_properties') IS NOT NULL;
  guard_installed boolean;
BEGIN
  -- Trigger state. The guard is whatever non-internal trigger on public.legal_cases runs legal_matter_guard(), under any name.
  guard_installed := guard_fn IS NOT NULL AND EXISTS
    (SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid = 'public.legal_cases'::regclass AND t.tgfoid = guard_fn::oid AND NOT t.tgisinternal);
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid = 'public.legal_cases'::regclass AND t.tgname = 'legal_cases_guard' AND NOT t.tgisinternal
               AND (guard_fn IS NULL OR t.tgfoid <> guard_fn::oid)) THEN
    RAISE EXCEPTION 'rollback refused: trigger legal_cases_guard on legal_cases is not bound to public.legal_matter_guard() (unexpected trigger state; no changes made)';
  END IF;

  -- the six references must be in exactly the applied (RESTRICT) shape, else this script was not what applied them
  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties'), ('legal_cases','unit_id','units'),
      ('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)
  LOOP
    CONTINUE WHEN spec.child = 'legal_matter_properties' AND NOT has_links;
    SELECT attnum INTO col_attnum FROM pg_catalog.pg_attribute WHERE attrelid = ('public.'||spec.child)::regclass AND attname = spec.col AND NOT attisdropped;
    SELECT attnum INTO pk_attnum  FROM pg_catalog.pg_attribute WHERE attrelid = ('public.'||spec.parent)::regclass AND attname = 'id_uuid' AND NOT attisdropped;
    SELECT count(*) INTO n FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF n <> 1 THEN RAISE EXCEPTION 'rollback refused: %.% is in % foreign key definition(s), expected exactly 1 (no changes made)', spec.child, spec.col, n; END IF;
    SELECT * INTO k FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f' AND col_attnum = ANY (c.conkey);
    IF k.conkey <> ARRAY[col_attnum] OR k.confrelid <> ('public.'||spec.parent)::regclass OR k.confkey <> ARRAY[pk_attnum]
       OR k.confupdtype <> 'a' OR k.confmatchtype <> 's' OR k.condeferrable OR NOT k.convalidated OR k.conparentid <> 0 OR k.confdeltype <> 'r' THEN
      RAISE EXCEPTION 'rollback refused: %.% is not the expected RESTRICT definition produced by 002 (found action %); no changes made', spec.child, spec.col, k.confdeltype;
    END IF;
  END LOOP;

  -- custody rule (1): link references, independent of any trigger
  IF has_links THEN
    FOREACH cname IN ARRAY ARRAY['unit_id','lease_id'] LOOP
      EXECUTE format('SELECT count(*) FROM public.legal_matter_properties WHERE %I IS NOT NULL', cname) INTO n;
      IF n > 0 THEN RAISE EXCEPTION 'rollback refused: legal_matter_properties.% holds % populated reference(s) (reference custody); unlink them first', cname, n; END IF;
    END LOOP;
  END IF;
  -- custody rule (2): legal_cases references, only while a trigger runs the revision guard
  IF guard_installed THEN
    FOREACH cname IN ARRAY ARRAY['property_id','unit_id','tenant_id','lease_id'] LOOP
      EXECUTE format('SELECT count(*) FROM public.legal_cases WHERE %I IS NOT NULL', cname) INTO n;
      IF n > 0 THEN RAISE EXCEPTION 'rollback refused: legal_cases.% holds % populated reference(s) while legal_matter_guard is bound (reference custody); unlink them first', cname, n; END IF;
    END LOOP;
  END IF;

  FOR spec IN SELECT * FROM (VALUES
      ('legal_cases','property_id','properties'), ('legal_cases','unit_id','units'),
      ('legal_cases','tenant_id','tenants'),      ('legal_cases','lease_id','leases'),
      ('legal_matter_properties','unit_id','units'), ('legal_matter_properties','lease_id','leases')) v(child, col, parent)
  LOOP
    CONTINUE WHEN spec.child = 'legal_matter_properties' AND NOT has_links;
    SELECT c.conname INTO k FROM pg_catalog.pg_constraint c WHERE c.conrelid = ('public.'||spec.child)::regclass AND c.contype = 'f'
      AND (SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = spec.col) = ANY (c.conkey);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', spec.child, k.conname);
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I (id_uuid) ON DELETE SET NULL', spec.child, k.conname, spec.col, spec.parent);
  END LOOP;
END $$;
COMMIT;
