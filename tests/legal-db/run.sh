#!/usr/bin/env bash
# Isolated local PostgreSQL proof for docs/legal/schema/*.proposal.sql. Private temp cluster; never touches a real database.
set -euo pipefail
# Never inherit connection settings (PGHOST/PGHOSTADDR/PGSERVICE/PGPASSFILE/...): everything must use the private socket.
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done
here="$(cd "$(dirname "$0")" && pwd)"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[legal-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$here"/*.sql "$tmp"/
cp "$here/../../docs/legal/schema/001_native_legal_foundation.proposal.sql" "$tmp/proposal.sql"
cp "$here/../../docs/legal/schema/001_native_legal_foundation.rollback.proposal.sql" "$tmp/rollback_proposal.sql"
chmod 644 "$tmp"/*.sql
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
export PGOPTIONS=--client-min-messages=warning
psqlx() { local db="$1"; shift; as "$bin/psql" -h "$tmp" -d "$db" -X -q -t -A "$@"; }
psqlx postgres -c "CREATE DATABASE rb" >/dev/null
psqlx postgres -f "$tmp/baseline.sql" >/dev/null
psqlx rb -f "$tmp/baseline.sql" >/dev/null
# Roles are cluster-wide, so scenarios run one after another and each cleans the role up before the next.
rbout="$(psqlx rb -v proposal="$tmp/proposal.sql" -v rollback="$tmp/rollback_proposal.sql" -f "$tmp/rb_tests.sql" 2>&1 | grep -v "rollback refused\|^psql:.*ERROR:  rollback\|transaction is aborted\|no transaction in progress" || true)"; echo "$rbout"

# --- role-custody regressions (synthetic sentinels; ON_ERROR_STOP so a refusal must leave NO change) ---
sent_pass=0; sent_total=0
chk() { sent_total=$((sent_total+1)); if [ "$2" = "1" ]; then sent_pass=$((sent_pass+1)); else echo "SENTINEL FAIL: $1"; fi; }
cleanup_role() { for d in sp sr sg sx; do psqlx $d -c "DROP OWNED BY ecc_legal_runtime" >/dev/null 2>&1 || true; done; psqlx postgres -c "DROP ROLE IF EXISTS ecc_legal_runtime" >/dev/null 2>&1 || true; }
for d in sp sr sg sx; do psqlx postgres -c "CREATE DATABASE $d" >/dev/null; psqlx $d -f "$tmp/baseline.sql" >/dev/null 2>&1; done
# (1) proposal refuses a PREEXISTING role and changes nothing
psqlx sp -c "CREATE ROLE ecc_legal_runtime NOLOGIN; CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_legal_runtime; GRANT SELECT ON properties TO ecc_legal_runtime" >/dev/null
if psqlx sp -v ON_ERROR_STOP=1 -f "$tmp/proposal.sql" >/dev/null 2>&1; then chk "proposal must refuse preexisting role" 0; else chk "proposal refuses preexisting role" 1; fi
chk "refused proposal created no tables" "$(psqlx sp -c "select (not exists (select 1 from pg_tables where tablename='legal_parties'))::int")"
chk "refused proposal left sentinel table and its privilege" "$(psqlx sp -c "select (exists (select 1 from pg_tables where tablename='sentinel_owned' and tableowner='ecc_legal_runtime') and has_table_privilege('ecc_legal_runtime','properties','select'))::int")"
chk "refused proposal left legal_cases untouched" "$(psqlx sp -c "select (not exists (select 1 from information_schema.columns where table_name='legal_cases' and column_name='scope_ref'))::int")"
cleanup_role
# (2) rollback refuses when the role OWNS an unrelated object; nothing is dropped
psqlx sr -v ON_ERROR_STOP=1 -f "$tmp/proposal.sql" >/dev/null
psqlx sr -c "CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_legal_runtime" >/dev/null
if psqlx sr -v ON_ERROR_STOP=1 -f "$tmp/rollback_proposal.sql" >/dev/null 2>&1; then chk "rollback must refuse when role owns unrelated object" 0; else chk "rollback refuses when role owns unrelated object" 1; fi
chk "refused rollback changed nothing (tables, role, sentinel)" "$(psqlx sr -c "select (exists (select 1 from pg_tables where tablename='legal_parties') and exists (select 1 from pg_roles where rolname='ecc_legal_runtime') and exists (select 1 from pg_tables where tablename='sentinel_owned') and has_table_privilege('ecc_legal_runtime','legal_cases','select'))::int")"
cleanup_role
# (3) rollback refuses when the role holds an UNRELATED privilege; the privilege survives
psqlx sg -v ON_ERROR_STOP=1 -f "$tmp/proposal.sql" >/dev/null
psqlx sg -c "GRANT SELECT ON properties TO ecc_legal_runtime" >/dev/null
if psqlx sg -v ON_ERROR_STOP=1 -f "$tmp/rollback_proposal.sql" >/dev/null 2>&1; then chk "rollback must refuse on unrelated privilege" 0; else chk "rollback refuses on unrelated privilege" 1; fi
chk "refused rollback kept unrelated privilege and legal tables" "$(psqlx sg -c "select (has_table_privilege('ecc_legal_runtime','properties','select') and exists (select 1 from pg_tables where tablename='legal_awards') and exists (select 1 from pg_roles where rolname='ecc_legal_runtime'))::int")"
cleanup_role
# (4) no data loss under a concurrent writer (defence in depth: DROP TABLE would also block on the open insert; the LOCK-before-count ordering itself is asserted statically in tests/unit/legal/schema-proposal.test.ts)
psqlx sx -v ON_ERROR_STOP=1 -f "$tmp/proposal.sql" >/dev/null
psqlx sx -c "INSERT INTO legal_cases(id,case_type,status,scope_ref) VALUES ('00000000-0000-0000-0000-0000000000aa','other','draft','s')" >/dev/null
( psqlx sx -c "BEGIN; INSERT INTO legal_parties(matter_id,role,display_name) VALUES ('00000000-0000-0000-0000-0000000000aa','other','racer'); SELECT pg_sleep(4); COMMIT;" >/dev/null 2>&1 ) &
sleep 1
if PGOPTIONS="--client-min-messages=warning -c lock_timeout=1000" psqlx sx -v ON_ERROR_STOP=1 -f "$tmp/rollback_proposal.sql" >/dev/null 2>&1; then chk "rollback must not proceed past a concurrent writer" 0; else chk "rollback does not proceed past a concurrent writer" 1; fi
wait
chk "racing row committed and was NOT dropped" "$(psqlx sx -c "select (exists (select 1 from legal_parties where display_name='racer'))::int")"
cleanup_role
chk "sentinel cleanup left no role behind" "$(psqlx postgres -c "select (not exists (select 1 from pg_roles where rolname='ecc_legal_runtime'))::int")"

out="$(psqlx postgres -v proposal="$tmp/proposal.sql" -f "$tmp/tests.sql" 2>&1)"; echo "$out"
a="$(echo "$out" | tail -1)"; b="$(echo "$rbout" | tail -1)"
echo "$a $b $sent_pass|$sent_total" | awk -F'[| ]' '{ if ($1==$2 && $2>0 && $3==$4 && $4>0 && $5==$6 && $6>0) { print "[legal-db] PASS main " $1 "/" $2 ", rollback " $3 "/" $4 ", role custody " $5 "/" $6; exit 0 } else { print "[legal-db] FAIL"; exit 1 } }'
