#!/bin/bash
set -euo pipefail
printf '%s\n' 'Legacy Azure deployment is quarantined. No Azure command was run. See docs/recovery/LEGACY_AUTOMATION_QUARANTINE_20261017.md.' >&2
exit 1
