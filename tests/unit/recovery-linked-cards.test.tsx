import React from "react";
import { Router } from "wouter";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { OwnerCard, TenantCard, LeaseCard, UnitCard } from "../../src/shared/card-contracts";
import OwnerLinked from "../../src/pages/card/owner/Linked";
import TenantLinked from "../../src/pages/card/tenant/Linked";
import LeaseLinked from "../../src/pages/card/lease/Linked";
import UnitLinked from "../../src/pages/card/unit/Linked";
import RelatedRecord, { relatedRecordPath } from "../../src/components/recovery/RelatedRecord";
import CardLoadNotice from "../../src/components/recovery/CardLoadNotice";

const render = (node: React.ReactNode) => renderToStaticMarkup(<Router ssrPath="/">{node}</Router>);

test("owner related records expose every reported property, including beyond five", () => {
  const data = OwnerCard.parse({ owner: { id: 9 }, properties: Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: i ? `Property ${i + 1}` : "" })) });
  const html = render(<OwnerLinked data={data} />);
  assert.equal((html.match(/href="\/card\/property\//g) ?? []).length, 8);
  assert.match(html, /href="\/card\/property\/8"/);
  assert.match(html, /Property #1/);
});

test("tenant shows current and historical leases once, without inventing property or unit links", () => {
  const data = TenantCard.parse({ tenant: { id: 2 }, activeLease: { id: 4, status: "ACTIVE" }, leases: [{ id: 4, status: "ACTIVE" }, { id: 5, status: "EXPIRED" }] });
  const html = render(<TenantLinked data={data} />);
  assert.equal((html.match(/href="\/card\/lease\/4"/g) ?? []).length, 1);
  assert.match(html, /Current lease - ACTIVE/);
  assert.match(html, /EXPIRED/);
  assert.doesNotMatch(html, /\/card\/(property|unit)\//);
  const separate = TenantCard.parse({ tenant: { id: 2 }, activeLease: { id: 7 }, leases: [] });
  assert.match(render(<TenantLinked data={separate} />), /href="\/card\/lease\/7"/);
});

test("lease and unit follow only relationships actually returned by their card contracts", () => {
  const lease = LeaseCard.parse({ lease: { id: 4 }, property: { id: 6 }, unit: { id: 8 }, tenant: { id: 2 } });
  const html = render(<LeaseLinked data={lease} />);
  for (const path of ["property/6", "unit/8", "tenant/2"]) assert.ok(html.includes(`/card/${path}`));
  assert.match(html, /Tenant #2/);
  const unit = UnitCard.parse({ unit: { id: 8 }, property: { id: 6 }, lease: { id: 4, status: "ACTIVE" } });
  const unitHtml = render(<UnitLinked data={unit} />);
  assert.match(unitHtml, /href="\/card\/property\/6"/);
  assert.match(unitHtml, /href="\/card\/lease\/4"/);
  assert.doesNotMatch(unitHtml, /\/card\/tenant\//);
});

test("absent relationships are stated as unreported rather than invented destinations", () => {
  const nodes = [
    <OwnerLinked data={OwnerCard.parse({ owner: { id: 1 } })} />,
    <TenantLinked data={TenantCard.parse({ tenant: { id: 1 } })} />,
    <LeaseLinked data={LeaseCard.parse({ lease: { id: 1 } })} />,
    <UnitLinked data={UnitCard.parse({ unit: { id: 1 } })} />,
  ];
  for (const node of nodes) {
    const html = render(node);
    assert.doesNotMatch(html, /<a\b/);
    assert.match(html, /reported/);
  }
});

test("incomplete identifiers never produce broken record links", () => {
  for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(relatedRecordPath("lease", id), null);
    assert.doesNotMatch(render(<RelatedRecord kind="lease" id={id} title="Reported lease" />), /<a\b/);
  }
  assert.equal(relatedRecordPath("lease", 12), "/card/lease/12");
});

test("load notices distinguish loading, failed retrieval, and denied access without empty-record claims", () => {
  const props = { entity: "tenant", retry: () => {}, retrying: false, backPath: "/portfolio/tenants", error: null };
  const denied = render(<CardLoadNotice {...props} loading={false} denied={true} />);
  assert.match(denied, /role="alert"/);
  assert.match(denied, /No record details are shown/);
  const loading = render(<CardLoadNotice {...props} loading={true} denied={false} />);
  assert.match(loading, /aria-busy="true"/);
  assert.doesNotMatch(loading, /<button/);
  const failure = render(<CardLoadNotice {...props} loading={false} denied={false} />);
  assert.match(failure, /could not be loaded/);
  assert.doesNotMatch(failure, /No (leases|properties|records)/);
});

// R8-C2 additions ------------------------------------------------------------------------------------------------
const links = (html: string) => Array.from(html.matchAll(/href="(\/card\/[^"]+)"/g), (m) => m[1]);

test("an owner with many properties lists every one, in order, with a link each", () => {
  const data = OwnerCard.parse({ owner: { id: 9 }, properties: Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `P${i + 1}` })) });
  assert.deepEqual(links(render(<OwnerLinked data={data} />)), Array.from({ length: 25 }, (_, i) => `/card/property/${i + 1}`));
});

test("unusable identifiers stay readable but never become links, for every entity", () => {
  for (const id of [0, -3, 1.5]) {
    assert.equal(relatedRecordPath("property", id), null);
    const owner = render(<OwnerLinked data={OwnerCard.parse({ owner: { id: 9 }, properties: [{ id, name: "Readable name" }, { id: 3, name: "Valid" }] })} />);
    assert.deepEqual(links(owner), ["/card/property/3"]);
    assert.match(owner, /Readable name/);
    const tenant = render(<TenantLinked data={TenantCard.parse({ tenant: { id: 2 }, activeLease: { id }, leases: [{ id: 5 }] })} />);
    assert.deepEqual(links(tenant), ["/card/lease/5"]);
    const lease = render(<LeaseLinked data={LeaseCard.parse({ lease: { id: 4 }, property: { id }, unit: { id }, tenant: { id } })} />);
    assert.deepEqual(links(lease), []);
    assert.match(lease, /cannot be opened/);
    const unit = render(<UnitLinked data={UnitCard.parse({ unit: { id: 8 }, property: { id }, lease: { id } })} />);
    assert.deepEqual(links(unit), []);
  }
});

test("names fall back to the record's own id, never the demo id 1", () => {
  const owner = render(<OwnerLinked data={OwnerCard.parse({ owner: { id: 9 }, properties: [{ id: 7, name: "   " }, { id: 12 }] })} />);
  assert.match(owner, /Property #7/);
  assert.match(owner, /Property #12/);
  assert.doesNotMatch(owner, /Property #1\b(?!2)/);
  const lease = render(<LeaseLinked data={LeaseCard.parse({ lease: { id: 4 }, tenant: { id: 22 } })} />);
  assert.match(lease, /Tenant #22/);
  assert.doesNotMatch(lease, /Tenant #1\b/);
});

test("tenant current lease is first and appears exactly once, whether or not the list contains it", () => {
  const inList = TenantCard.parse({ tenant: { id: 2 }, activeLease: { id: 5, status: "ACTIVE" }, leases: [{ id: 3 }, { id: 5, status: "ACTIVE" }, { id: 4 }] });
  assert.deepEqual(links(render(<TenantLinked data={inList} />)), ["/card/lease/5", "/card/lease/3", "/card/lease/4"]);
  const absent = TenantCard.parse({ tenant: { id: 2 }, activeLease: { id: 9, status: "ACTIVE" }, leases: [{ id: 3 }, { id: 4 }] });
  assert.deepEqual(links(render(<TenantLinked data={absent} />)), ["/card/lease/9", "/card/lease/3", "/card/lease/4"]);
  const none = TenantCard.parse({ tenant: { id: 2 }, activeLease: null, leases: [{ id: 3 }, { id: 4 }] });
  assert.deepEqual(links(render(<TenantLinked data={none} />)), ["/card/lease/3", "/card/lease/4"]);
});

test("each relationship's empty state is specific to its entity", () => {
  assert.match(render(<OwnerLinked data={OwnerCard.parse({ owner: { id: 1 }, properties: [] })} />), /No properties were reported for this owner\./);
  assert.match(render(<TenantLinked data={TenantCard.parse({ tenant: { id: 1 }, leases: [] })} />), /No leases were reported for this tenant\./);
  const lease = render(<LeaseLinked data={LeaseCard.parse({ lease: { id: 1 } })} />);
  for (const w of ["property", "unit", "tenant"]) assert.match(lease, new RegExp(`No ${w} was reported for this lease\\.`));
  const unit = render(<UnitLinked data={UnitCard.parse({ unit: { id: 1 } })} />);
  for (const w of ["property", "lease"]) assert.match(unit, new RegExp(`No ${w} was reported for this unit\\.`));
});
