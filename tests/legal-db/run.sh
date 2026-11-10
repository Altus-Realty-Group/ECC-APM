#!/usr/bin/env bash
# Isolated local PostgreSQL proof for docs/legal/schema/*.proposal.sql. Private temp cluster; never touches a real database.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[legal-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$here"/*.sql "$tmp"/ ; cp "$here/../../docs/legal/schema/001_native_legal_foundation.proposal.sql" "$tmp/proposal.sql"
chmod 644 "$tmp"/*.sql
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses=''" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
P="as $bin/psql -h $tmp -d postgres -X -q"
$P -f "$tmp/baseline.sql" >/dev/null
out="$(PGOPTIONS=--client-min-messages=warning $P -v proposal="$tmp/proposal.sql" -f "$tmp/tests.sql" -t -A 2>&1)"; echo "$out"
echo "$out" | tail -1 | awk -F'|' '{ if ($1==$2 && $2>0) { print "[legal-db] PASS " $1 "/" $2; exit 0 } else { print "[legal-db] FAIL"; exit 1 } }'
