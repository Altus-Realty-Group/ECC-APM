-- PROPOSAL ONLY. Guarded rollback for 003_legal_evidence_linkage.proposal.sql. Removes ONLY what 003 introduced; touches no document, version, evidence row or journal row.
--
-- REFUSES (changing nothing, with ON_ERROR_STOP) while ANY evidence reference is bound or withdrawn, and while ANY journal event carries the attachment dimension or event
-- types (the journal is append-only and a bound/withdrawn row's history must not be orphaned, even if the evidence row was later removed by an owner). Unbind-by-update is
-- impossible by design, so a populated install cannot be rolled back: removing a binding is a separate, reviewed custody decision, never a script.
-- It also refuses, changing nothing, an install that is not EXACTLY what 003 created: the foreign key target and actions, the withdrawal CHECK expression, the binding
-- index keys, predicate and NULLS NOT DISTINCT semantics, all three trigger definitions (function, timing, enablement, WHEN), the six-value journal CHECK and the complete
-- journal policy (command, roles, USING and WITH CHECK). A tampered install is a custody decision for a person, never silently discarded by this script.
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

  -- exact shape: everything 003 introduced must be exactly what 003 created before anything is removed or restored. Expected forms are built on transient temp tables
  -- and compared by deparsed text/catalog fields, so a weakened CHECK, a different index predicate or null semantics, a reshaped trigger, an altered foreign key or an
  -- altered journal policy (USING or WITH CHECK) is refused, never silently discarded.
  CREATE TEMP TABLE zz_exp_legal_case_events (legal_case_id uuid, dimension text, subject_id uuid,
    CONSTRAINT exp_dimension_chk CHECK (dimension IS NULL OR dimension IN
      ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','evidence_attachment','other'))) ON COMMIT DROP;
  SELECT count(*) INTO n FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.legal_case_events'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'dimension')];
  IF n <> 1 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint l, pg_catalog.pg_constraint e
        WHERE l.conrelid = 'public.legal_case_events'::regclass AND l.contype = 'c'
          AND l.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = l.conrelid AND attname = 'dimension')]
          AND e.conrelid = 'pg_temp.zz_exp_legal_case_events'::regclass AND e.conname = 'exp_dimension_chk'
          AND pg_catalog.pg_get_constraintdef(l.oid) = pg_catalog.pg_get_constraintdef(e.oid)) THEN
    RAISE EXCEPTION 'rollback refused: the journal dimension CHECK is not exactly the six 003 values (no changes made)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_policy p WHERE p.polrelid = 'public.legal_case_events'::regclass) THEN
    ALTER TABLE pg_temp.zz_exp_legal_case_events ENABLE ROW LEVEL SECURITY;
    CREATE POLICY exp_rt ON pg_temp.zz_exp_legal_case_events FOR ALL TO ecc_legal_runtime
      USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref))
             AND (dimension IS NULL OR dimension NOT IN ('evidence_confidence', 'evidence_attachment')
                  OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)));
    IF (SELECT count(*) FROM pg_catalog.pg_policy p WHERE p.polrelid = 'public.legal_case_events'::regclass) <> 1
       OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy l, pg_catalog.pg_policy e
          WHERE l.polrelid = 'public.legal_case_events'::regclass AND l.polname = 'legal_case_events_rt'
            AND e.polrelid = 'pg_temp.zz_exp_legal_case_events'::regclass AND e.polname = 'exp_rt'
            AND l.polcmd = e.polcmd AND l.polpermissive = e.polpermissive AND l.polroles = e.polroles
            AND pg_catalog.pg_get_expr(l.polqual, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polqual, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')
            AND pg_catalog.pg_get_expr(l.polwithcheck, l.polrelid) IS NOT DISTINCT FROM replace(pg_catalog.pg_get_expr(e.polwithcheck, e.polrelid), 'zz_exp_legal_case_events', 'legal_case_events')) THEN
      RAISE EXCEPTION 'rollback refused: legal_case_events_rt is not exactly the 003 journal policy (USING or WITH CHECK differs; no changes made)';
    END IF;
  END IF;
  DROP TABLE pg_temp.zz_exp_legal_case_events;

  IF has_refs THEN
    CREATE TEMP TABLE zz_exp_legal_evidence_refs (id uuid, matter_id uuid, requirement_id uuid, document_version_id uuid, withdrawn_at timestamptz,
      CONSTRAINT exp_withdrawal_chk CHECK (withdrawn_at IS NULL OR document_version_id IS NOT NULL)) ON COMMIT DROP;
    CREATE UNIQUE INDEX exp_binding_uq ON pg_temp.zz_exp_legal_evidence_refs (matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT WHERE document_version_id IS NOT NULL;
    CREATE TRIGGER exp_insert_guard BEFORE INSERT ON pg_temp.zz_exp_legal_evidence_refs FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_link_insert_guard();
    CREATE TRIGGER exp_link_guard BEFORE UPDATE ON pg_temp.zz_exp_legal_evidence_refs FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_link_guard();
    CREATE TRIGGER exp_link_journal AFTER UPDATE ON pg_temp.zz_exp_legal_evidence_refs FOR EACH ROW
      WHEN (OLD.document_version_id IS DISTINCT FROM NEW.document_version_id OR OLD.withdrawn_at IS DISTINCT FROM NEW.withdrawn_at)
      EXECUTE FUNCTION public.legal_evidence_link_journal();
    -- foreign key: exact target, columns and actions (a temp table cannot reference a permanent one, so this is compared field by field)
    IF (SELECT count(*) FROM pg_catalog.pg_constraint c WHERE c.conrelid = 'public.legal_evidence_refs'::regclass AND c.conname = 'legal_evidence_refs_document_version_fk' AND c.contype = 'f'
          AND c.confrelid = 'public.document_versions'::regclass AND c.conkey = ARRAY[col_v]
          AND c.confkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = 'public.document_versions'::regclass AND attname = 'id')]
          AND c.confdeltype = 'r' AND c.confupdtype = 'a' AND c.confmatchtype = 's' AND NOT c.condeferrable AND c.convalidated) <> 1 THEN
      RAISE EXCEPTION 'rollback refused: the 003 foreign key is not exactly document_version_id -> document_versions(id) ON DELETE RESTRICT (no changes made)';
    END IF;
    -- withdrawal CHECK: same expression
    IF (SELECT count(*) FROM pg_catalog.pg_constraint l, pg_catalog.pg_constraint e
          WHERE l.conrelid = 'public.legal_evidence_refs'::regclass AND l.conname = 'legal_evidence_refs_withdrawal_requires_version_chk' AND l.contype = 'c'
            AND e.conrelid = 'pg_temp.zz_exp_legal_evidence_refs'::regclass AND e.conname = 'exp_withdrawal_chk'
            AND pg_catalog.pg_get_constraintdef(l.oid) = pg_catalog.pg_get_constraintdef(e.oid)) <> 1 THEN
      RAISE EXCEPTION 'rollback refused: the withdrawal CHECK is not exactly "withdrawn_at IS NULL OR document_version_id IS NOT NULL" (no changes made)';
    END IF;
    -- binding index: unique, valid, same ordered key columns, same predicate and the same NULLS NOT DISTINCT semantics
    IF (SELECT count(*) FROM pg_catalog.pg_index l JOIN pg_catalog.pg_class lc ON lc.oid = l.indexrelid, pg_catalog.pg_index e JOIN pg_catalog.pg_class ec ON ec.oid = e.indexrelid
          WHERE lc.relnamespace = 'public'::regnamespace AND lc.relname = 'legal_evidence_refs_binding_uq' AND l.indrelid = 'public.legal_evidence_refs'::regclass
            AND ec.relname = 'exp_binding_uq' AND ec.relnamespace = pg_catalog.pg_my_temp_schema()
            AND l.indisunique AND e.indisunique AND l.indisvalid AND NOT l.indisprimary AND l.indexprs IS NULL AND l.indnullsnotdistinct = e.indnullsnotdistinct
            AND l.indnkeyatts = 3 AND l.indnatts = e.indnatts AND lc.relam = ec.relam
            AND (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(l.indkey::int2[]) WITH ORDINALITY k(attnum, ord) JOIN pg_catalog.pg_attribute a ON a.attrelid = l.indrelid AND a.attnum = k.attnum)
              = (SELECT array_agg(a.attname ORDER BY k.ord) FROM unnest(e.indkey::int2[]) WITH ORDINALITY k(attnum, ord) JOIN pg_catalog.pg_attribute a ON a.attrelid = e.indrelid AND a.attnum = k.attnum)
            AND pg_catalog.pg_get_expr(l.indpred, l.indrelid) IS NOT DISTINCT FROM pg_catalog.pg_get_expr(e.indpred, e.indrelid)) <> 1 THEN
      RAISE EXCEPTION 'rollback refused: the binding index is not exactly the unique (matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT index with its predicate (no changes made)';
    END IF;
    -- triggers: exact function, timing, events, enablement and WHEN clause
    IF (SELECT count(*) FROM pg_catalog.pg_trigger l, pg_catalog.pg_trigger e
          WHERE l.tgrelid = 'public.legal_evidence_refs'::regclass AND NOT l.tgisinternal AND e.tgrelid = 'pg_temp.zz_exp_legal_evidence_refs'::regclass AND NOT e.tgisinternal
            AND ((l.tgname = 'legal_evidence_refs_link_insert_guard' AND e.tgname = 'exp_insert_guard') OR (l.tgname = 'legal_evidence_refs_link_guard' AND e.tgname = 'exp_link_guard')
              OR (l.tgname = 'legal_evidence_refs_link_journal' AND e.tgname = 'exp_link_journal'))
            AND l.tgfoid = e.tgfoid AND l.tgtype = e.tgtype AND l.tgenabled = 'O' AND l.tgnargs = 0 AND l.tgdeferrable = e.tgdeferrable
            AND substring(pg_catalog.pg_get_triggerdef(l.oid) from ' FOR EACH ROW.*') = substring(pg_catalog.pg_get_triggerdef(e.oid) from ' FOR EACH ROW.*')) <> 3 THEN
      RAISE EXCEPTION 'rollback refused: the three 003 triggers are not exactly the 003 definitions (function, timing, enablement or WHEN differs; unexpected trigger state; no changes made)';
    END IF;
    DROP TABLE pg_temp.zz_exp_legal_evidence_refs;
  END IF;
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
