import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import UnitOverview from '../../src/pages/card/unit/Overview';
import UnitFiles from '../../src/pages/card/unit/Files';
import LeaseFiles from '../../src/pages/card/lease/Files';
import TenantFiles from '../../src/pages/card/tenant/Files';
import OwnerFiles from '../../src/pages/card/owner/Files';
import UnitLegal from '../../src/pages/card/unit/Legal';
import LeaseLegal from '../../src/pages/card/lease/Legal';
import TenantLegal from '../../src/pages/card/tenant/Legal';
import OwnerLegal from '../../src/pages/card/owner/Legal';
import UnitFinancials from '../../src/pages/card/unit/Financials';
import LeaseFinancials from '../../src/pages/card/lease/Financials';
import TenantFinancials from '../../src/pages/card/tenant/Financials';
import OwnerFinancials from '../../src/pages/card/owner/Financials';
import PropertyRail from '../../src/pages/card/property/RightRail';
import UnitRail from '../../src/pages/card/unit/RightRail';
import LeaseRail from '../../src/pages/card/lease/RightRail';
import TenantRail from '../../src/pages/card/tenant/RightRail';
import OwnerRail from '../../src/pages/card/owner/RightRail';

test('unconnected mounted card tabs describe unavailable records, never confirmed empty listings', () => {
  for (const Component of [UnitFiles, LeaseFiles, TenantFiles, OwnerFiles, UnitLegal, LeaseLegal, TenantLegal, OwnerLegal, UnitFinancials, LeaseFinancials, TenantFinancials, OwnerFinancials]) {
    const html = renderToStaticMarkup(<Component />);
    assert.match(html, /not available on this card yet/);
    assert.doesNotMatch(html, /No files|No legal items|Placeholder|Dropbox|DoorLoop|\.pdf|\.zip|<li[ >]/i);
  }
});
test('legacy card rails cannot render invented document records if reused', () => {
  for (const Component of [PropertyRail, UnitRail, LeaseRail, TenantRail, OwnerRail]) {
    const html = renderToStaticMarkup(<Component />);
    assert.match(html, /File listing is not available/);
    assert.doesNotMatch(html, /\.pdf|\.zip|placeholder|will appear here/i);
  }
});
test('unit overview preserves reported zero measurements and labels while missing/malformed remains unknown', () => {
  const reported = renderToStaticMarkup(<UnitOverview unit={{ unit_label: 'Reported studio', beds: 0, baths: 0, sqft: 0 }} property={{ id: 42 }} />);
  assert.match(reported, /Reported studio/);
  assert.match(reported, /Property #42/);
  assert.equal((reported.match(/>0<\/div>/g) ?? []).length, 3);
  for (const malformed of [undefined, {}, { id: undefined }, { id: {} }, { id: -1 }, { id: Infinity }]) {
    const html = renderToStaticMarkup(<UnitOverview unit={{ unit_label: {}, unit_number: {} }} property={malformed} />);
    assert.match(html, /Property not reported/);
    assert.doesNotMatch(html, /Property #|undefined|\[object Object\]/);
  }
  for (const invalid of [null, undefined, '', '0', false, -1, NaN, Infinity]) {
    const html = renderToStaticMarkup(<UnitOverview unit={{ beds: invalid, baths: invalid, sqft: invalid }} />);
    assert.equal((html.match(/>Not specified<\/div>/g) ?? []).length, 4);
    assert.doesNotMatch(html, />0<\/div>|NaN|Infinity/);
  }
});
