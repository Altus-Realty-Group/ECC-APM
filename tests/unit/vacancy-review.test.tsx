import React from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { Router } from 'wouter';
import { vacancyRows, VacancyReviewView } from '../../src/features/vacancy/VacancyReviewPage';
import { HttpError } from '../../src/lib/http';
type Query = React.ComponentProps<typeof VacancyReviewView>['query'];
const rows = [{id: 1, unitLabel:'Private fixture unit', propertyName:'Fixture property',status:'Vacant'}, {id:2,status:null}];
const render = (overrides: Partial<Query>) => renderToStaticMarkup(<Router ssrPath="/ops/ai/vacancy-analytics"><VacancyReviewView query={{data:rows,isSuccess:true,isLoading:false,isFetching:false,isError:false,error:null,refetch:async()=>({}),...overrides} as Query}/></Router>);
test('unit review preserves missing status and disables ambiguous record links',()=>{
 assert.equal(vacancyRows(rows)[1].status,null);
 assert.equal(vacancyRows([{id:1},{id:'01'}]).every(row=>!row.href),true);
 for(const input of [null,{},[null],[[]]]) assert.throws(()=>vacancyRows(input));
});
test('successful source renders unit record links and filters without fabricated occupancy',()=>{
 const html=render({});assert.match(html,/Private fixture unit/);assert.match(html,/\/card\/unit\/1/);assert.match(html,/Reported status/);assert.doesNotMatch(html,/100%|lost rent:|days vacant:/i);
});
test('cached records are hidden on refresh, failure, denial and unconfirmed reads',()=>{
 for(const state of [{isFetching:true},{isError:true,error:new Error('outage')},{isError:true,error:new HttpError(403,'Denied')},{isSuccess:false},{data:[null]}]){
  const html=render(state);assert.doesNotMatch(html,/Private fixture unit|Fixture property|Loaded unit rows/);
 }
});
