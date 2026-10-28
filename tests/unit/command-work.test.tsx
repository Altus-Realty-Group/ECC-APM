import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { confirmedLeases, confirmedUnits, inLeaseWindow, unitStatusGroups, unitStatusKey, type RecordQuery } from '../../src/features/dashboard/commandWork';
import CommandWorkSurface from '../../src/features/dashboard/components/CommandWorkSurface';
import { DashboardView } from '../../src/features/dashboard/pages/DashboardPage';
const date='2026-10-28';
const query=(data:unknown, extra:Partial<RecordQuery>={}):RecordQuery=>({data,isSuccess:true,isLoading:false,isFetching:false,isError:false,error:null,refetch:()=>{},...extra});
const leases=[{id:1,status:'active',end:'2026-10-27'},{id:2,status:'active',end:'2026-11-27'}, {id:3,status:'active',end:'2027-01-26'},{id:4,status:'active',end:'2027-01-27'}, {id:5,status:'ended',end:'2026-11-01'}, {id:6,status:'active',end:null}];
const html=(l= query(leases),u=query([]))=>renderToStaticMarkup(<Router ssrPath="/dashboard"><CommandWorkSurface leases={l} units={u} today={date}/></Router>);
test('lease horizon uses disjoint exact 30/90 boundaries and excludes ended or unverifiable rows',()=>{
 const rows=confirmedLeases(query(leases),date)!;
 for(const window of ['past','soon','next','later'] as const) assert.equal(rows.filter(r=>inLeaseWindow(r,window)).length,1);
 assert.deepEqual(rows.filter(r=>inLeaseWindow(r,'review')).map(r=>r.label),['Lease 1','Lease 2','Lease 3']);
 assert.deepEqual(rows.filter(r=>inLeaseWindow(r,'verify')).map(r=>r.label),['Lease 6']);
 assert.equal(rows.filter(r=>inLeaseWindow(r,'all')).length,6);
});
test('cached rows are suppressed during refresh, denial, failure, malformed payload and unresolved success',()=>{
 for(const patch of [{isFetching:true},{isError:true,error:new Error('503')},{error:Object.assign(new Error('denied'),{status:403})},{isSuccess:false}]){
  assert.equal(confirmedLeases(query(leases,patch),date),null);
  assert.equal(confirmedUnits(query([{id:10,status:'Vacant'}],patch)),null);
 }
 assert.equal(confirmedLeases(query([null]),date),null);
 assert.equal(confirmedUnits(query([null])),null);
 assert.deepEqual(confirmedLeases(query([]),date),[]);
 assert.equal(confirmedLeases(query(leases),'invalid'),null);
});
test('duplicate lease identity never contributes actionable chart counts',()=>{
 const rows=confirmedLeases(query([leases[0],leases[0]]),date)!;
 assert.equal(rows.filter(r=>inLeaseWindow(r,'past')).length,0);
 assert.equal(rows.filter(r=>inLeaseWindow(r,'verify')).length,2);
 assert.ok(rows.every(r=>!r.href));
});
test('unit labels retain missing and literal all as separate groups without invented readiness',()=>{
 const groups=unitStatusGroups(confirmedUnits(query([{id:1,status:'all'},{id:2},{id:3,status:'Vacant'},{id:4,status:'Vacant'}]))!);
 assert.equal(groups.reduce((n,g)=>n+g.count,0),4);
 assert.equal(groups.find(g=>g.status==='Vacant')?.count,2);
 assert.notEqual(unitStatusKey('all'),'all');
 assert.notEqual(unitStatusKey('missing'),unitStatusKey(null));
});
test('dashboard queue provides scoped counts, real card actions and no inferred work assignments',()=>{
 const page=html();
 assert.match(page,/3 matching of 6 loaded rows/);
 for(const id of [1,2,3])assert.match(page,new RegExp(`href="/card/lease/${id}"`));
 for(const id of [4,5,6])assert.doesNotMatch(page,new RegExp(`href="/card/lease/${id}"`));
 assert.match(page,/Chart counts use the full loaded collection/);
 assert.match(page,/Review source records before assigning work or sending notices/);
 assert.match(page,/aria-label="Search review queue"/);
});
test('unconnected dashboard consolidates the outage and does not pretend placeholder graphics are live',()=>{
 const unbound=query(undefined,{isSuccess:false,isError:true,error:new Error('BACKEND_NOT_CONNECTED')});
 const page=renderToStaticMarkup(<Router ssrPath="/dashboard"><DashboardView query={unbound} leases={unbound} units={unbound} today={date}/></Router>);
 assert.equal((page.match(/role="alert"/g)??[]).length,1);
 assert.match(page,/Retrying or refreshing the browser cannot create that connection/);
 assert.doesNotMatch(page,/cc-horizon-track|cc-status-stack|href="\/card\/lease/);
 assert.match(page,/<details class="cc-capabilities"/);
});
