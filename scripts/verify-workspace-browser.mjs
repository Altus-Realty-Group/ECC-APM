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
const cards={property:{property:{id:1,name:'Fixture Property',type:'residential',address:{}},kpis:{}},unit:{unit:{id:1,unit_label:'Fixture Unit',rent_cents:12345}},lease:{lease:{id:1,rent_cents:12345},unit:{id:3},property:{id:2},tenant:{id:4}},tenant:{tenant:{id:1,display_name:'Fixture Tenant',balance_cents:12345},activeLease:{id:9,status:'ACTIVE'}},owner:{owner:{id:1,display_name:'Fixture Owner'}}};
try {
 for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage();const errors=[],writes=[],reads=[];
  page.on('pageerror',e=>errors.push(e.message));
  let summaryMode='unavailable', portfolioReady=false, expiryMode='off', releaseExpiry;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=type=>parts.find(p=>p.type===type).value;
  const date=new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  const endIn=days=>new Date(date.getTime()+days*86400000).toISOString().slice(0,10);
  const expiryRows=[{id:101,status:'active',end:endIn(10)},{id:102,status:'active',end:endIn(40)},{id:103,status:'active',end:null},{id:104,status:'ended',end:endIn(10)}];
  await page.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!==new URL(base).origin)return route.abort();
   if(/^\/(api|bff)(\/|$)/.test(url.pathname)){
    if(req.method()!=='GET'){writes.push(req.method()+' '+url.pathname);return route.abort()}
    reads.push(url.pathname+url.search);
    if(portfolioReady&&url.pathname.startsWith('/api/entities/'))return route.fulfill({json:[{id:1,name:'Fixture entity'}]});
    if(portfolioReady&&url.pathname==='/api/owners/search')return route.fulfill({json:[{id:1,name:'Fixture owner search'}]});
    const collection=/^\/api\/portfolio\/(\w+)$/.exec(url.pathname)?.[1];
    const card=/^\/api\/rpc\/get_(\w+)_card$/.exec(url.pathname)?.[1];
    if(collection==='leases'&&expiryMode!=='off'){
     if(expiryMode==='paused')return new Promise(resolve=>{releaseExpiry=async()=>{await route.fulfill({json:expiryRows});resolve()}});
     if(expiryMode==='denied')return route.fulfill({status:403,json:{error:'DENIED_TEST_INPUT'}});
     if(expiryMode==='malformed')return route.fulfill({json:[null]});
     if(expiryMode==='empty')return route.fulfill({json:[]});
     return route.fulfill({json:expiryRows});
    }
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
   if(['/dashboard','/portfolio/properties','/data','/reports/saved','/ops/operations','/systems/integrations','/ops/reports','/system/settings'].includes(path))await page.screenshot({path:`${out}/${path.slice(1).replaceAll('/','-')}-${width}.png`,fullPage:true});
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
  summaryMode='unavailable';portfolioReady=true;expiryMode='ready';await page.goto(base+'/dashboard');
  // A separately authorized lease read can show actual dates during a summary outage.
  await expect(page.getByTestId('expiry-due30')).toHaveText('1');
  await expect(page.getByRole('list',{name:'Active lease end-date windows'})).toBeVisible();
  const bars=page.locator('.ecc-expiry-track > span');await expect(bars).toHaveCount(5);
  const bar=await bars.nth(1).boundingBox();assert.ok(bar.width>100&&bar.height>0,'Visible expiry bar geometry');
  const panel=page.getByRole('region',{name:'Upcoming lease expirations'});
  await expect(panel).toContainText('4 loaded rows');
  await expect(panel).toContainText('portfolio completeness and source update time are not reported');
  await panel.screenshot({path:`${out}/dashboard-lease-expiry-${width}.png`});
  expiryMode='paused';await page.getByRole('button',{name:'Refresh expiry records',exact:true}).click();
  await expect(page.getByTestId('expiry-due30')).toHaveCount(0);await expect(page.locator('.ecc-expiry-chart')).toHaveCount(0);
  await expect.poll(()=>typeof releaseExpiry).toBe('function');await releaseExpiry();await expect(page.getByTestId('expiry-due30')).toHaveText('1');
  expiryMode='denied';await page.getByRole('button',{name:'Refresh expiry records',exact:true}).click();
  await expect(panel).toContainText("You don't have access to lease date records.");await expect(bars).toHaveCount(0);
  expiryMode='malformed';await panel.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(panel).toContainText('Lease date records could not be confirmed.');await expect(bars).toHaveCount(0);
  expiryMode='empty';await panel.getByRole('button',{name:'Retry',exact:true}).click();
  await expect(panel).toContainText('No lease records were returned.');await expect(bars).toHaveCount(0);
  expiryMode='ready';await page.getByRole('button',{name:'Refresh expiry records',exact:true}).click();await expect(page.getByTestId('expiry-due30')).toHaveText('1');
  await page.getByRole('link',{name:'Open renewal planning',exact:true}).click();await expect(page).toHaveURL(base+'/ops/ai/renewal-forecasting');
  await expect(page.getByRole('link',{name:'Lease 101',exact:true})).toBeVisible();
  expiryMode='off';
  if(process.env.ECC_BROWSER_DASHBOARD_ONLY==='1'){
   assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
   console.log(`PASS dashboard width=${width}: summary/history and independent lease-expiry bars, refresh suppression, denial, malformed/empty reads and renewal navigation; no page exceptions or API writes`);
   await ctx.close();continue;
  }
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
  // Keyboard sorting uses native buttons and does not change the underlying records.
  await page.getByRole('button',{name:/^Name/}).focus();await page.keyboard.press('Enter');
  await expect(page.locator('th[aria-sort=ascending]')).toContainText('Name');
  await page.keyboard.press('Enter');await expect(page.locator('th[aria-sort=descending]')).toContainText('Name');
  const switchTo=async path=>page.getByRole('combobox',{name:'Open page',exact:true}).selectOption(path);
  await switchTo('/data');await expect(page.getByRole('heading',{name:'ECC Data Hub',exact:true})).toBeVisible();
  const limit=page.getByLabel('Limit:',{exact:true});const before=reads.length;
  await limit.fill('200');await expect.poll(()=>reads.length).toBe(before);
  await page.getByRole('button',{name:'Load records',exact:true}).click();await expect.poll(()=>reads.some(path=>path.includes('/api/entities/owners?')&&path.includes('limit=200'))).toBe(true);
  const submitted=reads.filter(path=>path.startsWith('/api/entities/')).length;await limit.fill('201');await page.getByRole('button',{name:'Load records',exact:true}).click();assert.equal(reads.filter(path=>path.startsWith('/api/entities/')).length,submitted);
  const ownerSearch=page.getByRole('textbox',{name:'Search owners',exact:true});await ownerSearch.fill('PRIOR_SESSION_TEXT');await ownerSearch.press('Enter');await expect.poll(()=>reads.some(path=>path.includes('q=PRIOR_SESSION_TEXT'))).toBe(true);
  const searches=reads.filter(path=>path.includes('q=PRIOR_SESSION_TEXT')).length;
  await page.evaluate(()=>window.dispatchEvent(new Event('ecc:session-boundary')));await expect(page.getByRole('textbox',{name:'Search owners',exact:true})).toHaveValue('');assert.equal(reads.filter(path=>path.includes('q=PRIOR_SESSION_TEXT')).length,searches);
  await switchTo('/ops/reports');await expect(page.getByRole('button',{name:'Download CSV',exact:true})).toBeVisible();
  await page.screenshot({path:`${out}/closure-report-home-${width}.png`,fullPage:true});
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();const download=await downloadEvent;
  const csv=readFileSync(await download.path(),'utf8');assert.match(csv,/Forward-looking information/);assert.match(csv,/All rights reserved/);assert.match(csv,/Fixture Property/);
  await switchTo('/system/settings');await page.getByRole('radio',{name:/Compact/}).check();await expect(page.locator('#ecc-app')).toHaveAttribute('data-density','compact');
  await page.screenshot({path:`${out}/closure-preferences-${width}.png`,fullPage:true});
  await page.reload();await expect(page.getByRole('radio',{name:/Compact/})).toBeChecked();await page.getByRole('button',{name:'Restore default spacing',exact:true}).click();await expect(page.locator('#ecc-app')).toHaveAttribute('data-density','comfortable');
  await page.goto(base+'/card/tenant/1');await expect(page.getByTestId('kpi-active-leases')).toContainText('1');
  await page.getByRole('link',{name:'Lease #9',exact:true}).click();await expect(page).toHaveURL(base+'/card/lease/9');
  await page.getByRole('link',{name:'Property #2',exact:true}).click();await expect(page).toHaveURL(base+'/card/property/2');
  await switchTo('/ops/comms/templates');await page.getByLabel('Template name',{exact:true}).fill('Unsaved fixture draft');
  await switchTo('/dashboard');await page.goBack();await expect(page.getByLabel('Template name',{exact:true})).toHaveValue('Unsaved fixture draft');
  const dialog=page.waitForEvent('dialog');const reload=page.reload().catch(()=>null);const warning=await dialog;assert.equal(warning.type(),'beforeunload');await warning.dismiss();await reload;await expect(page.getByLabel('Template name',{exact:true})).toHaveValue('Unsaved fixture draft');
  await page.evaluate(()=>window.dispatchEvent(new Event('ecc:session-boundary')));await expect(page.getByLabel('Template name',{exact:true})).toHaveValue('');
  await page.screenshot({path:`${out}/closure-email-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log(`PASS width=${width}: ${sweep.length} route states, dashboard figures/history/denial, page switching, 5 loaded cards with keyboard tabs and 3 searchable lists; no page errors or API writes`);
  await ctx.close();
 }
 writeFileSync(`${out}/routes.json`,JSON.stringify(receipts,null,2));
 assert.equal(receipts.filter(r=>Object.values(r.dimensions).some(n=>n>1)).length,0,'Route overflow');
 assert.equal(receipts.filter(r=>r.headings.length!==1).length,0,'One main page heading');
}finally{await browser.close();server?.kill()}
