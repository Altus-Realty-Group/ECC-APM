// Isolated actual-page acceptance. All API responses below are test inputs, never operating data.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
const base = process.env.ECC_BROWSER_BASE ?? 'http://127.0.0.1:5191';
assert.equal(new URL(base).hostname, '127.0.0.1');
const server=process.env.ECC_BROWSER_BASE?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5191'],{stdio:'ignore'});
let ready=false;
for(let n=0;n<80;n++){try{ready=(await fetch(base)).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100))}
if(!ready){server?.kill();throw new Error('Isolated source host unavailable')}
const browser = await chromium.launch({executablePath: process.env.ECC_BROWSER_EXECUTABLE, headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let checks=0;
const fixtures={
 properties:[{id:1,name:'Fixture Property',type:'residential'}],
 units:[{id:1,unitLabel:'Fixture Unit A',propertyName:'Fixture Maple',status:'Vacant'},{id:2,unitLabel:'Fixture Unit B',propertyName:'Fixture Oak',status:'Occupied'}],
 leases:[{id:1,tenants:['Fixture Alpha'],propertyName:'Fixture Maple',status:'active',rent:1000},{id:2,tenants:['Fixture Beta'],propertyName:'Fixture Oak',status:'active',rent:2000}],
 tenants:[{id:1,name:'Fixture Alpha',propertyName:'Fixture Maple',type:'current'},{id:2,name:'Fixture Beta',propertyName:'Fixture Oak',type:'past'}],
 owners:[{id:1,name:'Fixture Alpha',company:'Fixture Company'},{id:2,name:'Fixture Beta',company:'Fixture Other'}],
};
const cards={property:{property:{id:1,name:'Fixture Property',type:'residential',address:{}},kpis:{}},unit:{unit:{id:1,unit_label:'Fixture Unit'}},lease:{lease:{id:1}},tenant:{tenant:{id:1,display_name:'Fixture Tenant'}},owner:{owner:{id:1,display_name:'Fixture Owner'}}};
try{
 for(const width of [1280,390]){
  const ctx=await browser.newContext({viewport:{width,height:844}}),page=await ctx.newPage();
  const errors=[],mutations=[];let failure=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!==base)return route.abort();
   if(!url.pathname.startsWith('/api/'))return route.continue();
   if(req.method()!=='GET'){mutations.push(req.method());return route.abort()}
   const collection=/^\/api\/portfolio\/(\w+)$/.exec(url.pathname)?.[1];
   const card=/^\/api\/rpc\/get_(\w+)_card$/.exec(url.pathname)?.[1];
   return route.fulfill({status:failure||200,contentType:'application/json',body:JSON.stringify(failure?{error:'Unavailable'}:collection?fixtures[collection]??[]:card?cards[card]:{})});
  });
  const overflow=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflow at ${width}: ${page.url()}`);checks++};
  for(const [entity,list] of Object.entries({property:'properties',unit:'units',lease:'leases',tenant:'tenants',owner:'owners'})){
   await page.goto(`${base}/card/${entity}/1`);
   const back=page.getByRole('link',{name:`Back to ${list}`,exact:true});await expect(back).toBeVisible();
   assert.ok((await back.boundingBox()).height>=44);checks++;
   await back.click();await expect(page).toHaveURL(`${base}/portfolio/${list}`);checks++;
   await page.goto(`${base}/card/${entity}/abc`);await expect(back).toBeVisible();await overflow();
  }
  await page.goto(`${base}/portfolio/leases`);
  const input=page.getByRole('textbox',{name:'Search leases',exact:true});await expect(input).toBeVisible();
  const totals=await page.getByTestId('leases-kpis').innerText();
  for(const [query,count] of [['  ALPHA ',1],['OAK',1],['active',2],['2',1],['no-match',0],['',2]]){
   await input.fill(query);await expect(page.getByTestId('leases-match')).toHaveText(`${count} matching of 2 loaded leases.`);
   assert.equal(await page.getByTestId('leases-kpis').innerText(),totals);checks++;
  }
  assert.ok((await input.boundingBox()).height>=44);await input.focus();await expect(input).toBeFocused();await overflow();checks++;
  if(process.env.ECC_BROWSER_SCREENSHOTS)await page.screenshot({path:`${process.env.ECC_BROWSER_SCREENSHOTS}/ecc-leases-${width}.png`,fullPage:true});
  for(const collection of ['tenants','owners']){
   await page.goto(`${base}/portfolio/${collection}`);const search=page.getByRole('textbox',{name:`Search ${collection}`,exact:true});await expect(search).toBeVisible();
   await search.fill('  BETA ');await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Alpha'})).toHaveCount(0);await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Beta'})).toBeVisible();
   await search.fill('');await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Alpha'})).toBeVisible();assert.ok((await search.boundingBox()).height>=44);await overflow();checks+=3;
  }
  await page.goto(`${base}/ops/ai/vacancy-analytics`);await expect(page.getByRole('heading',{name:'Vacancy review',exact:true})).toBeVisible();
  await page.getByLabel('Reported status',{exact:true}).selectOption('Vacant');await expect(page.getByRole('status').filter({hasText:'1 of 2 loaded rows shown.'})).toBeVisible();
  await page.getByRole('button',{name:'Reset filters',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'2 of 2 loaded rows shown.'})).toBeVisible();await overflow();checks+=2;
  for(const collection of ['leases','tenants','owners']){
   await page.goto(`${base}/portfolio/${collection}`);await expect(page.getByRole('textbox',{name:`Search ${collection}`,exact:true})).toBeVisible();failure=403;
   await page.evaluate(async collection=>{const {queryClient}=await import('/src/lib/queryClient.ts');await queryClient.invalidateQueries({queryKey:['portfolio',collection]});},collection);
   await expect(page.getByRole('textbox',{name:`Search ${collection}`,exact:true})).toHaveCount(0);await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Alpha'})).toHaveCount(0);checks+=2;failure=0;
  }
  assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);checks+=2;
  console.log(`PASS desktop/mobile width=${width}; no page errors, mutations or page overflow`);await ctx.close();
 }
 console.log(`PASS ${checks} isolated actual-page checks; not live backend acceptance`);
}finally{await browser.close();server?.kill()}
