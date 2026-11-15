#!/usr/bin/env bash
# Isolated local PostgreSQL proof for docs/documents/schema/*.proposal.sql. Private temp cluster; never touches a real database.
set -euo pipefail
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done
here="$(cd "$(dirname "$0")" && pwd)"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[documents-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$here"/*.sql "$tmp"/
cp "$here/../../docs/documents/schema/001_document_registry.proposal.sql" "$tmp/proposal.sql"
cp "$here/../../docs/documents/schema/001_document_registry.rollback.proposal.sql" "$tmp/rollback_proposal.sql"
chmod 644 "$tmp"/*.sql
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
export PGOPTIONS=--client-min-messages=warning
psqlx() { local db="$1"; shift; as "$bin/psql" -h "$tmp" -d "$db" -X -q -t -A "$@"; }
for d in rb sp main; do psqlx postgres -c "CREATE DATABASE $d" >/dev/null; psqlx $d -f "$tmp/baseline.sql" >/dev/null; done
cleanup_role() { for d in rb sp main; do psqlx $d -c "DROP OWNED BY ecc_documents_runtime" >/dev/null 2>&1 || true; done; psqlx postgres -c "DROP ROLE IF EXISTS ecc_documents_runtime" >/dev/null 2>&1 || true; }
# 1) rollback proposal (populated refuses; empty removes)
rbout="$(psqlx rb -v proposal="$tmp/proposal.sql" -v rollback="$tmp/rollback_proposal.sql" -f "$tmp/rb_tests.sql" 2>&1 | grep -v "rollback refused\|^psql:.*ERROR:  rollback\|transaction is aborted\|no transaction in progress" || true)"; echo "$rbout"
cleanup_role
# 2) the proposal refuses a PRE-EXISTING runtime role and changes nothing
sent_pass=0; sent_total=0
chk() { sent_total=$((sent_total+1)); if [ "$2" = "1" ]; then sent_pass=$((sent_pass+1)); else echo "SENTINEL FAIL: $1"; fi; }
psqlx sp -c "CREATE ROLE ecc_documents_runtime NOLOGIN; CREATE TABLE sentinel_owned(x int); ALTER TABLE sentinel_owned OWNER TO ecc_documents_runtime" >/dev/null
if psqlx sp -v ON_ERROR_STOP=1 -f "$tmp/proposal.sql" >/dev/null 2>&1; then chk "proposal must refuse a preexisting role" 0; else chk "proposal refuses a preexisting role" 1; fi
chk "refused proposal created no tables" "$(psqlx sp -c "select (not exists (select 1 from pg_tables where tablename like 'document\\_%'))::int")"
chk "refused proposal left the sentinel" "$(psqlx sp -c "select (exists (select 1 from pg_tables where tablename='sentinel_owned' and tableowner='ecc_documents_runtime'))::int")"
cleanup_role
# 3) main proof
out="$(psqlx main -v proposal="$tmp/proposal.sql" -f "$tmp/tests.sql" 2>&1 || true)"; echo "$out"
a="$(echo "$out" | tail -1)"; b="$(echo "$rbout" | tail -1)"
echo "$a $b $sent_pass|$sent_total" | awk -F'[| ]' '{ if ($1==$2 && $2>0 && $3==$4 && $4>0 && $5==$6 && $6>0) { print "[documents-db] PASS main " $1 "/" $2 ", rollback " $3 "/" $4 ", role custody " $5 "/" $6; exit 0 } else { print "[documents-db] FAIL"; exit 1 } }'
