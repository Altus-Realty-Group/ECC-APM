-- PROPOSAL ONLY. Guarded rollback for 003_legal_evidence_linkage.proposal.sql. Removes ONLY what 003 introduced; touches no document, version, evidence row or journal row.
--
-- REFUSES (changing nothing, with ON_ERROR_STOP) while ANY evidence reference is bound or withdrawn, and while ANY journal event carries the attachment dimension or event
-- types (the journal is append-only and a bound/withdrawn row's history must not be orphaned, even if the evidence row was later removed by an owner). Unbind-by-update is
-- impossible by design, so a populated install cannot be rolled back: removing a binding is a separate, reviewed custody decision, never a script.
-- It also refuses an install that is not exactly what 003 created (an unexpected trigger, constraint, index or policy shape).
-- Empty rollback restores the 001 journal CHECK (same name, original values) and the original 001 legal_case_events_rt policy text, and drops the two columns, FK, CHECK,
-- partial unique index, three triggers and five functions. Journal rows (including confidence events) and every other row are untouched.
-- ORDER: roll back 003 BEFORE 002, 001 and the D1 registry. D1's own rollback cannot drop document_versions while the 003 foreign key exists (a dependency error: safe, no change).
-- Rolling back 001 first (its tables must be empty) leaves the extended journal CHECK and the five functions as residuals until this script runs; it then skips the dropped table.
-- SCHEMA TARGETING: every relation is schema-qualified (public.*, pg_catalog.*). Run with ON_ERROR_STOP: one transaction; a refusal leaves no change.
BEGIN;
LOCK TABLE public.legal_case_events IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF to_regclass('public.legal_evidence_refs') IS NOT NULL THEN LOCK TABLE public.legal_evidence_refs IN ACCESS EXCLUSIVE MODE; END IF; END $$;

DO $$
DECLARE
  has_refs boolean := to_regclass('public.legal_evidence_refs') IS NOT NULL;
  n bigint; cname name; col_v int2; col_w int2;
BEGIN
  IF has_refs THEN
    SELECT attnum INTO col_v FROM pg_catalog.pg_attribute WHERE attrelid = 'public.legal_evidence_refs'::regclass AND attname = 'document_version_id' AND NOT attisdropped;
    SELECT attnum INTO col_w FROM pg_catalog.pg_attribute WHERE attrelid = 'public.legal_evidence_refs'::regclass AND attname = 'withdrawn_at' AND NOT attisdropped;
    IF col_v IS NULL OR col_w IS NULL THEN RAISE EXCEPTION 'rollback refused: legal_evidence_refs does not carry the 003 columns (no changes made)'; END IF;
    EXECUTE 'SELECT count(*) FROM public.legal_evidence_refs WHERE document_version_id IS NOT NULL OR withdrawn_at IS NOT NULL' INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % evidence reference(s) are bound or withdrawn (evidence custody); nothing was changed', n; END IF;
  END IF;
  SELECT count(*) INTO n FROM public.legal_case_events WHERE dimension = 'evidence_attachment' OR event_type IN ('evidence_attached', 'evidence_withdrawn');
  IF n > 0 THEN RAISE EXCEPTION 'rollback refused: % attachment/withdrawal journal event(s) exist (journal custody); nothing was changed', n; END IF;

  -- expected shape
  IF has_refs THEN
    IF (SELECT count(*) FROM pg_catalog.pg_constraint c WHERE c.conrelid = 'public.legal_evidence_refs'::regclass AND c.conname = 'legal_evidence_refs_document_version_fk' AND c.contype = 'f'
          AND c.confrelid = 'public.document_versions'::regclass AND c.confdeltype = 'r' AND c.conkey = ARRAY[col_v] AND NOT c.condeferrable AND c.convalidated) <> 1
       OR (SELECT count(*) FROM pg_catalog.pg_constraint c WHERE c.conrelid = 'public.legal_evidence_refs'::regclass AND c.conname = 'legal_evidence_refs_withdrawal_requires_version_chk' AND c.contype = 'c') <> 1
       OR (SELECT count(*) FROM pg_catalog.pg_indexes i WHERE i.schemaname = 'public' AND i.indexname = 'legal_evidence_refs_binding_uq' AND i.indexdef ~ 'UNIQUE' AND i.indexdef ~ 'NULLS NOT DISTINCT' AND i.indexdef ~ 'WHERE') <> 1 THEN
      RAISE EXCEPTION 'rollback refused: the 003 foreign key, CHECK or partial unique index is not in the expected form (no changes made)';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_trigger t WHERE t.tgrelid = 'public.legal_evidence_refs'::regclass AND NOT t.tgisinternal
          AND (t.tgname, t.tgfoid) IN (('legal_evidence_refs_link_insert_guard', to_regproc('public.legal_evidence_link_insert_guard')::oid),
                                       ('legal_evidence_refs_link_guard',        to_regproc('public.legal_evidence_link_guard')::oid),
                                       ('legal_evidence_refs_link_journal',      to_regproc('public.legal_evidence_link_journal')::oid))) <> 3 THEN
      RAISE EXCEPTION 'rollback refused: the three 003 triggers are not bound to the 003 functions (unexpected trigger state; no changes made)';
    END IF;
  END IF;
  SELECT count(*) INTO n FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.legal_case_events'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'dimension')]
      AND pg_catalog.pg_get_constraintdef(c.oid) ~ 'evidence_attachment';
  IF n <> 1 THEN RAISE EXCEPTION 'rollback refused: expected exactly one extended dimension CHECK on legal_case_events, found % (no changes made)', n; END IF;
END $$;

-- remove (all guarded above)
DO $$
BEGIN
  IF to_regclass('public.legal_evidence_refs') IS NOT NULL THEN
    DROP TRIGGER legal_evidence_refs_link_journal ON public.legal_evidence_refs;
    DROP TRIGGER legal_evidence_refs_link_guard ON public.legal_evidence_refs;
    DROP TRIGGER legal_evidence_refs_link_insert_guard ON public.legal_evidence_refs;
    DROP INDEX public.legal_evidence_refs_binding_uq;
    ALTER TABLE public.legal_evidence_refs DROP CONSTRAINT legal_evidence_refs_withdrawal_requires_version_chk;
    ALTER TABLE public.legal_evidence_refs DROP CONSTRAINT legal_evidence_refs_document_version_fk;
    ALTER TABLE public.legal_evidence_refs DROP COLUMN withdrawn_at, DROP COLUMN document_version_id;
  END IF;
END $$;
DROP FUNCTION public.legal_withdraw_evidence_version(uuid, integer);
DROP FUNCTION public.legal_attach_evidence_version(uuid, uuid, integer);
DROP FUNCTION public.legal_evidence_link_journal();
DROP FUNCTION public.legal_evidence_link_guard();
DROP FUNCTION public.legal_evidence_link_insert_guard();

DO $$
DECLARE cname name;
BEGIN
  SELECT c.conname INTO cname FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.legal_case_events'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'dimension')]
      AND pg_catalog.pg_get_constraintdef(c.oid) ~ 'evidence_attachment';
  EXECUTE format('ALTER TABLE public.legal_case_events DROP CONSTRAINT %I', cname);
  EXECUTE format($f$ALTER TABLE public.legal_case_events ADD CONSTRAINT %I CHECK (dimension IS NULL OR dimension IN
    ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','other'))$f$, cname);
  -- restore the 001 journal policy text; skipped if 001's own rollback already dropped it
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'legal_case_events' AND p.policyname = 'legal_case_events_rt' AND p.qual ~ 'evidence_attachment') THEN
    DROP POLICY legal_case_events_rt ON public.legal_case_events;
    CREATE POLICY legal_case_events_rt ON public.legal_case_events FOR ALL TO ecc_legal_runtime
      USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref))
             AND (dimension IS DISTINCT FROM 'evidence_confidence'
                  OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)));
  END IF;
END $$;
COMMIT;
