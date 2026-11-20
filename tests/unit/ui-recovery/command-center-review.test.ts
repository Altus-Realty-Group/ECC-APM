import {test} from 'node:test';
import assert from 'node:assert/strict';
import {financials,financialPlotY,financeNet,netTone,properties,scopeProperties,scopedFigures,scopedLeaseReviews,summary} from '../../browser/command-center-review/model';
test('synthetic review city filter reconciles property, unit and occupied counts',()=>{
 const full=scopedFigures('All cities','populated')!;
 assert.equal(full.properties,summary.propertiesTotal);assert.equal(full.units,summary.unitsTotal);assert.equal(full.occupancy,summary.occupancyRate);
 const byCity=['Hammond','Gary','Merrillville'].map(c=>scopedFigures(c,'populated')!);
 assert.equal(byCity.reduce((s,c)=>s+c.units,0),full.units);assert.equal(byCity.reduce((s,c)=>s+c.occupied,0),full.occupied);
 assert.equal(scopeProperties('Hammond','populated').every(p=>p.city==='Hammond'),true);
});
test('synthetic review withholds figures and all record identities on denied or pending',()=>{
 for(const mode of ['denied','unknown'] as const){assert.equal(scopedFigures('All cities',mode),null);assert.deepEqual(scopeProperties('All cities',mode),[]);assert.deepEqual(scopedLeaseReviews('All cities',mode,'Past end'),[]);}
});
test('synthetic finance has a genuine loss period, a common axis and period-reactive totals',()=>{
 assert.equal(netTone(financeNet(financials[4])),'negative');assert.equal(netTone(financeNet(financials[5])),'positive');assert.equal(netTone(0),'neutral');
 assert.ok(financialPlotY(financeNet(financials[4]))>financialPlotY(0));assert.ok(financialPlotY(financeNet(financials[5]))<financialPlotY(0));
 const sum=(rows:typeof financials)=>rows.reduce((s,r)=>s+financeNet(r),0);
 assert.notEqual(sum(financials),sum(financials.slice(-3)));
 for(const r of financials)assert.equal(financeNet(r),r.income-r.expenses);
});
test('synthetic horizon selects actual lease rows within the selected property city',()=>{
 const windows=['Past end','0–30 days','31–60 days','61–90 days'];assert.deepEqual(windows.map(w=>scopedLeaseReviews('All cities','populated',w).length),[2,3,2,2]);
 const selected=scopedLeaseReviews('Hammond','populated','0–30 days');assert.equal(selected.length,2);
 for(const r of selected)assert.equal(properties.find(p=>p.id===r.propertyId)?.city,'Hammond');
});
