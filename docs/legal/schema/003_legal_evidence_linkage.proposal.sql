-- PROPOSAL ONLY (ECC-L4-LINK-MODEL-v1; ADR-0004). NOT APPLIED to any database. Follow-up to 001 (L1), D1 and 002. Technical integrity only.
-- SQL INTEGRITY DOES NOT ESTABLISH DOCUMENT AUTHORIZATION. Attaching a registered D1 version to matter evidence proves the version EXISTS and that the legal row
-- and the version are bound exactly once; it grants nobody access to the matter, the document, its classification or its bytes. Matter authority AND D1 target and
-- classification authority are still required, from producers that are not bound today. A database context setting filters a trusted context; it does not authenticate.
--
-- Change (zero new tables, roles, views, grants or policies):
--   * legal_evidence_refs.document_version_id uuid NULL -> document_versions(id) ON DELETE RESTRICT, and withdrawn_at timestamptz NULL, CHECK (withdrawn requires a version).
--   * partial UNIQUE (matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT WHERE document_version_id IS NOT NULL: one binding per matter/requirement/version, a NULL
--     requirement included, withdrawn rows included (a repeat is a replay or a conflict, never a second row; reuse is never an implicit restore).
--   * guards: direct INSERT cannot carry a version or withdrawal; the only null->version and null->time transitions are guarded UPDATEs that need the expected revision
--     (existing revision guard), a trusted actor, change nothing else, never retarget, and append ONE content-free journal event in the same statement.
--   * journal dimension 'evidence_attachment' (the CHECK is extended in place) and the existing evidence-subject mask in legal_case_events_rt is extended to it.
--   * two reviewed commands, legal_attach_evidence_version / legal_withdraw_evidence_version (SECURITY INVOKER: they add NO privilege; the caller's own RLS applies).
-- Existing rows stay UNBOUND whatever their storage_ref, filename, restricted or confidence say. storage_ref is never parsed into an identity. No backfill.
-- Apply order: 001, D1, 002, then this file (it refuses otherwise). One-time apply, one transaction (run with ON_ERROR_STOP): a refusal leaves no change.
-- SCHEMA TARGETING: every relation and function is schema-qualified (public.*, pg_catalog.*) and the new functions pin search_path.
BEGIN;
DO $$
DECLARE n int;
BEGIN
  IF to_regclass('public.legal_evidence_refs') IS NULL OR to_regclass('public.legal_case_events') IS NULL OR to_regclass('public.legal_evidence_requirements') IS NULL
     OR to_regprocedure('public.legal_evidence_guard()') IS NULL OR to_regprocedure('public.legal_actor()') IS NULL THEN
    RAISE EXCEPTION 'evidence linkage refused: apply 001_native_legal_foundation first (no changes made)';
  END IF;
  IF to_regclass('public.document_versions') IS NULL THEN RAISE EXCEPTION 'evidence linkage refused: apply the D1 document registry first (no changes made)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint c WHERE c.conrelid = 'public.legal_cases'::regclass AND c.contype = 'f' AND c.confdeltype = 'r'
                 AND c.confrelid = 'public.properties'::regclass) THEN
    RAISE EXCEPTION 'evidence linkage refused: apply 002_legal_reference_protection first (no changes made)';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid = 'public.legal_evidence_refs'::regclass AND a.attname IN ('document_version_id','withdrawn_at') AND NOT a.attisdropped)
     OR to_regprocedure('public.legal_attach_evidence_version(uuid,uuid,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'evidence linkage refused: already applied or partially present (no changes made)';
  END IF;
  -- the journal dimension CHECK must be exactly the one 001 created (identified by column and definition, never by name)
  SELECT count(*) INTO n FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.legal_case_events'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'dimension')]
      AND pg_catalog.pg_get_constraintdef(c.oid) ~ 'evidence_confidence' AND pg_catalog.pg_get_constraintdef(c.oid) !~ 'evidence_attachment';
  IF n <> 1 THEN RAISE EXCEPTION 'evidence linkage refused: expected exactly one 001 dimension CHECK on legal_case_events, found % (no changes made)', n; END IF;
  -- the journal policy must be exactly the 001 policy (one policy, the runtime role, confidence-only evidence mask)
  SELECT count(*) INTO n FROM pg_catalog.pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'legal_case_events' AND p.policyname = 'legal_case_events_rt'
    AND p.cmd = 'ALL' AND p.roles = ARRAY['ecc_legal_runtime']::name[] AND p.qual ~ 'evidence_confidence' AND p.qual !~ 'evidence_attachment';
  IF n <> 1 THEN RAISE EXCEPTION 'evidence linkage refused: legal_case_events_rt is not the 001 journal policy (no changes made)'; END IF;
END $$;
LOCK TABLE public.legal_evidence_refs, public.legal_case_events IN ACCESS EXCLUSIVE MODE;

-- 1. Columns, FK, CHECK, partial unique index. Existing rows get NULL/NULL (unbound); nothing is rewritten or inferred.
ALTER TABLE public.legal_evidence_refs ADD COLUMN document_version_id uuid, ADD COLUMN withdrawn_at timestamptz;
ALTER TABLE public.legal_evidence_refs ADD CONSTRAINT legal_evidence_refs_document_version_fk
  FOREIGN KEY (document_version_id) REFERENCES public.document_versions (id) ON DELETE RESTRICT;
ALTER TABLE public.legal_evidence_refs ADD CONSTRAINT legal_evidence_refs_withdrawal_requires_version_chk
  CHECK (withdrawn_at IS NULL OR document_version_id IS NOT NULL);
CREATE UNIQUE INDEX legal_evidence_refs_binding_uq ON public.legal_evidence_refs (matter_id, requirement_id, document_version_id) NULLS NOT DISTINCT
  WHERE document_version_id IS NOT NULL;

-- 2. Journal: one more dimension, same constraint name, original values kept. Events are append-only and never rewritten here.
DO $$
DECLARE cname name;
BEGIN
  SELECT c.conname INTO cname FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.legal_case_events'::regclass AND c.contype = 'c'
      AND c.conkey = ARRAY[(SELECT attnum FROM pg_catalog.pg_attribute WHERE attrelid = c.conrelid AND attname = 'dimension')]
      AND pg_catalog.pg_get_constraintdef(c.oid) ~ 'evidence_confidence';
  EXECUTE format('ALTER TABLE public.legal_case_events DROP CONSTRAINT %I', cname);
  EXECUTE format($f$ALTER TABLE public.legal_case_events ADD CONSTRAINT %I CHECK (dimension IS NULL OR dimension IN
    ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','evidence_attachment','other'))$f$, cname);
END $$;

-- 3. Guards. BEFORE INSERT: a new reference is born unbound. BEFORE UPDATE (fires after 001's legal_evidence_refs_guard, which already enforces revision = r + 1):
--    the binding is immutable, the only transitions are one attach and one withdraw, each needs a trusted actor (legal_actor() raises 42501 without one) and may change
--    nothing else; the server, not the caller, supplies the withdrawal time. AFTER UPDATE: the content-free journal event, in the same statement.
CREATE FUNCTION public.legal_evidence_link_insert_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF NEW.document_version_id IS NOT NULL OR NEW.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'legal: new evidence references must start unbound (attach through the guarded command)' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER legal_evidence_refs_link_insert_guard BEFORE INSERT ON public.legal_evidence_refs
  FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_link_insert_guard();

CREATE FUNCTION public.legal_evidence_link_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE attaching boolean; withdrawing boolean;
BEGIN
  IF OLD.document_version_id IS NOT NULL AND NEW.document_version_id IS DISTINCT FROM OLD.document_version_id THEN
    RAISE EXCEPTION 'legal: a bound evidence version cannot be retargeted or unbound' USING ERRCODE = '23514';
  END IF;
  IF OLD.document_version_id IS NOT NULL AND (NEW.matter_id IS DISTINCT FROM OLD.matter_id OR NEW.requirement_id IS DISTINCT FROM OLD.requirement_id) THEN
    RAISE EXCEPTION 'legal: matter and requirement association of bound evidence is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.withdrawn_at IS NOT NULL AND NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at THEN
    RAISE EXCEPTION 'legal: withdrawn evidence cannot be restored or withdrawn again' USING ERRCODE = '23514';
  END IF;
  IF OLD.document_version_id IS NULL AND NEW.withdrawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'legal: an unbound evidence reference cannot be withdrawn (attach and withdraw are separate guarded steps)' USING ERRCODE = '23514';
  END IF;
  attaching := OLD.document_version_id IS NULL AND NEW.document_version_id IS NOT NULL;
  withdrawing := OLD.withdrawn_at IS NULL AND NEW.withdrawn_at IS NOT NULL;
  IF attaching OR withdrawing THEN
    PERFORM public.legal_actor();
    IF (NEW.matter_id, NEW.requirement_id, NEW.ref_kind, NEW.storage_ref, NEW.confidence, NEW.restricted)
       IS DISTINCT FROM (OLD.matter_id, OLD.requirement_id, OLD.ref_kind, OLD.storage_ref, OLD.confidence, OLD.restricted) THEN
      RAISE EXCEPTION 'legal: attachment and withdrawal change nothing else (confidence and requirement status are never altered by them)' USING ERRCODE = '23514';
    END IF;
    IF withdrawing THEN NEW.withdrawn_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER legal_evidence_refs_link_guard BEFORE UPDATE ON public.legal_evidence_refs
  FOR EACH ROW EXECUTE FUNCTION public.legal_evidence_link_guard();

CREATE FUNCTION public.legal_evidence_link_journal() RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
BEGIN
  IF OLD.document_version_id IS NULL AND NEW.document_version_id IS NOT NULL THEN
    INSERT INTO public.legal_case_events (legal_case_id, event_type, from_status, to_status, dimension, actor, subject_id, source, created_at)
    VALUES (NEW.matter_id, 'evidence_attached', 'unbound', 'attached', 'evidence_attachment', public.legal_actor(), NEW.id, 'legal_evidence_link_journal', now());
  ELSIF OLD.withdrawn_at IS NULL AND NEW.withdrawn_at IS NOT NULL THEN
    INSERT INTO public.legal_case_events (legal_case_id, event_type, from_status, to_status, dimension, actor, subject_id, source, created_at)
    VALUES (NEW.matter_id, 'evidence_withdrawn', 'attached', 'withdrawn', 'evidence_attachment', public.legal_actor(), NEW.id, 'legal_evidence_link_journal', now());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER legal_evidence_refs_link_journal AFTER UPDATE ON public.legal_evidence_refs
  FOR EACH ROW WHEN (OLD.document_version_id IS DISTINCT FROM NEW.document_version_id OR OLD.withdrawn_at IS DISTINCT FROM NEW.withdrawn_at)
  EXECUTE FUNCTION public.legal_evidence_link_journal();

-- 4. Journal privacy: events about an evidence subject are visible only if the evidence row itself is visible to the caller (restricted stays masked).
--    The new dimension joins the existing mask; it is never carried by an unrelated, unmasked dimension.
DROP POLICY legal_case_events_rt ON public.legal_case_events;
CREATE POLICY legal_case_events_rt ON public.legal_case_events FOR ALL TO ecc_legal_runtime
  USING (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref))
         AND (dimension IS NULL OR dimension NOT IN ('evidence_confidence', 'evidence_attachment')
              OR EXISTS (SELECT 1 FROM public.legal_evidence_refs e WHERE e.id = subject_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.legal_cases m WHERE m.id = legal_case_id AND public.legal_scope_ok(m.scope_ref)));

-- 5. Reviewed commands. SECURITY INVOKER: the caller's own table privileges and RLS decide visibility and success; the functions grant nothing.
--    Each takes the expected revision, locks the row, and returns a fixed word: an exact replay (same version/withdrawal at expected + 1) is a no-op, never a
--    second row, revision or event; anything else is a conflict. Unavailable (wrong scope, no context, no such row) is one indistinguishable 42501.
CREATE FUNCTION public.legal_attach_evidence_version(p_evidence_id uuid, p_version_id uuid, p_expected_revision integer) RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE r public.legal_evidence_refs%ROWTYPE;
BEGIN
  PERFORM public.legal_actor();
  IF p_evidence_id IS NULL OR p_version_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'legal: invalid attachment request' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM public.legal_evidence_refs WHERE id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'legal: evidence reference unavailable' USING ERRCODE = '42501'; END IF;
  IF r.document_version_id IS NOT DISTINCT FROM p_version_id AND r.withdrawn_at IS NULL AND r.revision = p_expected_revision + 1 THEN RETURN 'already_attached'; END IF;
  IF r.document_version_id IS NOT NULL THEN RAISE EXCEPTION 'legal: evidence reference is already bound' USING ERRCODE = '23514'; END IF;
  IF r.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'legal: stale or omitted revision (expected %, got %)', r.revision, p_expected_revision USING ERRCODE = '40001';
  END IF;
  UPDATE public.legal_evidence_refs SET document_version_id = p_version_id, revision = p_expected_revision + 1 WHERE id = p_evidence_id;
  RETURN 'attached';
END $$;

CREATE FUNCTION public.legal_withdraw_evidence_version(p_evidence_id uuid, p_expected_revision integer) RETURNS text
LANGUAGE plpgsql SET search_path = pg_catalog, pg_temp AS $$
DECLARE r public.legal_evidence_refs%ROWTYPE;
BEGIN
  PERFORM public.legal_actor();
  IF p_evidence_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION 'legal: invalid withdrawal request' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM public.legal_evidence_refs WHERE id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'legal: evidence reference unavailable' USING ERRCODE = '42501'; END IF;
  IF r.document_version_id IS NOT NULL AND r.withdrawn_at IS NOT NULL AND r.revision = p_expected_revision + 1 THEN RETURN 'already_withdrawn'; END IF;
  IF r.document_version_id IS NULL OR r.withdrawn_at IS NOT NULL THEN RAISE EXCEPTION 'legal: evidence reference is not an active binding' USING ERRCODE = '23514'; END IF;
  IF r.revision <> p_expected_revision THEN
    RAISE EXCEPTION 'legal: stale or omitted revision (expected %, got %)', r.revision, p_expected_revision USING ERRCODE = '40001';
  END IF;
  UPDATE public.legal_evidence_refs SET withdrawn_at = now(), revision = p_expected_revision + 1 WHERE id = p_evidence_id;
  RETURN 'withdrawn';
END $$;

COMMIT;
