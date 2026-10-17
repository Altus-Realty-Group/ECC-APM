import assert from "node:assert/strict";
import { test } from "node:test";
import {
  schedulerDisplay,
  schedulerFromQueries,
  validPositiveFinite,
  validHourUtc,
  validTimestamp,
  readIsUnsettled,
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
    preferred: { intervalMinutes: "nope", nightlyHour: 99 },
    fallback: { intervalMinutes: 10, nightlyHour: 5 },
    observedNextRun: "2026-10-17T12:00:00.000Z",
  });
  assert.equal(d.intervalLabel, NOT_REPORTED);
  assert.equal(d.nightlyLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, "2026-10-17T12:00:00.000Z");
});

test("explicit null from producer is Not reported, not Disabled or invented date", () => {
  const d = schedulerDisplay({
    fallback: { enabled: null, nightlyHour: null, intervalMinutes: null },
    observedNextRun: null,
  });
  assert.equal(d.statusLabel, NOT_REPORTED);
  assert.equal(d.nightlyLabel, NOT_REPORTED);
  assert.equal(d.nextRunLabel, NOT_REPORTED);
  assert.equal(d.intervalLabel, NOT_REPORTED);
});

test("timestamps must be timezone-qualified; invalid never invent a next run", () => {
  const iso = "2026-10-17T00:00:00.000Z";
  assert.ok(validTimestamp(iso));
  assert.ok(validTimestamp("2026-10-17T00:00:00+00:00"));
  assert.equal(validTimestamp("2026-10-17T00:00:00"), null);
  assert.equal(validTimestamp("garbage"), null);
  assert.equal(validTimestamp(""), null);
  assert.equal(validTimestamp(null), null);

  const d = schedulerDisplay({
    fallback: { enabled: true, intervalMinutes: 10, nightlyHour: 0 },
    observedNextRun: iso,
  });
  assert.equal(d.statusLabel, "Enabled");
  assert.equal(d.intervalLabel, "10 minutes");
  assert.equal(d.nightlyLabel, "00:00 UTC");
  assert.equal(d.nextRunLabel, iso);
});

test("Next Run comes only from stored health observation; admin estimate is ignored", () => {
  const stored = "2026-10-18T05:00:00.000Z";
  const estimate = "2026-10-17T15:10:00.000Z";
  const d = schedulerFromQueries({
    adminFlags: {},
    adminData: { scheduler: { enabled: true, intervalMinutes: 10, nextRun: estimate, fullSyncHourUTC: 5 } },
    healthFlags: {},
    healthData: { enabled: false, intervalMinutes: 20, status: { next_run_at: stored } },
  });
  assert.equal(d?.nextRunLabel, stored);
  assert.notEqual(d?.nextRunLabel, estimate);
});

test("cached admin values are suppressed on failed, denied, pending and refreshing reads", () => {
  const cached = { scheduler: { enabled: true, intervalMinutes: 10, fullSyncHourUTC: 5 } };
  const health = { enabled: false, intervalMinutes: 30, status: { next_run_at: "2026-10-18T05:00:00.000Z" } };

  for (const flags of [
    { isError: true },
    { isPending: true },
    { isFetching: true },
    { denied: true },
  ]) {
    const d = schedulerFromQueries({
      adminFlags: flags,
      adminData: cached,
      healthFlags: {},
      healthData: health,
    });
    // Preferred suppressed; falls back to health. Enabled false from health, not true from cache.
    assert.equal(d?.statusLabel, "Disabled");
    assert.equal(d?.intervalLabel, "30 minutes");
  }

  const healthUnsettled = schedulerFromQueries({
    adminFlags: {},
    adminData: cached,
    healthFlags: { isError: true },
    healthData: health,
  });
  assert.equal(healthUnsettled, null);

  assert.equal(readIsUnsettled({ isFetching: true }), true);
  assert.equal(readIsUnsettled({}), false);
});

test("preferred explicit null is preserved and not replaced by fallback", () => {
  const d = schedulerFromQueries({
    adminFlags: {},
    adminData: { scheduler: { enabled: null, intervalMinutes: null, fullSyncHourUTC: null } },
    healthFlags: {},
    healthData: { enabled: true, intervalMinutes: 10, nightlyFullHourUtc: 5 },
  });
  assert.equal(d?.statusLabel, NOT_REPORTED);
  assert.equal(d?.intervalLabel, NOT_REPORTED);
  assert.equal(d?.nightlyLabel, NOT_REPORTED);
});
