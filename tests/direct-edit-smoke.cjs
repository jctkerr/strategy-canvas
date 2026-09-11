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
    {id:'a',parentId:'root',label:'Understand waiting',kind:'question',status:'uncertain',notes:'Important hidden notes.',source:'\n  Fictional supplied context.\n',relation:{type:'part-of'}},
    {id:'b',parentId:'root',label:'Understand delivery',kind:'question',status:'open',notes:'Another branch.',relation:{type:'part-of'}},
    {id:'child',parentId:'a',label:'Waiting-time calculation',kind:'metric',method:'driver',status:'open',notes:'Keep this override.',relation:{type:'part-of'}}
  ],
  decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}
};
async function read() { const r=await fetch(origin+'/api/state'); assert.equal(r.status,200); return r.json(); }
async function put(s) { const before=await read(); const r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state:s})}); assert.equal(r.status,200,await r.clone().text()); return r.json(); }
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
const choices=p=>p.locator('#add-choices [role="menuitem"][data-choice]');
async function chooseDefault(p,id){await card(p,id).locator('.node-add').click();await choices(p).first().click();}
async function saved(p, button='#save') {
  if(button==='#save'&&await p.locator(button).isDisabled()){
    await p.waitForFunction(()=>/^saved/i.test(document.querySelector('#edit-status').textContent));
  }else{
    const request=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');
    await p.locator(button).click();assert.equal((await request).status(),200);
  }
  if(button==='#save'){await p.locator('#close-details').click();await p.locator('.inspector').waitFor({state:'hidden'});}
  return read();
}
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
    assert.equal(await page.getByLabel('Notes',{exact:true}).isVisible(),true,'A card exposes its working notes immediately');
    assert.equal(await page.locator('#notes').inputValue(),'Important hidden notes.','The visible notes belong to the selected card');
    assert.equal(await page.locator('#kind').isVisible(),false,'Routine editing shows no card-kind selector');
    assert.equal(await page.locator('#source').isVisible(),false,'Source details do not compete with working notes');
    assert.equal(await page.locator('.inspector textarea:visible, .inspector input:visible, .inspector select:visible').count(),2,'Routine editing exposes the thought and working notes');
    const editor=await page.locator('.inspector').boundingBox(), mainArea=await page.locator('#main').boundingBox();
    assert.ok(editor.width<=420&&editor.width>=300,'The notes panel leaves most of the desktop canvas available');
    assert.ok(editor.x>=0&&editor.y>=0&&editor.x+editor.width<=1401&&editor.y+editor.height<=951,'The editor remains within the viewport');
    assert.ok(1400-(editor.x+editor.width)<=16,'Working notes dock at the right edge');
    assert.ok(Math.abs(editor.y-mainArea.y)<=16&&Math.abs(editor.height-mainArea.height)<=32,'The desktop notes panel uses the available height below the header');
    assert.equal(await page.locator('dialog[open], [aria-modal="true"]:visible').count(),0,'Editing keeps the canvas nonmodal');
    await page.screenshot({path:path.join(output,'working-notes-desktop.png')});
    await page.locator('#label').fill('Understand queueing');
    const renamed=await saved(page);
    const actual=renamed.nodes.find(n=>n.id==='a');
    const expected={...initial.nodes.find(n=>n.id==='a'),label:'Understand queueing'};
    assert.deepEqual(actual,expected,'A label-only edit must retain notes and hidden metadata');
    assert.equal(actual.source,'\n  Fictional supplied context.\n','Saving the thought preserves source formatting exactly');
    assert.equal(await card(page,'a').evaluate(el=>el===document.activeElement),true,'Explicitly closing the saved editor returns focus to its card');
    checks.push('Notes open immediately in a nonmodal right panel; a flushed label edit preserves notes and metadata, and explicit Close returns focus to its card.');

    await closeEditor(page); await page.locator('#fit').click();
    await card(page,'a').focus();
    const hoverSelection=await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id');
    await card(page,'b').locator('.node-add').hover();
    await page.locator('#add-menu').waitFor({state:'visible'});
    assert.equal(await page.locator('#add-menu').getAttribute('role'),'menu');
    assert.equal(await card(page,'b').locator('.node-add').getAttribute('aria-haspopup'),'menu');
    assert.equal(await card(page,'b').locator('.node-add').getAttribute('aria-controls'),'add-menu');
    assert.equal(await card(page,'b').locator('.node-add').getAttribute('aria-expanded'),'true');
    assert.equal(await card(page,'a').evaluate(el=>el===document.activeElement),true,'Hover must not steal keyboard focus');
    assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'),hoverSelection,'Hover must not select the card');
    assert.equal(await page.locator('.inspector').isHidden(),true,'Hover must not open an editor');
    assert.deepEqual(await read(),renamed,'Hover writes nothing');
    const issueChoices=await choices(page).allTextContents();
    assert.ok(issueChoices.length>=2&&issueChoices.length<=5,'Offer a short list of appropriate choices');
    assert.ok(issueChoices.every(label=>label.trim().length>0&&label.trim().split(/\s+/).length<=10),'Choice labels are short and readable');
    assert.equal(await page.locator('dialog[open], [aria-modal="true"]:visible').count(),0,'Add choices stay nonmodal');
    await choices(page).first().hover();
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#add-menu').isVisible(),true,'Moving from the plus into its menu must keep it open');
    await page.screenshot({path:path.join(output,'contextual-add-desktop.png')});
    await page.locator('#question').click();
    assert.equal(await page.locator('#add-menu').isHidden(),true,'Outside click dismisses a hover menu');
    assert.deepEqual(await read(),renamed,'Dismissal writes nothing');
    await card(page,'child').locator('.node-add').click();
    const driverChoices=await choices(page).allTextContents();
    assert.notDeepEqual(driverChoices,issueChoices,'A metric in a driver branch gets different options from an issue question');
    assert.equal(await choices(page).first().evaluate(el=>el===document.activeElement),true,'Click focuses the first menu option');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#add-menu').isHidden(),true);
    assert.equal(await card(page,'child').locator('.node-add').evaluate(el=>el===document.activeElement),true,'Escape returns focus to the invoking plus');
    assert.deepEqual(await read(),renamed,'Opening and escaping never changes a framework or state');
    checks.push('Hover shows a short contextual nonmodal menu without stealing focus, selection or storage; pointer travel works and outside/Escape dismiss safely.');

    await chooseDefault(page,'b');
    assert.equal(await page.locator('#add-menu').isHidden(),true,'Choosing closes the menu');
    assert.equal(await page.locator('#kind').inputValue(),'question','The first issue-tree option keeps the existing question default');
    assert.equal(await page.locator('#relation-type').inputValue(),'part-of','The default keeps its valid parent connection');
    assert.equal((await read()).revision,renamed.revision,'Choosing Add opens a draft only');
    await page.locator('#label').fill('Check delivery promises');
    const added=await saved(page), node=added.nodes.find(n=>n.label==='Check delivery promises');
    assert.equal(node.parentId,'b','Plus must add to the clicked card, not the prior selection');
    assert.equal(node.kind,'question'); assert.equal(node.relation?.type,'part-of'); assert.notEqual(node.status,'supported');
    assert.equal(node.method,undefined,'Choosing a child never automatically applies a new tree type');
    assert.equal(added.nodes.find(n=>n.id==='root').method,'issue');
    assert.equal(added.nodes.find(n=>n.id==='child').method,'driver');
    assert.equal(await card(page,node.id).evaluate(el=>el===document.activeElement),true,'Adding returns keyboard focus to the new card');
    assert.deepEqual(added.nodes.find(n=>n.id==='a'),actual);
    await closeEditor(page); await page.locator('#fit').click();
    const beforeToggle=await read();
    await card(page,'b').locator('.collapse').click();
    assert.equal(await card(page,node.id).count(),0);
    assert.deepEqual(await read(),beforeToggle,'Collapse must never add or save a node');
    await card(page,'b').locator('.collapse').click();
    assert.equal(await card(page,node.id).count(),1);
    checks.push('The first contextual choice opens an unsaved suitable child beneath its own card; saving preserves frameworks, while the separate chevron only collapses or expands.');

    await card(page,'b').locator('.node-add').focus(); await page.keyboard.press('Enter');
    assert.equal(await choices(page).first().evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await choices(page).nth(1).evaluate(el=>el===document.activeElement),true,'Down moves through contextual choices');
    await page.keyboard.press('ArrowUp');
    assert.equal(await choices(page).first().evaluate(el=>el===document.activeElement),true,'Up returns to the default choice');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#label').evaluate(el=>el===document.activeElement),true,'Keyboard choice goes straight to writing');
    await page.locator('#label').fill('Keyboard draft');
    await page.waitForTimeout(1100);
    assert.deepEqual(await read(),beforeToggle,'A new child remains an explicit Add draft after the autosave delay');
    await card(page,'root').locator('.node-add').click();
    assert.equal(await page.locator('#label').inputValue(),'Keyboard draft');
    assert.equal(await page.locator('#add-menu').isHidden(),true,'A dirty draft prevents another contextual menu from opening');
    assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'),'b');
    assert.deepEqual(await read(),beforeToggle);
    await page.locator('#discard').click(); await closeEditor(page);
    await card(page,'b').focus(); await page.keyboard.press('a');
    assert.equal(await page.locator('#add-menu').isHidden(),true,'A keeps the direct quick-add path');
    assert.equal(await page.locator('#label').isVisible(),true);
    assert.equal(await page.locator('#kind').inputValue(),'question');
    assert.deepEqual(await read(),beforeToggle,'Quick add is also an unsaved draft');
    await page.locator('#discard').click(); await closeEditor(page);
    checks.push('Keyboard plus, arrows and Enter choose an option; A remains quick add, and another card cannot steal an unsaved draft or change its parent.');

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
    checks.push('A delayed type save pauses selection and editing; after it finishes, fresh wording saves with working notes preserved.');

    const merged=await read();

    await closeEditor(page);
    await page.locator('details.export summary').click(); const pending=page.waitForEvent('download');
    await page.locator('[data-export="html"]').click(); const html=path.join(output,'direct.html'); await(await pending).saveAs(html);
    const offline=await browser.newPage({viewport:{width:1400,height:950}}); offline.on('pageerror',e=>errors.push(e.message));
    await offline.goto(pathToFileURL(html).href);
    assert.equal(await offline.locator('dialog[open]').count(),0);
    assert.equal(await offline.locator('#quick-start').isHidden(),true);
    await chooseDefault(offline,'b'); await offline.locator('#label').fill('Offline thought');
    await offline.getByLabel('Notes',{exact:true}).fill('Portable working notes.');
    await offline.locator('#save').click(); await offline.locator('#discard').waitFor({state:'hidden'});
    const exported=await exportJSON(offline,'offline.json');
    assert.equal(exported.nodes.find(n=>n.label==='Offline thought').parentId,'b');
    assert.equal(exported.nodes.find(n=>n.label==='Offline thought').notes,'Portable working notes.');
    assert.deepEqual(await read(),merged,'Offline edits must not change the live session');
    checks.push('Standalone export keeps direct editing and the complete state without changing the live session.');

    await page.setViewportSize({width:390,height:844}); await page.locator('#fit').click();
    await card(page,'a').click();
    const mobileEditor=await page.locator('.inspector').boundingBox();
    const mobileMain=await page.locator('#main').boundingBox();
    assert.ok(mobileEditor.x>=0&&mobileEditor.y>=0&&mobileEditor.x+mobileEditor.width<=391&&mobileEditor.y+mobileEditor.height<=845,'The notes editor fits a phone-width viewport');
    assert.ok(mobileEditor.width>=365&&mobileEditor.height<=844*.6,'The phone editor is a bounded full-width sheet');
    assert.ok(Math.abs(mobileEditor.y+mobileEditor.height-(mobileMain.y+mobileMain.height))<=16,'The phone notes sheet docks at the bottom of the workspace');
    assert.equal(await page.getByLabel('Notes',{exact:true}).isVisible(),true,'Phone users can reach working notes without opening Details');
    const phoneNote='Mobile note: inspect the actual queue before adding another till.';
    await page.locator('#notes').fill(phoneNote);
    await page.locator('#notes').press('End');
    const mobileSave=await page.locator('#save').boundingBox();
    assert.ok(mobileSave.x>=0&&mobileSave.y>=mobileEditor.y&&mobileSave.x+mobileSave.width<=391&&mobileSave.y+mobileSave.height<=845,'Save remains reachable while editing notes on a phone');
    assert.equal(await page.locator('#save').isVisible(),true);
    await page.screenshot({path:path.join(output,'working-notes-mobile.png')});
    const mobileSaved=await saved(page);
    assert.equal(mobileSaved.nodes.find(n=>n.id==='a').notes,phoneNote,'A phone note saves to the selected card');
    await card(page,'a').locator('.node-type').click();
    const box=await page.locator('#approach-panel').boundingBox();
    assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=391&&box.y+box.height<=845);
    await page.screenshot({path:path.join(output,'mobile-tree-types.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#approach-panel').isHidden(),true);
    assert.equal(await card(page,'a').locator('.node-type').evaluate(el=>el===document.activeElement),true);
    await closeEditor(page); await page.locator('#fit').click();
    const mobileBefore=await read();
    const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    phone.on('pageerror',e=>errors.push(e.message)); await phone.goto(origin); await phone.locator('#fit').tap();
    await card(phone,'root').locator('.node-add').tap();
    const mobileMenu=await phone.locator('#add-menu').boundingBox();
    assert.ok(mobileMenu.x>=0&&mobileMenu.y>=0&&mobileMenu.x+mobileMenu.width<=391&&mobileMenu.y+mobileMenu.height<=845,'Contextual add fits a phone-width viewport');
    for(const option of await choices(phone).all()){
      const bounds=await option.boundingBox();
      assert.ok(bounds.height>=36,'Phone options have usable tap targets');
      assert.ok((await option.innerText()).trim(),'Every touch option has a visible label');
    }
    await phone.screenshot({path:path.join(output,'contextual-add-mobile.png')});
    await choices(phone).first().tap();
    assert.equal(await phone.locator('#label').isVisible(),true,'Tap has the complete add flow without needing hover');
    assert.deepEqual(await read(),mobileBefore,'A phone tap opens an unsaved draft');
    await phone.locator('#discard').tap(); await phone.close();
    await page.setViewportSize({width:1400,height:950}); await page.locator('#fit').click();
    await page.screenshot({path:path.join(output,'direct-canvas.png')});
    await card(page,'a').click(); await card(page,'a').locator('.node-type').click();
    await page.screenshot({path:path.join(output,'tree-types.png')});
    assert.deepEqual(errors,[]); checks.push('The direct controls and short chooser work at 390px without script errors.');

    await page.keyboard.press('Escape'); await closeEditor(page);
    const growth=structuredClone(fixture);
    growth.nodes=[
      {id:'root',parentId:null,label:'How could revenue grow?',kind:'question',method:'solution',status:'open',notes:'Fictional growth example.'},
      {id:'economics',parentId:'root',label:'Revenue calculation',kind:'metric',method:'driver',status:'open',notes:'Preserve this numerical branch.'},
      {id:'customers',parentId:'economics',label:'Paying customers',kind:'metric',status:'open',notes:'Count per year.',relation:{type:'calculated-from'}},
      {id:'explore-driver',parentId:'root',label:'Explore customer retention',kind:'driver',method:'exploration',status:'open',notes:'No automatic method change.'},
      {id:'inherited-driver',parentId:'explore-driver',label:'Improve first-month retention',kind:'driver',status:'open',notes:'Inherited exploration stays unchanged.'}
    ];
    const beforeDriver=await put(growth); await page.reload(); await card(page,'root').waitFor();
    await card(page,'root').locator('.node-add').click();
    assert.ok((await choices(page).allTextContents()).includes('Solution'));
    await page.getByRole('menuitem',{name:'Driver',exact:true}).click();
    assert.equal(await page.locator('#kind').inputValue(),'driver');
    assert.equal(await page.locator('#relation-type').inputValue(),'could-achieve');
    assert.deepEqual(await read(),beforeDriver,'Choosing Driver opens a draft without changing the method');
    await page.locator('#label').fill('Retain more customers');
    const withDriver=await saved(page),driver=withDriver.nodes.find(n=>n.label==='Retain more customers');
    assert.equal(driver.kind,'driver'); assert.equal(driver.method,undefined); assert.equal(driver.status,'open');
    assert.equal(await card(page,driver.id).locator('.node-kind').textContent(),'DRIVER');
    await card(page,driver.id).focus(); await page.keyboard.press('a');
    assert.equal(await page.locator('#kind').inputValue(),'solution','A qualitative driver suggests a solution, not an input metric or hypothesis');
    assert.equal(await page.locator('#relation-type').inputValue(),'could-achieve');
    await page.locator('#label').fill('Improve onboarding');
    const withSolution=await saved(page),solution=withSolution.nodes.find(n=>n.label==='Improve onboarding');
    assert.equal(solution.parentId,driver.id); assert.equal(solution.method,undefined);
    assert.deepEqual(withSolution.nodes.find(n=>n.id==='economics'),beforeDriver.nodes.find(n=>n.id==='economics'));
    assert.deepEqual(withSolution.nodes.find(n=>n.id==='customers'),beforeDriver.nodes.find(n=>n.id==='customers'));
    const undone=await saved(page,'#undo');
    assert.deepEqual(undone.nodes,withDriver.nodes,'Undo removes the new solution while preserving the driver and numerical subtree');
    await page.locator('#expand').click(); await page.locator('#fit').click();
    for(const id of ['explore-driver','inherited-driver']){
      await card(page,id).focus(); await page.keyboard.press('t');
      assert.equal(await page.locator('#method-tasks [data-suggested="true"]').getAttribute('data-method'),'solution');
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(await read(),undone,'Suggestions do not apply tree types');
    await card(page,'economics').locator('.node-add').click();
    assert.equal(await choices(page).first().textContent(),'Input metric','Numerical Driver trees retain input metrics');
    assert.ok(!(await choices(page).allTextContents()).includes('Driver'));
    await page.keyboard.press('Escape');
    await page.screenshot({path:path.join(output,'qualitative-drivers.png')});
    checks.push('Solution menus add qualitative Driver cards; A adds a proposed solution, Undo preserves the tree, exploration suggests Solution, and numerical Driver subtrees still add metrics.');
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks},null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
