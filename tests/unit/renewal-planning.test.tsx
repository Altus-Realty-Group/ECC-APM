import React from "react";
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { chicagoPlanningDate, reportedLeaseEnd, planningRows, planningSummary, filterPlanningRows } from "../../src/features/renewals/renewalPlanning";
import RenewalPlanningPage, { RenewalPlanningView } from "../../src/features/renewals/RenewalPlanningPage";
import { createQueryClient } from "../../src/lib/queryClient";
import { handleSessionBoundary } from "../../src/lib/sessionScope";
import { HttpError } from "../../src/lib/http";
import { navLeafPaths, PLANNED_DESTINATIONS } from "../../src/config/navigation";
import { routeExists } from "./helpers";
const today="2026-10-17";
const lease=(id: unknown,end: unknown,status: unknown="active")=>({id,end,status,propertyName:"Fixture property",unitLabel:"1",tenants:["Fixture tenant"]});
type Query=React.ComponentProps<typeof RenewalPlanningView>["query"];
function render(overrides:Partial<Query>={}){
 const query={data:undefined,isSuccess:false,isError:false,isLoading:false,isFetching:false,error:null,refetch:async()=>({}),...overrides}as Query;
 return renderToStaticMarkup(<Router ssrPath="/ops/ai/renewal-forecasting"><RenewalPlanningView query={query} today={today}/></Router>);
}

test("planning reference uses Chicago calendar date across UTC midnight and DST",()=>{
 assert.equal(chicagoPlanningDate(new Date("2026-10-18T01:00:00Z")),"2026-10-17");
 assert.equal(chicagoPlanningDate(new Date("2026-01-01T05:00:00Z")),"2025-12-31");
 const rows=planningRows([lease(1,"2026-03-09")],"2026-03-07");assert.equal(rows[0].days,2);
});

test("source end_date and documented LeaseOut.end preserve dates without ambiguous timezone coercion",()=>{
 assert.equal(reportedLeaseEnd({end:"2026-10-17"}).date,today);
 assert.equal(reportedLeaseEnd({end_date:"2026-10-17"}).date,today);
 assert.equal(reportedLeaseEnd({end:"2026-10-17T00:00:00.000Z"}).date,today);
 for(const value of["2026-02-30","2026-13-01","10/17/2026","2026-10-17T15:00:00Z","2026-10-17T00:00:00-05:00",{},0]){
  const result=reportedLeaseEnd({end:value});assert.equal(result.date,null);assert.match(result.issue!,/verification/);
 }
 assert.equal(reportedLeaseEnd({end:null}).issue,"End date not reported");
 assert.equal(reportedLeaseEnd({end_date:"2026-11-01",end:"2026-12-01"}).issue,"Reported end dates disagree");
 assert.equal(reportedLeaseEnd({end_date:"2026-11-01",end:"2026-12-01"}).reported,"2026-11-01 / 2026-12-01");
 assert.equal(reportedLeaseEnd({end_date:null,end:"2026-12-01"}).date,null);
 assert.equal(reportedLeaseEnd({end_date:null,end:"2026-12-01"}).issue,"Reported end dates disagree");
});

test("expiry buckets have exact non-overlapping 0/30/31/60/61/90/91 calendar boundaries",()=>{
 const ends=["2026-10-16","2026-10-17","2026-11-16","2026-11-17","2026-12-16","2026-12-17","2027-01-15","2027-01-16",null];
 const rows=planningRows(ends.map((end,i)=>lease(i+1,end)),today);
 assert.deepEqual(rows.map(row=>row.days),[-1,0,30,31,60,61,90,91,null]);
 assert.deepEqual(rows.map(row=>row.bucket),["past","today","1-30","31-60","31-60","61-90","61-90","later","unknown"]);
 assert.deepEqual(planningSummary(rows),{loaded:9,active:9,due30:2,due31to90:4,past:1,uncertain:1,ended:0});
});

test("status classification exactly follows portfolio active/ended/unclassified policy",()=>{
 const values=["active"," ACTIVE ","ended","terminated","closed","past","inactive","cancelled","canceled","current","pending",null,{},""];
 const rows=planningRows(values.map((status,i)=>lease(i+1,today,status)),today);
 assert.deepEqual(rows.map(row=>row.classification),["active","active","ended","ended","ended","ended","ended","ended","ended","uncertain","uncertain","uncertain","uncertain","uncertain"]);
 assert.equal(planningSummary(rows).due30,2);
 assert.equal(planningSummary(rows).uncertain,5);
 assert.equal(filterPlanningRows(rows,"","all","planning").length,7);
});

test("unsafe and duplicate lease identifiers stay readable, unlinked and outside known active date counts",()=>{
 const rows=planningRows([0,-1,1.5,"bad",Number.MAX_SAFE_INTEGER+1,42,"042"].map(id=>lease(id,today)),today);
 assert.equal(rows.every(row=>row.href===undefined),true);
 assert.equal(planningSummary(rows).due30,0);
 assert.equal(planningSummary(rows).uncertain,7);
 assert.equal(rows.filter(row=>row.issues.includes("Duplicate lease reference")).length,2);
 const valid=planningRows([lease("7",today)],today);assert.equal(valid[0].href,"/card/lease/7");
});

test("search/status/date filters expose uncertain records without inventing active status",()=>{
 const rows=planningRows([lease(1,today),lease(2,null,null),lease(3,today,"ended"),{...lease(4,"2026-12-01"),propertyName:"Crown Point"}],today);
 assert.equal(filterPlanningRows(rows,"Fixture tenant","today","all").length,2);
 assert.equal(filterPlanningRows(rows,"","unknown","uncertain").length,1);
 assert.equal(filterPlanningRows(rows,"crown","31-60","active").length,1);
 assert.equal(filterPlanningRows(rows,"","all","ended").length,1);
});

test("malformed collection rows fail whole read; malformed optional labels are not stringified",()=>{
 for(const payload of[null,{},[null],[42],[[]]])assert.throws(()=>planningRows(payload,today));
 const [row]=planningRows([{...lease(1,today),tenants:[{}],propertyName:{},unitLabel:[]}],today);
 assert.equal(row.tenants,null);assert.equal(row.property,null);assert.equal(row.unit,null);
});

test("ready rendering provides actual safe lease links and source coverage without forecast or rent",()=>{
 const html=render({data:[lease(42,today),lease("bad","2026-02-30",null)],isSuccess:true});
 assert.equal((html.match(/<h1\b/g)??[]).length,1);
 assert.match(html,/Renewal planning/);assert.match(html,/href="\/card\/lease\/42"/);
 assert.doesNotMatch(html,/href="\/card\/lease\/bad"|\$|probability|renewal rate/i);
 assert.match(html,/End date needs verification/);assert.match(html,/Lease status not reported/);
 assert.match(html,/2026-02-30/);assert.match(html,/Records last updated: Not reported/);
 assert.match(html,/may not include your entire portfolio/);
});

test("loading/failed/unresolved/denied reads never render cached rows, date metrics or filters",()=>{
 for(const state of[{}, {isLoading:true,isFetching:true}, {data:[lease(42,today)],isError:true,error:new HttpError("HTTP 503",503)},
  {data:[lease(42,today)],isSuccess:true,isFetching:true},{data:[lease(42,today)],isError:true,error:new HttpError("Denied",403)}]){
  const html=render(state);assert.doesNotMatch(html,/Fixture property|href="\/card\/lease\/42"|ecc-renewals-metrics|matching loaded row|Search loaded records/);
  assert.match(html,/Renewal planning/);assert.match(html,/Review leases/);
 }
 assert.match(render({isError:true,error:new Error("outage")}),/>Retry</);
 assert.match(render({isError:true,error:new HttpError("Denied",403)}),/state-denied/);
});

test("confirmed empty success has honest zero metrics and an actual empty state",()=>{
 const html=render({data:[],isSuccess:true});assert.match(html,/0 loaded rows/);assert.match(html,/returned no records/);assert.match(html,/ecc-renewals-metrics/);
});

test("same shared lease query and session purge do not retain prior planning records",()=>{
 const client=createQueryClient();client.setQueryData(["portfolio","leases"],[lease(42,today)]);
 const page=()=>renderToStaticMarkup(<Router ssrPath="/ops/ai/renewal-forecasting"><QueryClientProvider client={client}><RenewalPlanningPage/></QueryClientProvider></Router>);
 assert.match(page(),/Fixture property/);handleSessionBoundary(client);assert.doesNotMatch(page(),/Fixture property/);client.clear();
});

test("renewal planning replaces the planned placeholder with a unique registered route",()=>{
 assert.equal(routeExists("/ops/ai/renewal-forecasting"),true);assert.equal(navLeafPaths().filter(path=>path==="/ops/ai/renewal-forecasting").length,1);
 assert.equal(PLANNED_DESTINATIONS.some(item=>item.path==="/ops/ai/renewal-forecasting"),false);
});
