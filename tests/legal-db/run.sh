#!/usr/bin/env bash
# Isolated local PostgreSQL proof for docs/legal/schema/*.proposal.sql. Private temp cluster; never touches a real database.
set -euo pipefail
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
# roles are cluster-wide: run the rollback database first so DROP ROLE sees no grants from the main database
rbout="$(psqlx rb -v proposal="$tmp/proposal.sql" -v rollback="$tmp/rollback_proposal.sql" -f "$tmp/rb_tests.sql" 2>&1 | grep -v "rollback refused\|^psql:.*ERROR:  rollback\|transaction is aborted\|no transaction in progress" || true)"; echo "$rbout"
out="$(psqlx postgres -v proposal="$tmp/proposal.sql" -f "$tmp/tests.sql" 2>&1)"; echo "$out"
a="$(echo "$out" | tail -1)"; b="$(echo "$rbout" | tail -1)"
echo "$a $b" | awk -F'[| ]' '{ if ($1==$2 && $2>0 && $3==$4 && $4>0) { print "[legal-db] PASS main " $1 "/" $2 ", rollback " $3 "/" $4; exit 0 } else { print "[legal-db] FAIL"; exit 1 } }'
