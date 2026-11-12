-- PROPOSAL ONLY (ECC-D1-CLAUDE-v1). NOT APPLIED to any database. Additive document registry; see docs/documents/adr/ADR-0003-*.md.
-- Anchored to metadata read 2026-11-11: owners.id integer PK; properties.id bigint PK; property_owners PK (property_id, owner_id) with FKs.
-- Legacy tables (files, files_new, file_assets, file_sync_audit, work_order_files, doorloop_raw_files) are NOT touched.
-- Non-blank checks use `x ~ '[^[:space:]]'` (btrim only strips spaces, so a tab/newline-only value would pass; the TypeScript planner rejects it).
-- Run with ON_ERROR_STOP so a failure leaves no partial change. One-time apply (it refuses a pre-existing runtime role).
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ecc_documents_runtime') THEN
    RAISE EXCEPTION 'ecc_documents_runtime already exists; refusing to adopt a preexisting role (no changes made)';
  END IF;
  CREATE ROLE ecc_documents_runtime NOLOGIN NOBYPASSRLS;
END $$;

-- 1. Identity. One home (an owner OR a property); classification is explicit and fixed at creation.
CREATE TABLE document_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),                       -- opaque; matches the UI identifier rule [A-Za-z0-9_-]{1,128}
  name text NOT NULL CHECK (name ~ '[^[:space:]]' AND length(name) <= 255 AND name !~ '[\\/[:cntrl:]]'),
  section text NOT NULL CHECK (section IN ('management-contracts','entity-records','financial-tax','statements-reports','correspondence',
                                           'tenant-documents','property-media','construction','legal','insurance')),
  classification text NOT NULL CHECK (classification IN ('general','confidential','restricted','financial_tax')),   -- no default on purpose
  home_kind text NOT NULL CHECK (home_kind IN ('owner','property')),
  home_owner_id integer REFERENCES owners(id) ON DELETE RESTRICT,
  home_property_id bigint REFERENCES properties(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL CHECK (created_by ~ '[^[:space:]]'),
  retired_at timestamptz,
  CHECK ((home_kind = 'owner' AND home_owner_id IS NOT NULL AND home_property_id IS NULL)
      OR (home_kind = 'property' AND home_property_id IS NOT NULL AND home_owner_id IS NULL)),
  CHECK ((home_kind = 'owner' AND section IN ('management-contracts','entity-records','financial-tax','statements-reports','correspondence'))
      OR (home_kind = 'property' AND section IN ('tenant-documents','property-media','construction','legal','insurance'))),
  CHECK ((status = 'retired') = (retired_at IS NOT NULL)),
  -- MINIMUM CLASSIFICATION RULE (mirrors shared/documents/model.ts requiredClassifications): the financial-tax section holds financial/tax
  -- material, so a record there is declared financial_tax or restricted (both default-deny). It can never be general/confidential, so no
  -- document is implicitly readable merely because it was filed in that section as 'general'.
  CHECK (section <> 'financial-tax' OR classification IN ('financial_tax','restricted')),
  UNIQUE (id, home_owner_id)                                           -- anchor for link rows (owner-home documents only)
);

-- 2. An owner-home document (e.g. a management agreement) covers several properties of THAT owner, stored once.
CREATE TABLE document_property_links (
  document_id uuid NOT NULL,
  owner_id integer NOT NULL,
  property_id bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL CHECK (created_by ~ '[^[:space:]]'),
  PRIMARY KEY (document_id, property_id),
  FOREIGN KEY (document_id, owner_id) REFERENCES document_records (id, home_owner_id) ON DELETE RESTRICT,   -- the link's owner IS the home owner
  FOREIGN KEY (property_id, owner_id) REFERENCES property_owners (property_id, owner_id) ON DELETE RESTRICT -- and really owns the property
);

-- 3. Immutable versions. A new revision is a new row; rows are never edited or deleted.
CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES document_records (id) ON DELETE RESTRICT,
  version_number integer NOT NULL CHECK (version_number >= 1),
  byte_size bigint NOT NULL CHECK (byte_size >= 0 AND byte_size <= 9007199254740991),          -- exactly representable in JS
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  media_type text NOT NULL CHECK (media_type ~* '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$'),
  provider text NOT NULL CHECK (provider ~ '[^[:space:]]'),
  provider_object_ref text NOT NULL CHECK (provider_object_ref ~ '[^[:space:]]'),                  -- opaque provider identity; never a path or URL
  provider_revision text NOT NULL CHECK (provider_revision ~ '[^[:space:]]'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL CHECK (created_by ~ '[^[:space:]]'),
  UNIQUE (document_id, version_number),
  UNIQUE (provider, provider_object_ref, provider_revision),                                   -- one provider revision, one registered version
  UNIQUE (id, sha256, byte_size)                                                               -- anchor for verified receipts
);

-- 4. Append-only delivery receipts. `verified` carries the observed digest and size and must equal the registered version's.
CREATE TABLE document_deliveries (
  seq bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  version_id uuid NOT NULL REFERENCES document_versions (id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('verified','pending','failed','reconciliation')),
  provider_receipt_ref text CHECK (provider_receipt_ref IS NULL OR provider_receipt_ref ~ '[^[:space:]]'),
  verified_sha256 text CHECK (verified_sha256 IS NULL OR verified_sha256 ~ '^[0-9a-f]{64}$'),
  verified_byte_size bigint CHECK (verified_byte_size IS NULL OR verified_byte_size >= 0),
  note text CHECK (note IS NULL OR length(note) <= 500),                                       -- content-free operational detail only
  observed_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text NOT NULL CHECK (recorded_by ~ '[^[:space:]]'),
  CHECK ((status = 'verified') = (verified_sha256 IS NOT NULL AND verified_byte_size IS NOT NULL)),
  CHECK (status = 'verified' OR (verified_sha256 IS NULL AND verified_byte_size IS NULL)),
  FOREIGN KEY (version_id, verified_sha256, verified_byte_size) REFERENCES document_versions (id, sha256, byte_size)   -- verified == registered
);
CREATE UNIQUE INDEX document_deliveries_receipt_uq ON document_deliveries (version_id, provider_receipt_ref) WHERE provider_receipt_ref IS NOT NULL;

-- 5. Integrity triggers.
CREATE FUNCTION document_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '42501'; END $$;
CREATE TRIGGER document_versions_immutable BEFORE UPDATE OR DELETE ON document_versions FOR EACH ROW EXECUTE FUNCTION document_append_only();
CREATE TRIGGER document_deliveries_immutable BEFORE UPDATE OR DELETE ON document_deliveries FOR EACH ROW EXECUTE FUNCTION document_append_only();
CREATE TRIGGER document_links_immutable BEFORE UPDATE ON document_property_links FOR EACH ROW EXECUTE FUNCTION document_append_only();

-- A record never changes identity, home, section, name or classification; it can only be retired (once).
CREATE FUNCTION document_record_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'document_records rows are never deleted' USING ERRCODE = '42501'; END IF;
  IF (NEW.id, NEW.name, NEW.section, NEW.classification, NEW.home_kind, NEW.home_owner_id, NEW.home_property_id, NEW.created_at, NEW.created_by)
     IS DISTINCT FROM (OLD.id, OLD.name, OLD.section, OLD.classification, OLD.home_kind, OLD.home_owner_id, OLD.home_property_id, OLD.created_at, OLD.created_by)
     OR OLD.status = 'retired' THEN
    RAISE EXCEPTION 'document_records are immutable except one-way retirement' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER document_records_guard BEFORE UPDATE OR DELETE ON document_records FOR EACH ROW EXECUTE FUNCTION document_record_guard();

-- Version numbers are contiguous per document (no gaps) and only active documents take new versions. The parent row lock serializes writers.
CREATE FUNCTION document_version_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE doc_status text; top integer;
BEGIN
  SELECT status INTO doc_status FROM document_records WHERE id = NEW.document_id FOR UPDATE;
  IF doc_status IS DISTINCT FROM 'active' THEN RAISE EXCEPTION 'versions can only be added to an active document' USING ERRCODE = '23514'; END IF;
  SELECT coalesce(max(version_number), 0) INTO top FROM document_versions WHERE document_id = NEW.document_id;
  IF NEW.version_number <> top + 1 THEN RAISE EXCEPTION 'version_number must be % (contiguous)', top + 1 USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER document_versions_guard BEFORE INSERT ON document_versions FOR EACH ROW EXECUTE FUNCTION document_version_guard();

-- 6. Read helpers for the future store binding. security_invoker keeps the caller's own row-level security in force.
CREATE VIEW document_current_versions WITH (security_invoker = true) AS
  SELECT DISTINCT ON (document_id) * FROM document_versions ORDER BY document_id, version_number DESC;
CREATE VIEW document_latest_deliveries WITH (security_invoker = true) AS
  SELECT DISTINCT ON (version_id) * FROM document_deliveries ORDER BY version_id, seq DESC;

-- 7. Default-deny posture: RLS on, NO policy, no anon/authenticated/PUBLIC access, read-only runtime role.
--    Scope policies are an ACTIVATION GATE: they need the accepted owner/property -> scope_ref mapping (A1), which does not exist yet.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['document_records','document_property_links','document_versions','document_deliveries'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon', t); END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated', t); END IF;
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT ON %I TO ecc_documents_runtime', t);
  END LOOP;
END $$;
GRANT SELECT ON document_current_versions, document_latest_deliveries TO ecc_documents_runtime;

COMMIT;
