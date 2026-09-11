/* Direct + to draft regression. Use a disposable loopback session only.
   NODE_PATH=/path/to/node_modules node tests/simple-add-smoke.cjs http://127.0.0.1:PORT /tmp/simple-add-qa */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const [url,output]=process.argv.slice(2);
if(!url||!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)||/:62031\/?$/.test(url))throw Error('Use a disposable loopback session, never the review canvas.');
const origin=url.replace(/\/$/,''),checks=[],errors=[];
const fixture={schemaVersion:1,revision:1,title:'Fictional direct-add check',question:'What needs investigation?',context:'Disposable test fixture.',nextQuestion:'',nodes:[
{id:'root',parentId:null,label:'What needs investigation?',kind:'question',method:'issue',status:'open',notes:'Keep the original notes.'},
{id:'a',parentId:'root',label:'Understand the queue',kind:'question',status:'open',notes:'Existing human notes.',relation:{type:'part-of'}},
{id:'b',parentId:'root',label:'Check revenue inputs',kind:'metric',method:'driver',status:'open',notes:'Revenue = orders × average order value.',relation:{type:'part-of'}}
],decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}};
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json()}
async function put(value){const old=await read(),r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:old.revision,state:value})});assert.equal(r.status,200);return r.json()}
async function save(p){const wait=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await p.locator('#label').press('Control+Enter');assert.equal((await wait).status(),200);await p.waitForFunction(()=>document.querySelector('#edit-status').textContent==='Saved');return read()}
async function discard(p){await p.locator('#discard').click();await p.locator('#close-details').click();await p.locator('.inspector').waitFor({state:'hidden'})}
(async()=>{
 await fs.mkdir(output,{recursive:true});const baseline=await put(structuredClone(fixture));
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:1400,height:980},reducedMotion:'reduce',hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 await card(page,'a').focus();await card(page,'b').locator('.node-add').hover();await page.waitForTimeout(300);
 assert.equal(await page.locator('.inspector').isHidden(),true,'Hover never creates a draft');assert.equal(await card(page,'a').evaluate(el=>el===document.activeElement),true);assert.deepEqual(await read(),baseline);
 await card(page,'a').locator('.node-add').click();await page.locator('#label').waitFor({state:'visible'});
 assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true,'One + click focuses the editable text');assert.equal(await page.locator('#label').inputValue(),'');assert.equal(await page.locator('#kind').inputValue(),'question');assert.equal(await page.locator('#relation-type').inputValue(),'part-of');assert.equal(await page.locator('#add-menu').isHidden(),true);assert.equal(await page.locator('dialog[open]').count(),0);assert.deepEqual(await read(),baseline);
 checks.push('Hover is passive; one + click opens and focuses the suggested draft without a menu or saved node.');
 await page.locator('#label').fill('  Packing delays may explain the queue.  ');await page.locator('#notes').fill('\n  Check the busy period first.\n');await page.getByRole('combobox',{name:'New thought type'}).selectOption('hypothesis:possible-cause');
 assert.equal(await page.locator('#label').inputValue(),'  Packing delays may explain the queue.  ');assert.equal(await page.locator('#notes').inputValue(),'\n  Check the busy period first.\n');assert.equal(await page.locator('#status').inputValue(),'uncertain');assert.equal(await page.locator('#relation-type').inputValue(),'possible-cause');assert.equal(await page.locator('#kind').isHidden(),true,'The draft type has one visible home');await page.waitForTimeout(1000);assert.deepEqual(await read(),baseline,'A new draft never autosaves');
 await page.screenshot({path:path.join(output,'simple-add-desktop.png')});
 const added=await save(page),child=added.nodes.find(n=>n.parentId==='a');assert.ok(child);assert.equal(child.kind,'hypothesis');assert.equal(child.status,'uncertain');assert.equal(child.relation.type,'possible-cause');assert.equal(child.notes,'\n  Check the busy period first.\n');assert.equal(child.method,undefined);assert.deepEqual(added.nodes.filter(n=>n.id!==child.id),baseline.nodes);assert.equal(await page.locator('#draft-type-row').isHidden(),true);await page.locator('#close-details').click();
 checks.push('Optional contextual type changes preserve human text, use a fitting relationship, and remain unsaved until explicit Add.');
 const undoResponse=page.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await page.locator('#undo').click();assert.equal((await undoResponse).status(),200);assert.deepEqual((await read()).nodes,baseline.nodes);
 await card(page,'b').focus();await page.keyboard.press('a');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('#kind').inputValue(),'metric');assert.equal(await page.locator('#relation-type').inputValue(),'calculated-from');const beforeDiscard=await read();await page.locator('#label').fill('AET remains ordinary text');await page.locator('#label').press('Enter');assert.equal(await page.locator('#label').inputValue(),'AET remains ordinary text\n');await discard(page);assert.deepEqual(await read(),beforeDiscard);
 checks.push('Undo removes the explicit addition; A uses numerical-driver defaults, typing stays text, and discard creates no node.');
 await card(page,'a').click();await page.locator('#notes').fill('New notes before adding to another card.');await card(page,'b').locator('.node-add').click();await page.waitForFunction(()=>document.querySelector('#new-child-hint').textContent.includes('Check revenue inputs')&&document.querySelector('#label').value==='');assert.equal((await read()).nodes.find(n=>n.id==='a').notes,'New notes before adding to another card.');assert.equal(await page.locator('#kind').inputValue(),'metric');await discard(page);
 checks.push('Clicking + on another card safely flushes an existing edit to its original node before opening the new draft.');
 await card(page,'a').locator('.node-add').focus();await page.keyboard.press('Space');await page.locator('#label').fill('Preserve this pending child');const parentEdit=await read();parentEdit.nodes.find(n=>n.id==='a').notes='Agent updated the parent.';await put(parentEdit);await page.waitForFunction(()=>document.querySelector('#edit-status').textContent==='Needs review');assert.equal(await page.locator('#save').isDisabled(),true);assert.equal(await page.locator('#draft-choice').isDisabled(),true);await card(page,'root').locator('.node-add').click();assert.equal(await page.locator('#label').inputValue(),'Preserve this pending child');assert.equal((await read()).nodes.length,3);await discard(page);
 checks.push('Space on + opens the draft; a concurrent parent edit keeps text intact and blocks conflicting Add/type changes.');
 await page.setViewportSize({width:390,height:844});await page.locator('#fit').click();await card(page,'root').locator('.node-add').tap();await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true);const row=await page.locator('#draft-type-row').boundingBox(),saveBox=await page.locator('#save').boundingBox();assert.ok(row.x>=0&&row.x+row.width<=390);assert.ok(saveBox.y+saveBox.height<=844);await page.locator('#label').fill('Small-screen draft');await page.screenshot({path:path.join(output,'simple-add-mobile.png')});await discard(page);
 checks.push('Touch + opens the same direct draft on narrow screens with its optional type and Add action reachable.');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
