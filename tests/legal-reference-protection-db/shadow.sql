-- Look-alike relations that must NEVER be touched by 002 apply/rollback (schema targeting proof). Variable: -v kind=schema|temp
-- kind=schema: schema `shadow` (put it first in search_path to shadow public). kind=temp: TEMP relations (always searched first unless qualified).
-- Same relation names, same FK constraint names/actions as the verified public objects, so an unqualified ALTER/LOCK/REFERENCES/count would hit them.
\set ON_ERROR_STOP on
SELECT :'kind' = 'schema' AS is_schema \gset
\if :is_schema
\set tempkw ''
CREATE SCHEMA IF NOT EXISTS shadow;
SET search_path = shadow, public, pg_catalog;
\else
\set tempkw TEMP
\endif
CREATE :tempkw TABLE properties (id bigint PRIMARY KEY, id_uuid uuid NOT NULL UNIQUE);
CREATE :tempkw TABLE units      (id bigint PRIMARY KEY, id_uuid uuid NOT NULL UNIQUE);
CREATE :tempkw TABLE tenants    (id bigint PRIMARY KEY, id_uuid uuid NOT NULL UNIQUE);
CREATE :tempkw TABLE leases     (id bigint PRIMARY KEY, id_uuid uuid NOT NULL UNIQUE);
CREATE :tempkw TABLE legal_cases (id uuid PRIMARY KEY, property_id uuid, unit_id uuid, tenant_id uuid, lease_id uuid, revision integer NOT NULL DEFAULT 1);
CREATE :tempkw TABLE legal_matter_properties (id uuid PRIMARY KEY, matter_id uuid, property_id uuid NOT NULL, unit_id uuid, lease_id uuid);
ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id_uuid) ON DELETE SET NULL;
ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_unit_id_fkey     FOREIGN KEY (unit_id)     REFERENCES units(id_uuid)      ON DELETE SET NULL;
ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_tenant_id_fkey   FOREIGN KEY (tenant_id)   REFERENCES tenants(id_uuid)    ON DELETE SET NULL;
ALTER TABLE legal_cases ADD CONSTRAINT legal_cases_lease_id_fkey    FOREIGN KEY (lease_id)    REFERENCES leases(id_uuid)     ON DELETE SET NULL;
ALTER TABLE legal_matter_properties ADD CONSTRAINT legal_matter_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id_uuid) ON DELETE RESTRICT;
ALTER TABLE legal_matter_properties ADD CONSTRAINT legal_matter_properties_unit_id_fkey  FOREIGN KEY (unit_id)  REFERENCES units(id_uuid)  ON DELETE SET NULL;
ALTER TABLE legal_matter_properties ADD CONSTRAINT legal_matter_properties_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id_uuid) ON DELETE SET NULL;
