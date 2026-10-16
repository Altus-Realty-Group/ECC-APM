import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyCard } from "../../src/shared/card-contracts";
import Financials from "../../src/pages/card/property/Financials";
import HeroBlock from "../../src/pages/card/property/HeroBlock";
import OccupancyHistory from "../../src/components/recovery/OccupancyHistory";

const card = (rent: number | null) => PropertyCard.parse({ property: { id: 7, address: {} }, kpis: { avgRentCents: rent } });

test("property financial recovery preserves cents and distinguishes reported zero from unknown", () => {
  const exact = renderToStaticMarkup(<Financials data={card(150099)} />);
  assert.match(exact, /\$1,500\.99/);
  assert.match(exact, /Average rent is not collected income/);
  const zero = renderToStaticMarkup(<Financials data={card(0)} />);
  assert.match(zero, /\$0\.00/);
  assert.doesNotMatch(zero, /has not been reported/);
  const absent = renderToStaticMarkup(<Financials data={card(null)} />);
  assert.match(absent, /has not been reported/);
  assert.doesNotMatch(absent, /\$0\.00/);
  assert.doesNotMatch(exact, /<(button|a|form)\b/, "unavailable transactions must not expose pretend actions");
});

test("property hero and financial tab agree on exact reported rent", () => {
  const data = card(123456);
  for (const node of [<HeroBlock data={data} />, <Financials data={data} />]) {
    assert.match(renderToStaticMarkup(node), /\$1,234\.56/);
  }
});

test("occupancy history exposes original dates and accessible percentage observations", () => {
  const html = renderToStaticMarkup(<OccupancyHistory series={[{ date: "2026-09-15", occupancy: 0 }, { date: "2026-10-13", occupancy: 0.934 }]} />);
  assert.match(html, /2026-09-15/);
  assert.match(html, /2026-10-13/);
  assert.match(html, /0\.0%/);
  assert.match(html, /93\.4%/);
  assert.match(html, /<caption>/);
  assert.match(html, /scope="col"/);
  assert.doesNotMatch(html, /last 30 days|forecast|prediction/i);
});

test("empty occupancy history reports absence without manufacturing a zero observation", () => {
  const html = renderToStaticMarkup(<OccupancyHistory series={[]} />);
  assert.match(html, /No trend data reported/);
  assert.doesNotMatch(html, /<table|0\.0%|<details/);
});
