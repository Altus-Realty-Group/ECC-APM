-- LABELLED RECONSTRUCTION (synthetic, no real data) of the key shapes read-only inspected on 2026-11-11:
-- owners.id integer PK; properties.id bigint PK; property_owners PK (property_id, owner_id) with FKs; legacy file tables with their observed grants.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE TABLE owners (id integer PRIMARY KEY, name text);
CREATE TABLE properties (id bigint PRIMARY KEY, name text, owner_id bigint);
CREATE TABLE property_owners (property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE, owner_id bigint NOT NULL REFERENCES owners(id), ownership_percentage numeric, PRIMARY KEY (property_id, owner_id));
INSERT INTO owners VALUES (17,'Synthetic Owner A'),(18,'Synthetic Owner B');
INSERT INTO properties VALUES (42,'Synthetic Property 1',NULL),(43,'Synthetic Property 2',NULL),(44,'Synthetic Property 3',NULL);
INSERT INTO property_owners VALUES (42,17,100),(43,17,100),(44,18,100);
-- legacy candidates the proposal must NOT touch
CREATE TABLE files_new (id bigserial PRIMARY KEY, related_type text NOT NULL, related_id bigint NOT NULL, filename text NOT NULL, dropbox_path text, sha256 text);
CREATE TABLE files (id serial PRIMARY KEY, doorloop_id varchar NOT NULL UNIQUE, name text, download_url text);
INSERT INTO files (doorloop_id, name, download_url) SELECT 'synthetic-' || g, 'legacy ' || g, NULL FROM generate_series(1,50) g;
ALTER TABLE files_new ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_select_authenticated_files ON files_new FOR SELECT TO authenticated USING (true);
GRANT ALL ON files_new, files TO anon, authenticated;
