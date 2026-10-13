import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BLANK, formatNumber, formatPercent, formatCurrencyFromCents } from "../../src/lib/format";

describe("formatNumber", () => {
  it("formats integers and decimals", () => {
    assert.equal(formatNumber(0), "0");
    assert.match(formatNumber("1234", 0), /1,234/);
    assert.match(formatNumber(12.345, 2), /12\.35/);
  });
  it("handles invalid values", () => {
    assert.equal(formatNumber(null), BLANK);
    assert.equal(formatNumber(undefined), BLANK);
    assert.equal(formatNumber(NaN), BLANK);
    assert.equal(formatNumber(Infinity), BLANK);
  });
});

describe("formatPercent", () => {
  it("treats values as fraction by default", () => {
    assert.equal(formatPercent(0.125), "12.5%");
  });
  it("supports percent basis", () => {
    assert.equal(formatPercent(12.5, 1, "percent"), "12.5%");
  });
  it("handles invalid", () => {
    assert.equal(formatPercent(undefined), BLANK);
  });
});

describe("formatCurrencyFromCents", () => {
  it("formats cents to currency", () => {
    assert.match(formatCurrencyFromCents(123456), /\$1,234\.56/);
  });
  it("handles negatives and invalid", () => {
    assert.match(formatCurrencyFromCents(-5050), /-\$50\.50/);
    assert.equal(formatCurrencyFromCents("oops"), BLANK);
  });
});
