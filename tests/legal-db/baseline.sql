-- LABELLED RECONSTRUCTION of the pre-change shape observed read-only on 2026-11-10 (synthetic; no real data).
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
CREATE TABLE properties (id serial, id_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid());
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
INSERT INTO legacy_staging (resolved_tenant_id, payload) SELECT g, jsonb_build_object('n', g) FROM generate_series(1,216) g;
INSERT INTO legal_cases (case_number, case_type, status) VALUES ('SYN-1','eviction','filed'),('SYN-1b','damages','draft');
