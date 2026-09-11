/* Focused regression for keyboard shortcuts after inline card controls.
   NODE_PATH=/path/to/node_modules node tests/card-control-keys-smoke.cjs http://127.0.0.1:PORT /tmp/card-key-qa */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const [url,output]=process.argv.slice(2);
if(!url||!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)||/:62031\/?$/.test(url))throw Error('Use a disposable loopback session, never the review canvas.');
const origin=url.replace(/\/$/,''),checks=[],errors=[];
const fixture={schemaVersion:1,revision:1,title:'Fictional keyboard regression',question:'What should we investigate?',context:'Disposable interaction fixture.',nextQuestion:'',nodes:[{id:'root',parentId:null,label:'What should we investigate?',kind:'question',status:'open',notes:'Preserve these notes.'}],decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}};
const card=(page,id)=>page.locator('.tree-node[data-id="'+id+'"]');
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json()}
async function saved(page,action){const pending=page.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await action();assert.equal((await pending).status(),200);return read()}
async function discard(page){if(await page.locator('#discard').isVisible())await page.locator('#discard').click();await page.locator('#close-details').click()}
(async()=>{
 await fs.mkdir(output,{recursive:true});const old=await read();const response=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:old.revision,state:fixture})});assert.equal(response.status,200);
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1400,height:950},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await card(page,'root').waitFor();
  assert.equal(await page.locator('#node-count').textContent(),'1 thought');
  await card(page,'root').locator('.node-type').click();const typed=await saved(page,()=>page.locator('[data-method="issue"]').click());await page.locator('#approach-panel').waitFor({state:'hidden'});
  assert.equal(await card(page,'root').locator('.node-type').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('a');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#new-child-hint').textContent(),'Add under “What should we investigate?”.');assert.equal(await page.locator('#label').inputValue(),'');
  assert.deepEqual(await read(),typed,'Opening a draft via the type control must not change state');
  await page.locator('#label').fill('Investigate delivery');let added=await saved(page,()=>page.locator('#label').press('Control+Enter'));assert.equal(await page.locator('.inspector').isVisible(),true);await page.locator('#close-details').click();await page.locator('.inspector').waitFor({state:'hidden'});assert.equal(added.nodes.length,2);assert.equal(await page.locator('#node-count').textContent(),'2 thoughts');const child=added.nodes.find(n=>n.id!=='root');assert.equal(child.parentId,'root');assert.equal(added.nodes[0].method,'issue');assert.equal(added.nodes[0].notes,fixture.nodes[0].notes);
  checks.push('After selecting a tree type, A on the focused type chip opens a child draft; saving preserves the method and hidden notes. Counts read 1 thought and 2 thoughts.');

  const plus=card(page,child.id).locator('.node-add');await plus.focus();await page.keyboard.press('Enter');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('#add-menu').isHidden(),true);assert.deepEqual(await read(),added);await discard(page);
  await plus.focus();await page.keyboard.press('Space');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true);assert.deepEqual(await read(),added);await discard(page);
  await plus.focus();await page.keyboard.press('ArrowLeft');assert.equal(await plus.evaluate(el=>el===document.activeElement),true,'Arrows on the plus retain the existing control behavior');assert.deepEqual(await read(),added);
  checks.push('Enter and Space on + directly focus an unsaved child draft; discard writes nothing, and arrow keys do not become card-navigation commands.');

  await plus.focus();await page.keyboard.press('Shift+a');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#new-child-hint').textContent(),'Add under “What should we investigate?”.');await discard(page);assert.deepEqual(await read(),added,'Discarding a sibling draft preserves state');
  await card(page,child.id).locator('.node-add').focus();await page.keyboard.press('e');await page.locator('#label').waitFor({state:'visible'});assert.equal(await page.locator('#label').inputValue(),child.label);await page.locator('#close-details').click();
  await card(page,child.id).locator('.node-add').focus();await page.keyboard.press('t');await page.locator('#approach-panel').waitFor({state:'visible'});assert.equal(await page.locator('#approach-scope').textContent(),child.label);await page.keyboard.press('Escape');assert.deepEqual(await read(),added);
  checks.push('Shift+A adds a sibling draft, E edits the owning thought and T opens its tree type from a focused card control, without implicit saves.');

  await card(page,child.id).locator('.node-add').focus();await page.keyboard.press('e');await page.locator('#label').fill('AET is ordinary draft text');await page.locator('#label').press('Enter');assert.equal(await page.locator('#label').inputValue(),'AET is ordinary draft text\n');assert.equal(await page.locator('#approach-panel').isHidden(),true);
  await card(page,'root').locator('.node-type').focus();await page.keyboard.press('a');
  await page.waitForFunction(()=>document.querySelector('#new-child-hint').textContent==='Add under “What should we investigate?”.'&&!document.querySelector('#new-child-hint').hidden);
  added=await read();assert.equal(added.nodes.find(n=>n.id===child.id).label,'AET is ordinary draft text','Moving to another card saves text to its original target');assert.equal(added.nodes.length,2);assert.equal(await page.locator('#label').inputValue(),'','A opens a separate unsaved child draft');await discard(page);assert.deepEqual(await read(),added,'Discarding the new draft keeps the previously saved wording');
  checks.push('Shortcut letters and plain Enter remain text while typing; A on another card flushes the original edit before starting a separate child draft.');

  await card(page,'root').locator('.collapse').focus();await page.keyboard.press('t');await page.locator('#approach-panel').waitFor({state:'visible'});assert.equal(await page.locator('#approach-scope').textContent(),fixture.nodes[0].label);await page.keyboard.press('Escape');assert.deepEqual(await read(),added);
  await page.screenshot({path:path.join(output,'card-controls.png')});
  checks.push('The same letter shortcuts work from the collapse control.');
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
