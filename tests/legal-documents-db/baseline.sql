-- LABELLED RECONSTRUCTION (synthetic; no real rows) of ONE database that both component baselines describe.
-- Evidence classes (docs/database/DATABASE_ARCHITECTURE.md): the two component baselines were observed on different days:
--   2026-11-10 (L1): legal_cases uuid PK; FKs to properties/units/tenants/leases target `id_uuid`; two overlapping case_type CHECKs;
--                    global UNIQUE NOT NULL case_number; events/history/tags without FKs; anon/authenticated DML grants.
--   2026-11-11 (D1): owners.id integer PK; properties.id bigint PK; property_owners PK (property_id, owner_id) with FKs;
--                    legacy file tables with their observed grants/policy.
-- RECONCILIATION (the only reading that satisfies BOTH verified observations; it infers nothing between the two key families):
--   properties carries a native bigint key `id` (PK, D1 anchor) AND a separate uuid key `id_uuid` (UNIQUE, L1 FK target).
--   The two component reconstructions disagree about which key is the PK (L1 file: id_uuid PK + serial id; D1 file: id bigint PK).
--   Whether id_uuid is PK or UNIQUE, and whether any `id`<->`id_uuid` pairing is authoritative, is NOT established by the
--   observations; this file chooses the weaker reading (UNIQUE, no pairing semantics) and the tests below never rely on a pairing.
-- Open (UNVERIFIED against the live catalog in this rehearsal): exact live type/PK of properties.id and id_uuid, units/tenants/leases keys.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;

-- native numeric identity family (D1 anchors)
CREATE TABLE owners (id integer PRIMARY KEY, name text);
CREATE TABLE properties (id bigint PRIMARY KEY, name text, owner_id bigint, id_uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid());
CREATE TABLE property_owners (property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE, owner_id bigint NOT NULL REFERENCES owners(id),
  ownership_percentage numeric, PRIMARY KEY (property_id, owner_id));
-- legacy uuid identity family (L1 FK targets)
CREATE TABLE units (id serial, id_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE tenants (id serial, id_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE leases (id serial, id_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid());

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

-- synthetic rows. TRAP: numeric 42 pairs with a uuid ending ...0043 and numeric 43 with ...0042, so any suffix/ordinal
-- "equivalence" between the two key families would silently point at the WRONG property.
INSERT INTO owners VALUES (17,'Synthetic Owner A'),(18,'Synthetic Owner B');
INSERT INTO properties (id, name, id_uuid) VALUES
  (42,'Synthetic Property 1','00000000-0000-4000-8000-000000000043'),
  (43,'Synthetic Property 2','00000000-0000-4000-8000-000000000042'),
  (44,'Synthetic Property 3','00000000-0000-4000-8000-000000000044');
INSERT INTO property_owners VALUES (42,17,100),(43,17,100),(44,18,100);
INSERT INTO units DEFAULT VALUES; INSERT INTO tenants DEFAULT VALUES; INSERT INTO leases DEFAULT VALUES;
INSERT INTO files (doorloop_id, name, download_url) SELECT 'synthetic-' || g, 'legacy ' || g, NULL FROM generate_series(1,50) g;
INSERT INTO files_new (related_type, related_id, filename) VALUES ('property', 42, 'legacy-a.pdf'), ('property', 43, 'legacy-b.pdf');
INSERT INTO legacy_staging (resolved_tenant_id, payload) SELECT g, jsonb_build_object('n', g) FROM generate_series(1,216) g;
INSERT INTO legal_cases (id, case_number, case_type, status, property_id) VALUES
  ('00000000-0000-4000-8000-0000000c0001','SYN-1','eviction','filed','00000000-0000-4000-8000-000000000042'),
  ('00000000-0000-4000-8000-0000000c0002','SYN-1b','damages','draft',NULL);
INSERT INTO legal_case_events (legal_case_id, event_type, from_status, to_status) VALUES ('00000000-0000-4000-8000-0000000c0001','status_changed','draft','filed');
INSERT INTO case_history (legal_case_id, change_type) VALUES ('00000000-0000-4000-8000-0000000c0001','legacy_edit');
INSERT INTO case_tags (legal_case_id, tag) VALUES ('00000000-0000-4000-8000-0000000c0001','synthetic');
