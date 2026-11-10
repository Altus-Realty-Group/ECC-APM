-- PROPOSAL ONLY (ECC-LEGAL-CLAUDE-v1 / issue #214). NOT APPLIED to any database.
-- Additive native legal model. See docs/legal/adr/ADR-0001-*.md. Applying needs a separate reviewed migration.
-- Idempotent where practical; the whole file runs in one transaction.
BEGIN;

-- 0. Runtime role: dedicated, non-bypass, no login here (login/credentials are an ops decision).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ecc_legal_runtime') THEN
    CREATE ROLE ecc_legal_runtime NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

-- 1. Verified authorization context (fail closed): set per transaction by the server after central identity checks.
--    SELECT set_config('ecc.scope_refs','scopeA,scopeB',true); set_config('ecc.actor','<actor-ref>',true);
CREATE OR REPLACE FUNCTION legal_scope_ok(p_scope text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT p_scope IS NOT NULL
     AND p_scope = ANY (string_to_array(coalesce(current_setting('ecc.scope_refs', true), ''), ','))
$$;
CREATE OR REPLACE FUNCTION legal_actor() RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE a text := nullif(current_setting('ecc.actor', true), '');
BEGIN
  IF a IS NULL THEN RAISE EXCEPTION 'legal: no verified actor context' USING ERRCODE = '42501'; END IF;
  RETURN a;
END $$;

-- 2. legal_cases: resolve case_type, docket identity, add scope + revision. Existing rows keep scope_ref NULL
--    (invisible to the runtime role until a reviewed backfill assigns scope).
ALTER TABLE legal_cases DROP CONSTRAINT IF EXISTS legal_cases_case_type_check;
ALTER TABLE legal_cases DROP CONSTRAINT IF EXISTS legal_cases_case_type_chk;
ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_case_type_v2_chk CHECK (case_type IN
  ('eviction','damages','eviction_and_damages','collections','quiet_title','foreclosure','other'));
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS scope_ref text;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS jurisdiction_ref text;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS court_ref text;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS docket_number text;
ALTER TABLE legal_cases ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE legal_cases ALTER COLUMN case_number DROP NOT NULL;
ALTER TABLE legal_cases DROP CONSTRAINT IF EXISTS legal_cases_case_number_key;
CREATE INDEX IF NOT EXISTS legal_cases_case_number_idx ON legal_cases (case_number);
CREATE UNIQUE INDEX IF NOT EXISTS legal_cases_docket_identity_uq
  ON legal_cases (scope_ref, court_ref, docket_number)
  WHERE scope_ref IS NOT NULL AND court_ref IS NOT NULL AND docket_number IS NOT NULL;

-- 3. Child tables. FKs everywhere; amounts only on awards.
CREATE TABLE IF NOT EXISTS legal_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('plaintiff','defendant','tenant','guarantor','occupant','attorney','other')),
  display_name text NOT NULL CHECK (btrim(display_name) <> ''),
  tenant_id uuid REFERENCES tenants(id_uuid) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS legal_matter_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  property_id uuid NOT NULL REFERENCES properties(id_uuid) ON DELETE RESTRICT,
  unit_id uuid REFERENCES units(id_uuid) ON DELETE SET NULL,
  lease_id uuid REFERENCES leases(id_uuid) ON DELETE SET NULL,
  is_primary boolean NOT NULL DEFAULT false,
  UNIQUE (matter_id, property_id, unit_id, lease_id)
);
CREATE TABLE IF NOT EXISTS legal_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  award_kind text NOT NULL CHECK (award_kind IN ('possession','rent','damages','fees','costs','interest','other')),
  amount_cents bigint CHECK (amount_cents IS NULL OR amount_cents >= 0),   -- NULL = unknown, never defaulted to 0
  currency char(3),
  judgment_verification text NOT NULL DEFAULT 'unverified'
    CHECK (judgment_verification IN ('unverified','verified','disputed','vacated')),
  collection_readiness text NOT NULL DEFAULT 'not_ready'
    CHECK (collection_readiness IN ('not_ready','ready','in_collection','closed')),
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (amount_cents IS NULL OR currency IS NOT NULL),
  CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$')
);
CREATE TABLE IF NOT EXISTS legal_award_obligors (   -- no amount columns by design: joint liability cannot multiply an award
  award_id uuid NOT NULL REFERENCES legal_awards(id) ON DELETE RESTRICT,
  party_id uuid NOT NULL REFERENCES legal_parties(id) ON DELETE RESTRICT,
  liability text NOT NULL CHECK (liability IN ('sole','joint','several')),
  PRIMARY KEY (award_id, party_id)
);
CREATE TABLE IF NOT EXISTS legal_evidence_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  requirement_key text NOT NULL CHECK (btrim(requirement_key) <> ''),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','satisfied','waived')),
  UNIQUE (matter_id, requirement_key)
);
CREATE TABLE IF NOT EXISTS legal_evidence_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  requirement_id uuid REFERENCES legal_evidence_requirements(id) ON DELETE SET NULL,
  ref_kind text NOT NULL,
  storage_ref text NOT NULL,                       -- opaque pointer; documents themselves never live here
  confidence text NOT NULL DEFAULT 'unreviewed' CHECK (confidence IN ('unreviewed','low','medium','high')),
  restricted boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS legal_source_links (   -- crosswalk: external/legacy identifiers, never the matter key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id uuid NOT NULL REFERENCES legal_cases(id) ON DELETE RESTRICT,
  source_system text NOT NULL,
  source_id text NOT NULL,
  legacy_int_id integer,
  UNIQUE (source_system, source_id)
);

-- 4. Journal: single append-only audit trail (legal_case_events). Legacy case_history is frozen read-only.
ALTER TABLE legal_case_events ADD COLUMN IF NOT EXISTS dimension text
  CHECK (dimension IS NULL OR dimension IN ('lifecycle','judgment_verification','collection_readiness','evidence_confidence','other'));
ALTER TABLE legal_case_events ADD COLUMN IF NOT EXISTS actor text;
ALTER TABLE legal_case_events ADD COLUMN IF NOT EXISTS subject_id uuid;
ALTER TABLE legal_case_events ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE legal_case_events DROP CONSTRAINT IF EXISTS legal_case_events_matter_fk;
ALTER TABLE legal_case_events ADD CONSTRAINT legal_case_events_matter_fk
  FOREIGN KEY (legal_case_id) REFERENCES legal_cases(id) ON DELETE RESTRICT NOT VALID;

CREATE OR REPLACE FUNCTION legal_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'legal_case_events is append-only' USING ERRCODE = '42501'; END $$;
DROP TRIGGER IF EXISTS legal_events_no_mutate ON legal_case_events;
CREATE TRIGGER legal_events_no_mutate BEFORE UPDATE OR DELETE ON legal_case_events
  FOR EACH ROW EXECUTE FUNCTION legal_events_append_only();

-- 5. Revision compare-and-set + journalling of each dimension change.
CREATE OR REPLACE FUNCTION legal_matter_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revision IS DISTINCT FROM OLD.revision THEN
    RAISE EXCEPTION 'legal: stale revision (read %, current %)', NEW.revision, OLD.revision USING ERRCODE = '40001';
  END IF;
  NEW.revision := OLD.revision + 1;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO legal_case_events (legal_case_id, event_type, from_status, to_status, dimension, actor, subject_id, source, created_at)
    VALUES (OLD.id, 'lifecycle_changed', OLD.status, NEW.status, 'lifecycle', legal_actor(), OLD.id, 'legal_matter_guard', now());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS legal_cases_guard ON legal_cases;
CREATE TRIGGER legal_cases_guard BEFORE UPDATE ON legal_cases FOR EACH ROW EXECUTE FUNCTION legal_matter_guard();

CREATE OR REPLACE FUNCTION legal_award_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.revision IS DISTINCT FROM OLD.revision THEN
    RAISE EXCEPTION 'legal: stale revision (read %, current %)', NEW.revision, OLD.revision USING ERRCODE = '40001';
  END IF;
  NEW.revision := OLD.revision + 1;
  IF NEW.judgment_verification IS DISTINCT FROM OLD.judgment_verification THEN
    INSERT INTO legal_case_events (legal_case_id, event_type, from_status, to_status, dimension, actor, subject_id, source, created_at)
    VALUES (OLD.matter_id, 'judgment_verification_changed', OLD.judgment_verification, NEW.judgment_verification,
            'judgment_verification', legal_actor(), OLD.id, 'legal_award_guard', now());
  END IF;
  IF NEW.collection_readiness IS DISTINCT FROM OLD.collection_readiness THEN
    INSERT INTO legal_case_events (legal_case_id, event_type, from_status, to_status, dimension, actor, subject_id, source, created_at)
    VALUES (OLD.matter_id, 'collection_readiness_changed', OLD.collection_readiness, NEW.collection_readiness,
            'collection_readiness', legal_actor(), OLD.id, 'legal_award_guard', now());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS legal_awards_guard ON legal_awards;
CREATE TRIGGER legal_awards_guard BEFORE UPDATE ON legal_awards FOR EACH ROW EXECUTE FUNCTION legal_award_guard();

-- 6. Grants: remove anon/authenticated/PUBLIC DML; runtime gets the minimum.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['legal_cases','legal_case_events','case_history','case_tags','legal_parties',
    'legal_matter_properties','legal_awards','legal_award_obligors','legal_evidence_requirements',
    'legal_evidence_refs','legal_source_links'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon', t); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated', t); END IF;
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
GRANT SELECT, INSERT, UPDATE ON legal_cases, legal_parties, legal_matter_properties, legal_awards,
  legal_evidence_requirements, legal_evidence_refs, legal_source_links TO ecc_legal_runtime;
GRANT SELECT, INSERT ON legal_award_obligors, legal_case_events TO ecc_legal_runtime;   -- no UPDATE/DELETE on the journal
GRANT SELECT ON case_history, case_tags TO ecc_legal_runtime;                             -- legacy: read-only

-- 7. RLS policies (fail closed: no context => no rows).
CREATE POLICY legal_cases_rt ON legal_cases FOR ALL TO ecc_legal_runtime
  USING (legal_scope_ok(scope_ref)) WITH CHECK (legal_scope_ok(scope_ref));
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['legal_parties','legal_matter_properties','legal_awards','legal_evidence_requirements',
    'legal_source_links','legal_case_events'] LOOP
    EXECUTE format($f$CREATE POLICY %I ON %I FOR ALL TO ecc_legal_runtime
      USING (EXISTS (SELECT 1 FROM legal_cases m WHERE m.id = %I AND legal_scope_ok(m.scope_ref)))
      WITH CHECK (EXISTS (SELECT 1 FROM legal_cases m WHERE m.id = %I AND legal_scope_ok(m.scope_ref)))$f$,
      t||'_rt', t, CASE WHEN t IN ('legal_awards','legal_parties','legal_matter_properties','legal_evidence_requirements','legal_source_links') THEN 'matter_id' ELSE 'legal_case_id' END,
      CASE WHEN t IN ('legal_awards','legal_parties','legal_matter_properties','legal_evidence_requirements','legal_source_links') THEN 'matter_id' ELSE 'legal_case_id' END);
  END LOOP;
END $$;
CREATE POLICY legal_evidence_refs_rt ON legal_evidence_refs FOR ALL TO ecc_legal_runtime
  USING (EXISTS (SELECT 1 FROM legal_cases m WHERE m.id = matter_id AND legal_scope_ok(m.scope_ref))
         AND (NOT restricted OR current_setting('ecc.restricted_evidence', true) = 'on'))
  WITH CHECK (EXISTS (SELECT 1 FROM legal_cases m WHERE m.id = matter_id AND legal_scope_ok(m.scope_ref)));
CREATE POLICY legal_award_obligors_rt ON legal_award_obligors FOR ALL TO ecc_legal_runtime
  USING (EXISTS (SELECT 1 FROM legal_awards a JOIN legal_cases m ON m.id = a.matter_id
                 WHERE a.id = award_id AND legal_scope_ok(m.scope_ref)))
  WITH CHECK (EXISTS (SELECT 1 FROM legal_awards a JOIN legal_cases m ON m.id = a.matter_id
                 WHERE a.id = award_id AND legal_scope_ok(m.scope_ref)));
-- case_history / case_tags: RLS on with no runtime policy => legacy rows stay unreadable until reviewed.

-- 8. Sanctioned aggregate: sums awards only (obligors carry no amounts, so no multiplication).
CREATE OR REPLACE VIEW legal_matter_award_totals WITH (security_invoker = true) AS
SELECT matter_id, currency,
       sum(amount_cents) FILTER (WHERE amount_cents IS NOT NULL) AS known_cents,
       count(*) FILTER (WHERE amount_cents IS NULL) AS unknown_count,
       count(*) AS award_count
FROM legal_awards GROUP BY matter_id, currency;
GRANT SELECT ON legal_matter_award_totals TO ecc_legal_runtime;

COMMIT;
