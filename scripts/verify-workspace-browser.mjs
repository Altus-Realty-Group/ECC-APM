// Manual, isolated UI acceptance. No live data, provider traffic or API writes.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const base = process.env.ECC_BROWSER_BASE ?? 'http://127.0.0.1:5193';
assert.equal(new URL(base).hostname, '127.0.0.1');
const server=process.env.ECC_BROWSER_BASE?null:spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5193'],{stdio:'ignore'});
let ready=false;
for(let n=0;n<80;n++){try{ready=(await fetch(base)).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100))}
if(!ready){server?.kill();throw new Error('Isolated source host unavailable')}
const out = process.env.ECC_BROWSER_SCREENSHOTS ?? '/tmp/ecc-redesign';
mkdirSync(out,{recursive:true});
const routes = [...readFileSync('src/App.tsx','utf8').matchAll(/<Route path="([^"]+)"/g)].map(m=>m[1].replace(':id','1'));
const sweep=process.env.ECC_BROWSER_ROUTE_SWEEP==='0'?[]:routes;
const browser = await chromium.launch({executablePath:process.env.ECC_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const receipts=[];
const collections={properties:[{id:1,name:'Fixture Property',type:'residential'}],units:[{id:1,unitLabel:'Fixture Unit',propertyName:'Fixture Property',status:'Vacant'}],leases:[{id:1,tenants:['Fixture Alpha'],propertyName:'Fixture Property',status:'active',rent:1000},{id:2,tenants:['Fixture Beta'],propertyName:'Fixture Other',status:'active',rent:2000}],tenants:[{id:1,name:'Fixture Alpha'},{id:2,name:'Fixture Beta'}],owners:[{id:1,name:'Fixture Alpha'},{id:2,name:'Fixture Beta'}]};
const cards={property:{property:{id:1,name:'Fixture Property',type:'residential',address:{}},kpis:{}},unit:{unit:{id:1,unit_label:'Fixture Unit',rent_cents:12345}},lease:{lease:{id:1,rent_cents:12345}},tenant:{tenant:{id:1,display_name:'Fixture Tenant',balance_cents:12345}},owner:{owner:{id:1,display_name:'Fixture Owner'}}};
try {
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  let summaryMode='unavailable', portfolioReady=false;
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!==new URL(base).origin)return route.abort();
   if(/^\/(api|bff)(\/|$)/.test(url.pathname)){
    if(req.method()!=='GET'){writes.push(req.method()+' '+url.pathname);return route.abort()}
    const collection=/^\/api\/portfolio\/(\w+)$/.exec(url.pathname)?.[1];
    const card=/^\/api\/rpc\/get_(\w+)_card$/.exec(url.pathname)?.[1];
    if(portfolioReady&&collection&&collections[collection])return route.fulfill({json:collections[collection]});
    if(portfolioReady&&card&&cards[card])return route.fulfill({json:cards[card]});
    if(url.pathname==='/api/dashboard/kpi/summary'&&summaryMode==='ready')return route.fulfill({json:{propertiesTotal:4,unitsTotal:40,occupancyRate:.9,revenue30dCents:123456,lastUpdated:new Date().toISOString(),series:[{date:'2026-10-01',occupancy:.8},{date:'2026-10-15',occupancy:.9}]}});
    return route.fulfill({status:summaryMode==='denied'?403:503,json:{error:'UNAVAILABLE_TEST_INPUT'}});
   }
   return route.continue();
  });
  for(const path of sweep){
   await page.goto(base+path);await expect(page.locator('.ecc-workspace-bar')).toBeVisible();
   if(path==='/')await expect(page).toHaveURL(base+'/dashboard');
   await expect(page.locator('.ecc-workspace-content')).not.toBeEmpty();
   await expect.poll(()=>page.locator('[aria-busy="true"]').count(),{timeout:10000}).toBe(0);
   const dimensions=await page.evaluate(()=>{const main=document.querySelector('.ecc-main'),content=document.querySelector('.ecc-workspace-content');return {document:document.documentElement.scrollWidth-window.innerWidth,main:main.scrollWidth-main.clientWidth,content:content.scrollWidth-content.clientWidth}});
   const headings=await page.locator('.ecc-workspace-content h1').allTextContents();
   receipts.push({width,path,headings,dimensions});
   console.log('ROUTE',width,path);
   if(Object.values(dimensions).some(n=>n>1))console.log('OVERFLOW',JSON.stringify(receipts.at(-1)));
   if(headings.length!==1)console.log('HEADING',JSON.stringify(receipts.at(-1)));
   if(['/dashboard','/portfolio/properties','/data','/reports/saved','/ops/operations','/systems/integrations'].includes(path))await page.screenshot({path:`${out}/${path.slice(1).replaceAll('/','-')}-${width}.png`,fullPage:true});
  }
  summaryMode='ready';await page.goto(base+'/dashboard');
  await expect(page.getByTestId('kpi.revenue')).toContainText('$1,234.56');
  await expect(page.getByRole('img',{name:'Reported occupancy 90.0 percent'})).toBeVisible();
  await page.getByText('View reported observations',{exact:true}).click();
  await expect(page.getByRole('cell',{name:'2026-10-01',exact:true})).toBeVisible();
  await expect(page.locator('.recharts-line-curve')).toBeVisible();
  const curve=await page.locator('.recharts-line-curve').boundingBox();assert.ok(curve.width>100&&curve.height>5,'Visible chart geometry');
  await page.locator('.ecc-main').evaluate(el=>{el.scrollTop=0});
  await page.screenshot({path:`${out}/dashboard-ready-${width}.png`,fullPage:true});
  summaryMode='denied';await page.getByRole('button',{name:'Refresh figures',exact:true}).click();
  await expect(page.getByTestId('state-denied')).toBeVisible();
  await expect(page.getByTestId('kpi.revenue')).not.toContainText('$1,234.56');
  await expect(page.getByRole('img',{name:'Reported occupancy 90.0 percent'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Income, expenses & cash flow',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Open page',exact:true}).selectOption('/reports/saved');
  await expect(page).toHaveURL(base+'/reports/saved');
  await expect(page.getByRole('heading',{name:'Saved reports',exact:true})).toBeVisible();
  await page.keyboard.press('Tab');
  summaryMode='unavailable';portfolioReady=true;
  for(const entity of Object.keys(cards)){
   await page.goto(`${base}/card/${entity}/1`);
   await expect(page.locator('.ecc-record')).toBeVisible();
   const tabs=page.locator('.ecc-card-tab');const count=await tabs.count();
   for(let i=0;i<count;i++){await tabs.nth(i).focus();await page.keyboard.press('Enter');await expect(tabs.nth(i)).toHaveAttribute('aria-pressed','true');await expect(page.getByTestId('tab-panel')).not.toBeEmpty()}
   await tabs.nth(0).click();
   if(entity==='lease')await expect(page.locator('.ecc-record')).toContainText('$123.45');
   // Unit/Tenant schemas do not promise monetary fields: unsupported test input must stay hidden.
   if(['unit','tenant'].includes(entity))await expect(page.locator('.ecc-record')).not.toContainText('$123.45');
   const list={property:'properties',unit:'units',lease:'leases',tenant:'tenants',owner:'owners'}[entity];
   await expect(page.getByRole('link',{name:`Back to ${list}`,exact:true})).toHaveAttribute('href',`/portfolio/${list}`);
   const overflow=await page.evaluate(()=>document.querySelector('.ecc-main').scrollWidth-document.querySelector('.ecc-main').clientWidth);assert.ok(overflow<=1);
   await page.screenshot({path:`${out}/record-${entity}-${width}.png`,fullPage:true});
  }
  for(const entity of ['leases','tenants','owners']){
   await page.goto(`${base}/portfolio/${entity}`);
   const input=page.getByRole('textbox',{name:`Search ${entity}`,exact:true});await expect(input).toBeVisible();
   const totals=entity==='leases'?await page.getByTestId('leases-kpis').innerText():null;
   await input.fill('BETA');await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Alpha'})).toHaveCount(0);await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Beta'})).toBeVisible();
   if(totals!==null)assert.equal(await page.getByTestId('leases-kpis').innerText(),totals);
   await input.fill('');await expect(page.getByTestId('datatable-row').filter({hasText:'Fixture Alpha'})).toBeVisible();
   await expect(page.getByRole('textbox',{name:'Search table records',exact:true})).toBeVisible();
   const overflow=await page.evaluate(()=>document.querySelector('.ecc-main').scrollWidth-document.querySelector('.ecc-main').clientWidth);assert.ok(overflow<=1);
   await page.screenshot({path:`${out}/loaded-${entity}-${width}.png`,fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log(`PASS width=${width}: ${sweep.length} route states, dashboard figures/history/denial, page switching, 5 loaded cards with keyboard tabs and 3 searchable lists; no page errors or API writes`);
  await ctx.close();
 }
 writeFileSync(`${out}/routes.json`,JSON.stringify(receipts,null,2));
 assert.equal(receipts.filter(r=>Object.values(r.dimensions).some(n=>n>1)).length,0,'Route overflow');
 assert.equal(receipts.filter(r=>r.headings.length!==1).length,0,'One main page heading');
}finally{await browser.close();server?.kill()}
