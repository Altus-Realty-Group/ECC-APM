#!/usr/bin/env bash
# Isolated local PostgreSQL proof of the A1 seam (real `pg` driver, reused pooled connection). Private temp cluster on a unix socket.
set -euo pipefail
for v in $(compgen -e | grep '^PG' || true); do unset "$v"; done
here="$(cd "$(dirname "$0")" && pwd)"; root="$(cd "$here/../.." && pwd)"; bin=/usr/lib/postgresql/16/bin
[ -x "$bin/initdb" ] || { echo "[authz-db] SKIP: PostgreSQL 16 binaries not found"; exit 0; }
tmp="$(mktemp -d)"; chmod 755 "$tmp"
as() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$tmp"
cp "$here/setup.sql" "$tmp/setup.sql"; chmod 644 "$tmp/setup.sql"
as "$bin/initdb" -D "$tmp/d" -A trust >/dev/null
as "$bin/pg_ctl" -D "$tmp/d" -o "-k $tmp -c listen_addresses='' -c unix_socket_permissions=0777" -l "$tmp/log" -w start >/dev/null
trap 'as "$bin/pg_ctl" -D "$tmp/d" -m immediate stop >/dev/null || true; rm -rf "$tmp"' EXIT
as "$bin/psql" -h "$tmp" -d postgres -X -q -v ON_ERROR_STOP=1 -f "$tmp/setup.sql" >/dev/null
cd "$root"
AUTHZ_DB_SOCKET="$tmp" node --import tsx --test tests/authz-db/seam.test.mts 2>&1 | tee "$tmp/out.txt" | grep -E "^not ok|^# (tests|pass|fail)|^\s+(error|message):" || true
grep -q "^# fail 0" "$tmp/out.txt" && grep -q "^# pass [1-9]" "$tmp/out.txt" && echo "[authz-db] PASS $(grep '^# pass' "$tmp/out.txt")" || { echo "[authz-db] FAIL"; exit 1; }
