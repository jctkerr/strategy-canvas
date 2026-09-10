/* Rendered direct-manipulation checks. Use only a disposable session.
   NODE_PATH=/path/to/node_modules node tests/direct-edit-smoke.cjs http://127.0.0.1:PORT /tmp/direct-qa */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url) || /:62031\/?$/.test(url)) throw Error('Use a disposable loopback session, never the review canvas.');
const origin = url.replace(/\/$/, ''), checks = [], errors = [];
const fixture = {
  schemaVersion: 1, revision: 1, title: 'Fictional direct-edit check',
  question: 'How could a fictional shop improve its service?', context: 'Disposable interaction fixture.', nextQuestion: '',
  nodes: [
    {id:'root',parentId:null,label:'Improve service',kind:'question',method:'issue',status:'open',notes:'Preserve root notes.'},
    {id:'a',parentId:'root',label:'Understand waiting',kind:'question',status:'uncertain',notes:'Important hidden notes.',source:'Fictional supplied context.',relation:{type:'part-of'}},
    {id:'b',parentId:'root',label:'Understand delivery',kind:'question',status:'open',notes:'Another branch.',relation:{type:'part-of'}},
    {id:'child',parentId:'a',label:'Waiting-time calculation',kind:'metric',method:'driver',status:'open',notes:'Keep this override.',relation:{type:'part-of'}}
  ],
  decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}
};
async function read() { const r=await fetch(origin+'/api/state'); assert.equal(r.status,200); return r.json(); }
async function put(s) { const before=await read(); const r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state:s})}); assert.equal(r.status,200,await r.clone().text()); return r.json(); }
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
async function saved(p, button='#save') { const request=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT'); await p.locator(button).click(); assert.equal((await request).status(),200); return read(); }
async function closeEditor(p) { if(await p.locator('#main').evaluate(el=>el.classList.contains('inspect-open'))) await p.locator('#close-details').click(); }
async function exportJSON(p,name) { await p.locator('details.export summary').click(); const pending=p.waitForEvent('download'); await p.locator('[data-export="json"]').click(); const file=path.join(output,name); await(await pending).saveAs(file); return JSON.parse(await fs.readFile(file,'utf8')); }
(async()=>{
  await fs.mkdir(output,{recursive:true});
  await put(fixture);
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1400,height:950},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message)); await page.goto(origin);
    const initial=await read();
    assert.equal(await page.locator('#quick-start').isHidden(),true);
    await card(page,'a').click();
    assert.equal(await page.locator('#label').isVisible(),true,'A card opens its editor directly');
    assert.equal(await page.locator('#notes').isVisible(),false,'Metadata stays behind Details');
    await page.locator('#label').fill('Understand queueing');
    const renamed=await saved(page);
    const actual=renamed.nodes.find(n=>n.id==='a'), expected={...initial.nodes.find(n=>n.id==='a'),label:'Understand queueing'};
    assert.deepEqual(actual,expected,'A label-only edit must retain hidden metadata');
    checks.push('Click edits directly; label changes preserve hidden notes, source, status and relationship.');

    await closeEditor(page); await page.locator('#fit').click();
    await card(page,'b').locator('.node-add').click();
    assert.equal((await read()).revision,renamed.revision,'Add opens a draft only');
    await page.locator('#label').fill('Check delivery promises');
    const added=await saved(page), node=added.nodes.find(n=>n.label==='Check delivery promises');
    assert.equal(node.parentId,'b','Plus must add to the clicked card, not the prior selection');
    assert.ok(node.relation?.type); assert.notEqual(node.status,'supported');
    assert.deepEqual(added.nodes.find(n=>n.id==='a'),actual);
    await closeEditor(page); await page.locator('#fit').click();
    const beforeToggle=await read();
    await card(page,'b').locator('.collapse').click();
    assert.equal(await card(page,node.id).count(),0);
    assert.deepEqual(await read(),beforeToggle,'Collapse must never add or save a node');
    await card(page,'b').locator('.collapse').click();
    assert.equal(await card(page,node.id).count(),1);
    checks.push('Plus adds beneath its own card; the separate chevron only collapses or expands.');

    await card(page,'b').locator('.node-add').focus(); await page.keyboard.press('Enter');
    await page.locator('#label').fill('Keyboard draft');
    await card(page,'root').locator('.node-add').click();
    assert.equal(await page.locator('#label').inputValue(),'Keyboard draft');
    assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'),'b');
    assert.deepEqual(await read(),beforeToggle);
    await page.locator('#discard').click(); await closeEditor(page);
    checks.push('Keyboard Add works, and another card cannot steal an unsaved draft or change its parent.');

    await card(page,'a').click(); await card(page,'a').locator('.node-type').click();
    assert.equal(await page.locator('#method-tasks button[data-method]').count(),9);
    assert.equal(await page.locator('#method-choice').isVisible(),false);
    const chooser=await page.locator('#approach-panel').boundingBox();
    assert.ok(chooser.height<650,'The default chooser should fit without a long explanatory page');
    assert.equal(await page.locator('#approach-panel').evaluate(el=>el.tagName),'SECTION');
    assert.equal(await page.locator('#approach-panel').getAttribute('role'),'region');
    assert.equal(await page.locator('dialog[open], [aria-modal="true"]:visible').count(),0,'The chooser must not make the canvas modal');
    const anchor=await card(page,'a').locator('.node-type').boundingBox();
    assert.ok(Math.abs(chooser.x-anchor.x)<350 && Math.abs(chooser.y-anchor.y)<chooser.height+50,'Chooser stays beside its branch control');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#approach-panel').isHidden(),true);
    assert.equal(await card(page,'a').locator('.node-type').evaluate(el=>el===document.activeElement),true,'Escape returns focus to the branch control');
    assert.deepEqual(await read(),beforeToggle,'Escape must not save any change');
    await card(page,'a').locator('.node-type').click();
    await page.locator('#question').click();
    assert.equal(await page.locator('#approach-panel').isHidden(),true,'Clicking the canvas outside dismisses the chooser');
    assert.deepEqual(await read(),beforeToggle,'Outside dismissal must not save any change');
    checks.push('The branch chooser is anchored and nonmodal; Escape returns focus and outside dismissal writes nothing.');
    await card(page,'a').locator('.node-type').click();
    assert.ok((await page.locator('#approach-panel').innerText()).trim().split(/\s+/).length<150,'Default chooser copy remains brief');
    const changed=await saved(page,'#method-tasks [data-method="hypothesis"]');
    await page.locator('#approach-panel').waitFor({state:'hidden'});
    assert.equal(changed.nodes.find(n=>n.id==='a').method,'hypothesis');
    assert.equal(changed.nodes.find(n=>n.id==='root').method,'issue');
    assert.equal(changed.nodes.find(n=>n.id==='child').method,'driver');
    checks.push('One click applies a type to the selected branch, closes the chooser and preserves deeper overrides.');

    const beforePending=await read();
    let releaseResponse, responseHeld;
    const responseGate=new Promise(resolve=>{releaseResponse=resolve;});
    const held=new Promise(resolve=>{responseHeld=resolve;});
    const holdTypeSave=async route=>{
      if(route.request().method()!=='PUT')return route.continue();
      const response=await route.fetch();
      responseHeld();
      await responseGate;
      await route.fulfill({response});
    };
    await page.route('**/api/state',holdTypeSave);
    try {
      await card(page,'a').locator('.node-type').click();
      const response=page.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');
      await page.locator('#method-tasks [data-method="solution"]').click();
      await Promise.race([held,new Promise((_,reject)=>setTimeout(()=>reject(Error('Type save did not reach the held response')),10000))]);
      assert.equal(await page.locator('#edit-form').evaluate(el=>el.inert),true,'The visible editor must pause during the type save');
      await card(page,'b').click();
      await card(page,'root').locator('.node-add').click();
      assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'),'a','Pending save cannot switch the edit target or start an Add draft');
      await page.locator('#label').focus();
      assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),false,'An inert editor cannot accept focus while the response is pending');
      await page.keyboard.type('This input must not replace the thought');
      assert.equal(await page.locator('#label').inputValue(),beforePending.nodes.find(n=>n.id==='a').label);
      const pendingState=await read(), expectedPending=structuredClone(beforePending);
      expectedPending.revision+=1; expectedPending.nodes.find(n=>n.id==='a').method='solution';
      assert.deepEqual(pendingState,expectedPending,'Only the selected type save can reach storage while the response is held');
      releaseResponse();
      assert.equal((await response).status(),200);
      await page.waitForFunction(()=>!document.querySelector('#edit-form').inert);
      await page.locator('#label').fill('Wording edited after the type save');
      const resumed=await saved(page);
      assert.equal(resumed.nodes.find(n=>n.id==='a').label,'Wording edited after the type save');
      assert.equal(resumed.nodes.find(n=>n.id==='a').notes,beforePending.nodes.find(n=>n.id==='a').notes);
    } finally {
      releaseResponse();
      await page.unroute('**/api/state',holdTypeSave);
    }
    checks.push('A delayed type save pauses selection and editing; after it finishes, fresh wording saves with hidden notes preserved.');

    await page.locator('#label').fill('Unsaved local wording');
    const external=await read(); external.nodes.find(n=>n.id==='a').notes='New notes from another editor.'; await put(external);
    await page.locator('#conflict').waitFor({state:'visible'});
    assert.equal(await page.locator('#save').isDisabled(),true);
    assert.equal(await page.locator('#label').inputValue(),'Unsaved local wording');
    assert.equal((await read()).nodes.find(n=>n.id==='a').notes,'New notes from another editor.');
    await page.locator('#discard').click();
    assert.equal(await page.locator('#notes').inputValue(),'New notes from another editor.');
    await page.locator('#label').fill('Latest local wording');
    const unrelated=await read(); unrelated.nodes.find(n=>n.id==='b').notes='Unrelated update.'; await put(unrelated);
    await page.waitForFunction(()=>document.querySelector('#save').disabled===false);
    await page.waitForTimeout(2200);
    const merged=await saved(page);
    assert.equal(merged.nodes.find(n=>n.id==='a').notes,'New notes from another editor.');
    assert.equal(merged.nodes.find(n=>n.id==='b').notes,'Unrelated update.');
    checks.push('A same-node conflict blocks stale hidden fields; unrelated remote edits still merge safely.');

    await closeEditor(page);
    await page.locator('details.export summary').click(); const pending=page.waitForEvent('download');
    await page.locator('[data-export="html"]').click(); const html=path.join(output,'direct.html'); await(await pending).saveAs(html);
    const offline=await browser.newPage({viewport:{width:1400,height:950}}); offline.on('pageerror',e=>errors.push(e.message));
    await offline.goto(pathToFileURL(html).href);
    assert.equal(await offline.locator('dialog[open]').count(),0);
    assert.equal(await offline.locator('#quick-start').isHidden(),true);
    await card(offline,'b').locator('.node-add').click(); await offline.locator('#label').fill('Offline thought');
    await offline.locator('#save').click(); await offline.locator('#discard').waitFor({state:'hidden'});
    const exported=await exportJSON(offline,'offline.json');
    assert.equal(exported.nodes.find(n=>n.label==='Offline thought').parentId,'b');
    assert.deepEqual(await read(),merged,'Offline edits must not change the live session');
    checks.push('Standalone export keeps direct editing and the complete state without changing the live session.');

    await page.setViewportSize({width:390,height:844}); await page.locator('#fit').click();
    await card(page,'a').click(); await card(page,'a').locator('.node-type').click();
    const box=await page.locator('#approach-panel').boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=391&&box.y+box.height<=845);
    await page.screenshot({path:path.join(output,'mobile-tree-types.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#approach-panel').isHidden(),true);
    assert.equal(await card(page,'a').locator('.node-type').evaluate(el=>el===document.activeElement),true);
    await closeEditor(page);
    await page.setViewportSize({width:1400,height:950}); await page.locator('#fit').click();
    await page.screenshot({path:path.join(output,'direct-canvas.png')});
    await card(page,'a').click(); await card(page,'a').locator('.node-type').click();
    await page.screenshot({path:path.join(output,'tree-types.png')});
    assert.deepEqual(errors,[]); checks.push('The direct controls and short chooser work at 390px without script errors.');
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks},null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
