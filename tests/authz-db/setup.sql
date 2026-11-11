-- SYNTHETIC schema for the A1 seam proof. The policy mirrors the SHAPE of the PR #223 proposal (fail-closed filter on a trusted
-- transaction-local setting). It is not that proposal and applies nothing to any real database.
CREATE ROLE synthetic_runtime LOGIN NOBYPASSRLS;
CREATE TABLE synthetic_matters (id serial PRIMARY KEY, scope_ref text NOT NULL, label text NOT NULL);
INSERT INTO synthetic_matters (scope_ref, label) VALUES ('scope-a','a1'),('scope-a','a2'),('scope-b','b1'),('scope-c','c1');
CREATE FUNCTION synthetic_scope_ok(s text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT s IS NOT NULL AND s = ANY (string_to_array(coalesce(current_setting('ecc.scope_refs', true), ''), ',')) $$;
ALTER TABLE synthetic_matters ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON synthetic_matters TO synthetic_runtime;
CREATE POLICY rt ON synthetic_matters FOR SELECT TO synthetic_runtime USING (synthetic_scope_ok(scope_ref));

-- A1 v2 additions: restricted evidence, a second role (to detect an inherited SET ROLE) and a scratch table (to prove rollback).
CREATE ROLE synthetic_other NOLOGIN;
GRANT synthetic_other TO synthetic_runtime;
CREATE TABLE synthetic_evidence (id serial PRIMARY KEY, scope_ref text NOT NULL, restricted boolean NOT NULL, label text NOT NULL);
INSERT INTO synthetic_evidence (scope_ref, restricted, label) VALUES ('scope-a', false, 'open-a'), ('scope-a', true, 'restricted-a'), ('scope-b', false, 'open-b');
ALTER TABLE synthetic_evidence ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON synthetic_evidence TO synthetic_runtime;
CREATE POLICY rt ON synthetic_evidence FOR SELECT TO synthetic_runtime
  USING (synthetic_scope_ok(scope_ref) AND (NOT restricted OR current_setting('ecc.restricted_evidence', true) = 'on'));
CREATE TABLE synthetic_scratch (x text);
GRANT SELECT, INSERT ON synthetic_scratch TO synthetic_runtime;
