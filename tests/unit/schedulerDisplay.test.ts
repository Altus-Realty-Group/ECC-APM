import assert from "node:assert/strict";
import { test } from "node:test";
import {
  schedulerDisplay,
  validPositiveFinite,
  validHourUtc,
  validTimestamp,
  NOT_REPORTED,
} from "../../src/features/systems/integrations/schedulerDisplay.ts";

test("missing values are Not reported; explicit false is Disabled; no invented interval", () => {
  const d = schedulerDisplay({ preferred: null, fallback: null });
  assert.equal(d.statusLabel, NOT_REPORTED);
  assert.equal(d.intervalLabel, NOT_REPORTED);
  assert.equal(d.nightlyLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, NOT_REPORTED);

  const disabled = schedulerDisplay({ fallback: { enabled: false } });
  assert.equal(disabled.statusLabel, "Disabled");

  const missingInterval = schedulerDisplay({ fallback: { enabled: true } });
  assert.equal(missingInterval.intervalLabel, NOT_REPORTED);
});

test("midnight 0 and \"0\" are 00:00 UTC; hours outside 0-23 rejected", () => {
  assert.equal(validHourUtc(0), 0);
  assert.equal(validHourUtc("0"), 0);
  assert.equal(validHourUtc(23), 23);
  assert.equal(validHourUtc(24), null);
  assert.equal(validHourUtc(-1), null);
  assert.equal(validHourUtc("abc"), null);
  assert.equal(validHourUtc(null), null);

  const midnight = schedulerDisplay({ fallback: { nightlyHour: 0 } });
  assert.equal(midnight.nightlyLabel, "00:00 UTC");

  const midnightStr = schedulerDisplay({ fallback: { nightlyHour: "0" } });
  assert.equal(midnightStr.nightlyLabel, "00:00 UTC");

  const badHour = schedulerDisplay({ fallback: { nightlyHour: 25 } });
  assert.equal(badHour.nightlyLabel, NOT_REPORTED);
});

test("interval must be positive finite; invalid rejected", () => {
  assert.equal(validPositiveFinite(10), 10);
  assert.equal(validPositiveFinite("15"), 15);
  assert.equal(validPositiveFinite(0), null);
  assert.equal(validPositiveFinite(-5), null);
  assert.equal(validPositiveFinite(NaN), null);
  assert.equal(validPositiveFinite(Infinity), null);

  const ok = schedulerDisplay({ fallback: { intervalMinutes: 30 } });
  assert.equal(ok.intervalLabel, "30 minutes");

  const bad = schedulerDisplay({ fallback: { intervalMinutes: 0 } });
  assert.equal(bad.intervalLabel, NOT_REPORTED);
});

test("present but malformed preferred field does not fall through", () => {
  const d = schedulerDisplay({
    preferred: { intervalMinutes: "nope", nightlyHour: 99, nextRunAt: "not-a-date" },
    fallback: { intervalMinutes: 10, nightlyHour: 5, nextRunAt: "2026-10-17T12:00:00.000Z" },
  });
  assert.equal(d.intervalLabel, NOT_REPORTED);
  assert.equal(d.nightlyLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, NOT_REPORTED);
});

test("explicit null from producer is Not reported, not Disabled or invented date", () => {
  const d = schedulerDisplay({
    fallback: { enabled: null, nightlyHour: null, nextRunAt: null, intervalMinutes: null },
  });
  assert.equal(d.statusLabel, NOT_REPORTED);
  assert.equal(d.nightlyLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, NOT_REPORTED);
  assert.equal(d.intervalLabel, NOT_REPORTED);
});

test("valid producer-compatible values render; invalid dates never invent a next run", () => {
  const iso = "2026-10-17T00:00:00.000Z";
  assert.ok(validTimestamp(iso));
  assert.equal(validTimestamp("garbage"), null);
  assert.equal(validTimestamp(""), null);
  assert.equal(validTimestamp(null), null);

  const d = schedulerDisplay({
    fallback: {
      enabled: true,
      intervalMinutes: 10,
      nightlyHour: 0,
      nextRunAt: iso,
      lastRunAt: iso,
    },
  });
  assert.equal(d.statusLabel, "Enabled");
  assert.equal(d.intervalLabel, "10 minutes");
  assert.equal(d.nightlyLabel, "00:00 UTC");
  assert.equal(d.nextRunLabel, iso);
  assert.equal(d.lastRunLabel, iso);
});

test("failed/denied caller passes null sources — no cached configuration shown", () => {
  const d = schedulerDisplay({ preferred: null, fallback: null });
  assert.equal(d.statusLabel, NOT_REPORTED);
  assert.equal(d.intervalLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, NOT_REPORTED);
});
