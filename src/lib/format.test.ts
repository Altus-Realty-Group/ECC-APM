import { BLANK, formatNumber, formatPercent, formatCurrencyFromCents } from "./format";

describe("formatNumber", () => {
  it("formats integers and decimals", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber("1234", 0)).toMatch(/1,234/);
    expect(formatNumber(12.345, 2)).toMatch(/12\.35/);
  });
  it("handles invalid values", () => {
    expect(formatNumber(null as any)).toBe(BLANK);
    expect(formatNumber(undefined as any)).toBe(BLANK);
    expect(formatNumber(NaN)).toBe(BLANK);
    expect(formatNumber(Infinity)).toBe(BLANK);
  });
});

describe("formatPercent", () => {
  it("treats values as fraction by default", () => {
    expect(formatPercent(0.125)).toBe("12.5%");
  });
  it("supports percent basis", () => {
    expect(formatPercent(12.5, 1, "percent")).toBe("12.5%");
  });
  it("handles invalid", () => {
    expect(formatPercent(undefined as any)).toBe(BLANK);
  });
});

describe("formatCurrencyFromCents", () => {
  it("formats cents to currency", () => {
    expect(formatCurrencyFromCents(123456)).toMatch(/\$1,234\.56/);
  });
  it("handles negatives and invalid", () => {
    expect(formatCurrencyFromCents(-5050)).toMatch(/-\$50\.50/);
    expect(formatCurrencyFromCents("oops" as any)).toBe(BLANK);
  });
});