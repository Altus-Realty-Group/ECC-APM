// Read-only source analysis; writes derived planning CSVs only. No app execution or network.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const root = process.cwd(), out = path.join(root, 'docs/ui-recovery');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = walk(path.join(root,'src')).filter(f=>/\.tsx?$/.test(f));
const cfg = ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const opts = ts.parseJsonConfigFileContent(cfg.config,ts.sys,root).options;
const rel = f=>path.relative(root,f).replaceAll('\\','/');
const models = new Map();
for(const f of files) {
 const source=fs.readFileSync(f,'utf8'), ast=ts.createSourceFile(f,source,ts.ScriptTarget.Latest,true,f.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 const imports=[], exports=[], controls=[];
 const resolve = x=>ts.resolveModuleName(x,f,opts,ts.sys).resolvedModule?.resolvedFileName;
 const visit=n=>{
  if ((ts.isImportDeclaration(n)||ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
   if(!n.isTypeOnly && !n.importClause?.isTypeOnly) {const target=resolve(n.moduleSpecifier.text); if(target?.startsWith(path.join(root,'src')))imports.push(target);}
  }
  if(ts.isCallExpression(n)&&n.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(n.arguments[0])) {const target=resolve(n.arguments[0].text);if(target?.startsWith(path.join(root,'src')))imports.push(target);}
  if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword)) {if(n.name?.text)exports.push(n.name.text);else if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)exports.push(d.name.getText(ast));else if(n.modifiers.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword))exports.push('default');}
  if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)) {
   const tag=n.tagName.getText(ast);
   if(/^(button|a|Link|input|select|textarea|form|details|summary|h[1-3]|svg|table)$|Tab|Chart|Map|Table|Card|Panel|Hero|Rail|Timeline|Funnel|Metric|Kpi/.test(tag)) {
    const attrs=Object.fromEntries(n.attributes.properties.filter(ts.isJsxAttribute).map(a=>[a.name.getText(ast), a.initializer ? ts.isStringLiteral(a.initializer)?a.initializer.text:a.initializer.getText(ast):'true']));
    const parent=ts.isJsxElement(n.parent)?n.parent:undefined;
    let label=attrs['aria-label']||attrs.title||attrs.label||attrs.name||parent?.children.filter(ts.isJsxText).map(t=>t.text.trim()).filter(Boolean).join(' ')||'';
    if(label.length>180)label=label.slice(0,177)+'...';
    let target=attrs.href||attrs.to||attrs.action||'';
    if(/^https?:/.test(target))try{let u=new URL(target);target=u.origin+u.pathname;}catch{target='external URL expression';}
    controls.push({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,tag,label,target,handler:attrs.onClick||attrs.onSubmit||attrs.onChange||'',condition:attrs.disabled||attrs.hidden||'',testId:attrs['data-testid']||''});
   }
  }
  ts.forEachChild(n,visit);
 };visit(ast);models.set(f,{imports:[...new Set(imports)],exports:[...new Set(exports)],controls,source});
}
const reachable=new Set();function add(f){if(reachable.has(f))return;reachable.add(f);for(const i of models.get(f)?.imports??[])add(i);}add(path.join(root,'src/main.tsx'));
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const csv=(name,headers,rows)=>fs.writeFileSync(path.join(out,name),[headers,...rows].map(r=>r.map(quote).join(',')).join('\n')+'\n');
fs.mkdirSync(out,{recursive:true});
csv('source-components.csv',['source_file','entry_import_reachable','exports','local_imports','ui_objects','classification'],[...models].filter(([f])=>f.endsWith('.tsx')).sort().map(([f,m])=>[rel(f),reachable.has(f)?'yes; not proof of mount':'no',m.exports.join('; '),m.imports.map(rel).join('; '),m.controls.length,'source inventory; manual design/mount review required']));
csv('source-controls.csv',['object_id','source_file','source_line','tag','literal_label_or_expression','link_or_target_expression','handler_expression','disabled_or_hidden_expression','test_id'],[...models].sort().flatMap(([f,m])=>m.controls.map((c,i)=>[`SRC:${rel(f)}:${i+1}`,rel(f),c.line,c.tag,c.label,c.target,c.handler,c.condition,c.testId])));
const api=[];for(const[f,m]of models)for(const match of m.source.matchAll(/["'`]((?:\/api\/|\/bff\/)[^"'`\n]*)["'`]/g))api.push([rel(f),match[1],'source reference only; not accepted/live contract proof']);
csv('source-api-references.csv',['source_file','path_or_template','evidence_limit'],api.sort());
fs.writeFileSync(path.join(out,'inventory-manifest.json'),JSON.stringify({schemaVersion:1,sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceScope:'src/**/*.ts and src/**/*.tsx',tsxModules:[...models.keys()].filter(f=>f.endsWith('.tsx')).length,uiObjects:[...models.values()].reduce((a,m)=>a+m.controls.length,0),apiReferences:api.length,limitations:['Static source inventory is not rendered-state, data-authority or user-approval evidence.','Conditional and indirect controls need runtime review.','Repeated runtime rows create more instances than source declarations.','Historical Dropbox archives are outside this source inventory.','External URL queries are omitted.']},null,2)+'\n');
console.log(JSON.stringify({modules:models.size,tsx:[...models.keys()].filter(f=>f.endsWith('.tsx')).length,objects:[...models.values()].reduce((a,m)=>a+m.controls.length,0),apiReferences:api.length}));
const nav=await import('../src/config/navigation.ts');
const navRows=[];for(const s of nav.NAV_SECTIONS){if(s.path)navRows.push([s.title,s.title,s.path,'available navigation']);for(const c of s.children??[])navRows.push([s.title,c.title,c.path,c.unavailable?'planned; not linked':'available navigation']);}for(const h of nav.HIDDEN_ROUTES)navRows.push(['Hidden',h.reason,h.path,'registered; hidden']);
csv('navigation-destinations.csv',['group','title_or_internal_reason','path','current_status'],navRows);
const appFile=path.join(root,'src/App.tsx'), appSource=models.get(appFile).source, appAst=ts.createSourceFile(appFile,appSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX), names=new Map();
for(const n of appAst.statements)if(ts.isImportDeclaration(n)&&n.importClause?.name&&ts.isStringLiteral(n.moduleSpecifier)){const f=ts.resolveModuleName(n.moduleSpecifier.text,appFile,opts,ts.sys).resolvedModule?.resolvedFileName;names.set(n.importClause.name.text,f?rel(f):n.moduleSpecifier.text);}
const routes=[];function routeVisit(n){if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&n.tagName.getText(appAst)==='Route'){const attrs=Object.fromEntries(n.attributes.properties.filter(ts.isJsxAttribute).map(a=>[a.name.getText(appAst),a.initializer?ts.isStringLiteral(a.initializer)?a.initializer.text:a.initializer.getText(appAst).slice(1,-1):'']));routes.push([attrs.path||'(unmatched)',attrs.component||(!attrs.path?'NotFound':'HomeRedirect'),names.get(attrs.component)||'src/App.tsx',attrs.path?.startsWith('/card/')?'asset card':nav.HIDDEN_ROUTES.some(h=>h.path===attrs.path)?'hidden':attrs.path==='/ops/legal/matters/:id'?'legal matter card':attrs.path==='/portfolio/properties/:id'?'duplicate placeholder':attrs.path==='/'?'redirect':!attrs.path?'fallback':'page','source-inspected; visual acceptance pending']);}ts.forEachChild(n,routeVisit);}routeVisit(appAst);
csv('routes.csv',['route','entry_component','entry_source','category','acceptance'],routes);
console.log(JSON.stringify({routes:routes.length,plannedDestinations:nav.PLANNED_DESTINATIONS.length,availableNavigation:nav.navLeafPaths().length,hidden:nav.HIDDEN_ROUTES.length}));
