-- Look-alike relations and functions that 003 apply/rollback and the two commands must NEVER touch or consult. Variable: -v kind=schema|temp
-- kind=schema: schema `shadow`, placed FIRST in search_path. kind=temp: TEMP relations (always searched first). Populated on purpose.
\set ON_ERROR_STOP on
SELECT :'kind' = 'schema' AS is_schema \gset
\if :is_schema
\set tempkw ''
CREATE SCHEMA IF NOT EXISTS shadow;
SET search_path = shadow, public, pg_catalog;
\else
\set tempkw TEMP
\endif
CREATE :tempkw TABLE document_versions (id uuid PRIMARY KEY);
CREATE :tempkw TABLE legal_cases (id uuid PRIMARY KEY);
CREATE :tempkw TABLE legal_evidence_refs (id uuid PRIMARY KEY, matter_id uuid, requirement_id uuid, revision integer NOT NULL DEFAULT 1);
CREATE :tempkw TABLE legal_case_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), legal_case_id uuid, event_type text, dimension text, subject_id uuid);
INSERT INTO document_versions VALUES ('00000000-0000-4000-8000-0000000a0001');
INSERT INTO legal_evidence_refs (id, matter_id) VALUES ('00000000-0000-4000-8000-0000000a0002','00000000-0000-4000-8000-0000000a0003');
INSERT INTO legal_case_events (legal_case_id, event_type, dimension) VALUES ('00000000-0000-4000-8000-0000000a0003','x','evidence_confidence');
\if :is_schema
-- test fixture only: without USAGE a role silently skips the schema, so the look-alike would not be hostile to the runtime role
GRANT USAGE ON SCHEMA shadow TO PUBLIC;
-- a look-alike actor function that would ACCEPT a caller with no actor if the commands resolved it through search_path
CREATE FUNCTION shadow.legal_actor() RETURNS text LANGUAGE sql AS $$ SELECT 'shadow-actor'::text $$;
\endif
