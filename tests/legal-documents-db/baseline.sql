-- LABELLED RECONSTRUCTION (synthetic; no real rows) of ONE database that both component baselines describe.
-- Evidence classes used throughout this rehearsal:
--   CATALOG-VERIFIED metadata: read-only catalog inspection by Codex, relayed in task ECC-COMBINED-DB-v2 (2026-11-14). This file was NOT
--     checked against the live catalog by the rehearsal itself. Verified facts:
--       properties.id, units.id, leases.id           bigint PRIMARY KEY
--       owners.id, tenants.id                        integer PRIMARY KEY
--       id_uuid on all five (owners, properties, units, tenants, leases): uuid NOT NULL with a STANDALONE UNIQUE index (not a primary key)
--       property_owners.property_id, owner_id        both bigint; PRIMARY KEY (property_id, owner_id)
--       legal_cases.id uuid PRIMARY KEY; its property/unit/tenant/lease uuid references target id_uuid with ON DELETE SET NULL
--   Earlier read-only observations (2026-11-10 L1, 2026-11-11 D1): two overlapping legal_cases case_type CHECKs, global UNIQUE NOT NULL case_number,
--     events/history/tags without FKs, anon/authenticated DML grants; legacy file tables, grants and the permissive files_new policy.
--   RECONSTRUCTED (not verified): column defaults, identity/sequence behaviour, every column not listed above, and all synthetic rows.
--     No default is declared on any key column, so the suite always supplies keys explicitly instead of relying on an unverified default.
--   INSTALLED behaviour: none. Nothing was applied anywhere.
-- This file supersedes the earlier reconstruction in this PR, which wrongly modelled units/tenants/leases as `id serial` with id_uuid as PRIMARY KEY,
-- owners without id_uuid, and the id_uuid columns as a UNIQUE constraint.
-- The two key families are NEVER equated: no pairing between `id` and `id_uuid` is assumed by any test or proposal.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;

-- native numeric identity family (D1 anchors) and the separate legacy uuid key on the same rows (L1 FK targets)
CREATE TABLE owners (id integer PRIMARY KEY, name text, id_uuid uuid NOT NULL);
CREATE TABLE properties (id bigint PRIMARY KEY, name text, owner_id bigint, id_uuid uuid NOT NULL);
CREATE TABLE units (id bigint PRIMARY KEY, id_uuid uuid NOT NULL);
CREATE TABLE tenants (id integer PRIMARY KEY, id_uuid uuid NOT NULL);
CREATE TABLE leases (id bigint PRIMARY KEY, id_uuid uuid NOT NULL);
CREATE UNIQUE INDEX owners_id_uuid_key ON owners (id_uuid);          -- standalone unique indexes, not constraints and not primary keys
CREATE UNIQUE INDEX properties_id_uuid_key ON properties (id_uuid);
CREATE UNIQUE INDEX units_id_uuid_key ON units (id_uuid);
CREATE UNIQUE INDEX tenants_id_uuid_key ON tenants (id_uuid);
CREATE UNIQUE INDEX leases_id_uuid_key ON leases (id_uuid);
CREATE TABLE property_owners (property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE, owner_id bigint NOT NULL REFERENCES owners(id),
  ownership_percentage numeric, PRIMARY KEY (property_id, owner_id));

CREATE TABLE legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_number text NOT NULL UNIQUE, case_type text NOT NULL, status text NOT NULL,
  property_id uuid REFERENCES properties(id_uuid) ON DELETE SET NULL, unit_id uuid REFERENCES units(id_uuid) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id_uuid) ON DELETE SET NULL, lease_id uuid REFERENCES leases(id_uuid) ON DELETE SET NULL,
  court_name text, balance_at_filing_cents bigint, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), last_state_changed_at timestamptz NOT NULL DEFAULT now(),
  collection_status text NOT NULL DEFAULT 'none',
  CONSTRAINT legal_cases_case_type_check CHECK (case_type IN ('eviction','damages','quiet_title','foreclosure','other')),
  CONSTRAINT legal_cases_case_type_chk CHECK (case_type IN ('eviction','damages','eviction_and_damages','collections','quiet_title','foreclosure','other')),
  CONSTRAINT legal_cases_status_check CHECK (status IN ('draft','pre_filing','filed','pending_hearing','judgment_entered','closed','dismissed')));
CREATE TABLE legal_case_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_case_id uuid NOT NULL, event_type text NOT NULL,
  from_status text, to_status text, metadata jsonb, created_at timestamptz NOT NULL DEFAULT now(), created_by uuid, request_id uuid);
CREATE TABLE case_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_case_id uuid, change_type text NOT NULL, changed_by text, change_details jsonb, created_at timestamptz DEFAULT now());
CREATE TABLE case_tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_case_id uuid, tag text NOT NULL, created_at timestamptz DEFAULT now());
GRANT ALL ON legal_cases, legal_case_events, case_history, case_tags TO anon, authenticated;   -- as observed
CREATE TABLE legacy_staging (id serial PRIMARY KEY, resolved_tenant_id integer, payload jsonb);

-- legacy file tables the D1 proposal must NOT touch (observed grants/policy)
CREATE TABLE files_new (id bigserial PRIMARY KEY, related_type text NOT NULL, related_id bigint NOT NULL, filename text NOT NULL, dropbox_path text, sha256 text);
CREATE TABLE files (id serial PRIMARY KEY, doorloop_id varchar NOT NULL UNIQUE, name text, download_url text);
ALTER TABLE files_new ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_select_authenticated_files ON files_new FOR SELECT TO authenticated USING (true);
GRANT ALL ON files_new, files TO anon, authenticated;

-- synthetic rows. TRAP: in every table the numeric and uuid keys are deliberately crossed (e.g. property 42 holds uuid ...0043, 43 holds ...0042;
-- unit 5001 holds ...0002, 5002 holds ...0001), so any suffix/ordinal "equivalence" between the two key families would point at the WRONG row.
INSERT INTO owners (id, name, id_uuid) VALUES (17,'Synthetic Owner A','00000000-0000-4000-8000-0000000a0018'),(18,'Synthetic Owner B','00000000-0000-4000-8000-0000000a0017');
INSERT INTO properties (id, name, id_uuid) VALUES
  (42,'Synthetic Property 1','00000000-0000-4000-8000-000000000043'),
  (43,'Synthetic Property 2','00000000-0000-4000-8000-000000000042'),
  (44,'Synthetic Property 3','00000000-0000-4000-8000-000000000048');
INSERT INTO property_owners VALUES (42,17,100),(43,17,100),(44,18,100);
INSERT INTO units (id, id_uuid) VALUES (5001,'00000000-0000-4000-8000-0000000b0002'),(5002,'00000000-0000-4000-8000-0000000b0001');
INSERT INTO tenants (id, id_uuid) VALUES (3001,'00000000-0000-4000-8000-0000000c1002'),(3002,'00000000-0000-4000-8000-0000000c1001');
INSERT INTO leases (id, id_uuid) VALUES (7001,'00000000-0000-4000-8000-0000000d0002'),(7002,'00000000-0000-4000-8000-0000000d0001');
INSERT INTO files (doorloop_id, name, download_url) SELECT 'synthetic-' || g, 'legacy ' || g, NULL FROM generate_series(1,50) g;
INSERT INTO files_new (related_type, related_id, filename) VALUES ('property', 42, 'legacy-a.pdf'), ('property', 43, 'legacy-b.pdf');
INSERT INTO legacy_staging (resolved_tenant_id, payload) SELECT g, jsonb_build_object('n', g) FROM generate_series(1,216) g;
INSERT INTO legal_cases (id, case_number, case_type, status, property_id) VALUES
  ('00000000-0000-4000-8000-0000000c0001','SYN-1','eviction','filed','00000000-0000-4000-8000-000000000042'),
  ('00000000-0000-4000-8000-0000000c0002','SYN-1b','damages','draft',NULL);
INSERT INTO legal_case_events (legal_case_id, event_type, from_status, to_status) VALUES ('00000000-0000-4000-8000-0000000c0001','status_changed','draft','filed');
INSERT INTO case_history (legal_case_id, change_type) VALUES ('00000000-0000-4000-8000-0000000c0001','legacy_edit');
INSERT INTO case_tags (legal_case_id, tag) VALUES ('00000000-0000-4000-8000-0000000c0001','synthetic');
