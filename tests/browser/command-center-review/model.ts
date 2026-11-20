/** Deterministic visual-review data only. Never import from the operating application. */
import type { DashboardKpis } from '../../../src/features/dashboard/kpiAdapter';
export type ReviewMode = 'populated' | 'unknown' | 'denied';
export type ReviewProperty = { id:number; name:string; city:string; units:number; occupied:number; x:number; y:number };
export const properties: readonly ReviewProperty[] = [
  {id:1,name:'Madison Court',city:'Hammond',units:4,occupied:4,x:90,y:90},
  {id:2,name:'Parkside Place',city:'Hammond',units:4,occupied:3,x:150,y:125},
  {id:3,name:'Oak Terrace',city:'Hammond',units:4,occupied:2,x:120,y:180},
  {id:4,name:'Cedar House',city:'Hammond',units:4,occupied:4,x:210,y:120},
  {id:5,name:'Westview Court',city:'Gary',units:4,occupied:3,x:310,y:125},
  {id:6,name:'Lakeview Place',city:'Gary',units:4,occupied:3,x:360,y:185},
  {id:7,name:'Broadway Court',city:'Gary',units:4,occupied:4,x:410,y:135},
  {id:8,name:'Ridge House',city:'Gary',units:4,occupied:2,x:455,y:210},
  {id:9,name:'Meadow Place',city:'Merrillville',units:4,occupied:3,x:290,y:265},
  {id:10,name:'Southgate Court',city:'Merrillville',units:4,occupied:3,x:345,y:300},
  {id:11,name:'Willow House',city:'Merrillville',units:4,occupied:3,x:390,y:250},
  {id:12,name:'Garden Court',city:'Merrillville',units:4,occupied:2,x:445,y:320},
];
export const summary: DashboardKpis={propertiesTotal:12,unitsTotal:48,occupancyRate:.75,revenue30dCents:12500000,
 series:[{date:'2026-05-01',occupancy:.66},{date:'2026-06-01',occupancy:.69},{date:'2026-07-01',occupancy:.71},{date:'2026-08-01',occupancy:.73},{date:'2026-09-01',occupancy:.72},{date:'2026-10-01',occupancy:.75}],lastUpdated:'2026-11-15T16:00:00Z',lastUpdatedProblem:null};
/** Proposed presentation series, not an accepted finance API contract. All amounts are synthetic USD cents. */
export const financials=[
 {month:'May',income:6200000,expenses:4200000},{month:'Jun',income:6540000,expenses:4570000},
 {month:'Jul',income:6710000,expenses:4170000},{month:'Aug',income:6840000,expenses:4890000},
 {month:'Sep',income:6580000,expenses:7530000},{month:'Oct',income:7210000,expenses:4810000},
];
export const financeNet=(row:typeof financials[number])=>row.income-row.expenses;
export const netTone=(cents:number)=>cents<0?'negative':cents>0?'positive':'neutral';
export const money=(cents:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(cents/100);
export function scopeProperties(city:string,mode:ReviewMode){return mode==='populated'?properties.filter(p=>city==='All cities'||p.city===city):[];}
export function scopedFigures(city:string,mode:ReviewMode){
 if(mode!=='populated')return null;
 const rows=scopeProperties(city,mode),units=rows.reduce((s,p)=>s+p.units,0),occupied=rows.reduce((s,p)=>s+p.occupied,0);
 return {properties:rows.length,units,occupied,occupancy:units?occupied/units:null};
}
export const stages=[{label:'Leads',count:82},{label:'Tours',count:41},{label:'Applications',count:23},{label:'Approved',count:14},{label:'Signed',count:9}];
export const financialPlotY=(cents:number)=>20+(8000000-cents)/10000000*180;
export const leaseReviews=[
 {id:201,propertyId:1,end:'2026-11-01',window:'Past end'}, {id:202,propertyId:2,end:'2026-11-10',window:'Past end'},
 {id:203,propertyId:3,end:'2026-12-01',window:'0–30 days'}, {id:204,propertyId:4,end:'2026-12-10',window:'0–30 days'}, {id:205,propertyId:5,end:'2026-12-12',window:'0–30 days'},
 {id:206,propertyId:6,end:'2026-12-20',window:'31–60 days'}, {id:207,propertyId:7,end:'2027-01-02',window:'31–60 days'},
 {id:208,propertyId:8,end:'2027-01-20',window:'61–90 days'}, {id:209,propertyId:9,end:'2027-02-03',window:'61–90 days'},
];
export function scopedLeaseReviews(city:string,mode:ReviewMode,window:string){const ids=new Set(scopeProperties(city,mode).map(p=>p.id));return leaseReviews.filter(l=>ids.has(l.propertyId)&&l.window===window);}
