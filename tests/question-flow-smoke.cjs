/* Question-first and keyboard interaction checks. Use only a disposable session.
   NODE_PATH=/path/to/node_modules node tests/question-flow-smoke.cjs http://127.0.0.1:PORT /tmp/question-flow-qa */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url) || /:62031\/?$/.test(url)) throw Error('Use a disposable loopback session, never the review canvas.');
const origin=url.replace(/\/$/, ''), checks=[], errors=[];
const fixture={
  schemaVersion:1, revision:1, title:'Fictional question-flow check',
  question:'How could a fictional bookshop make its spare room useful?',
  context:'Disposable interaction fixture.', nextQuestion:'',
  nodes:[
    {id:'root',parentId:null,label:'Explore the spare room',kind:'question',status:'open',notes:'Keep the deliberately short root label.'},
    {id:'metric',parentId:'root',label:'Workshop contribution',kind:'metric',status:'open',notes:'No measured values yet.',relation:{type:'idea'}},
    {id:'hypothesis',parentId:'root',label:'Readers may want an evening group',kind:'hypothesis',status:'uncertain',notes:'An untested explanation.',relation:{type:'idea'}},
    {id:'issue',parentId:'root',label:'What would make delivery workable?',kind:'question',method:'issue',status:'open',notes:'Deliberate analytical branch.',relation:{type:'idea'}},
    {id:'inherited',parentId:'issue',label:'Weekly staff hours',kind:'metric',status:'open',notes:'Keep the analytical approach inherited here.',relation:{type:'part-of'}},
    {id:'explicit',parentId:'root',label:'Cost of each option',kind:'metric',method:'decision',status:'open',notes:'Deliberate local override.',relation:{type:'idea'}}
  ],
  decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}
};
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json();}
async function put(state){const before=await read();const r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state})});assert.equal(r.status,200,await r.clone().text());return r.json();}
async function save(p, action){const pending=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await action();assert.equal((await pending).status(),200);return read();}
async function exportJSON(p,name){await p.locator('details.export summary').click();const pending=p.waitForEvent('download');await p.locator('[data-export="json"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return JSON.parse(await fs.readFile(file,'utf8'));}
async function closeEditor(p){if(await p.locator('#main').evaluate(el=>el.classList.contains('inspect-open')))await p.locator('#close-details').click();}
async function focusCard(p,id){await closeEditor(p);await p.locator('#fit').click();await card(p,id).focus();}
async function isFocused(p,id){assert.equal(await card(p,id).evaluate(el=>el===document.activeElement),true,'Expected focus on '+id);}
async function fresh(p,state=fixture){await put(structuredClone(state));await p.reload();await card(p,'root').waitFor();return read();}

(async()=>{
  await fs.mkdir(output,{recursive:true});
  await put(structuredClone(fixture));
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1500,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(10000);
    page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await card(page,'root').waitFor();

    const starter=await browser.newPage({viewport:{width:1400,height:950},reducedMotion:'reduce'});starter.setDefaultTimeout(10000);
    starter.on('pageerror',e=>errors.push(e.message));
    await starter.goto(pathToFileURL(path.resolve(__dirname,'../docs/new.html')).href);
    assert.equal(await starter.locator('#start-question').getAttribute('maxlength'),'240');
    assert.equal(await starter.locator('.tree-node').count(),0,'The blank starter contains no invented case');
    await starter.locator('#start-question').fill('   ');
    await starter.locator('#start-question').press('Control+Enter');
    assert.equal(await starter.locator('.tree-node').count(),0,'Whitespace cannot start a canvas');
    if(!await starter.locator('#start-submit').isDisabled())await starter.locator('#start-submit').click();
    assert.equal(await starter.locator('.tree-node').count(),0,'The ordinary submit path also rejects whitespace');
    const question='How could we make the spare room useful?';
    await starter.locator('#start-question').fill(question);await starter.locator('#start-submit').click();
    await starter.locator('.tree-node').waitFor();
    const started=await exportJSON(starter,'started.json');
    assert.equal(started.question,question);assert.equal(started.nodes.length,1);
    assert.equal(started.nodes[0].label,question);assert.equal(started.nodes[0].kind,'question');
    assert.equal(started.nodes[0].status,'open');assert.equal(started.nodes[0].parentId,null);
    assert.equal(started.nodes[0].method,undefined,'Starting does not silently choose a framework');
    assert.deepEqual((await read()).nodes,fixture.nodes,'The standalone starter cannot change a live session');
    await starter.screenshot({path:path.join(output,'question-starter.png')});
    checks.push('A blank standalone canvas rejects whitespace and starts with exactly the supplied question, no framework or invented children.');

    let before=await read();
    await page.locator('#question-edit').click();await page.locator('#question-input').fill('What should we investigate before using the spare room?');
    let after=await save(page,()=>page.locator('#question-input').press('Control+Enter'));
    assert.equal(after.question,'What should we investigate before using the spare room?');
    const expected=structuredClone(before);expected.question=after.question;expected.revision=after.revision;
    assert.deepEqual(after,expected,'A question edit preserves the custom root label and all case content');
    const synced=structuredClone(fixture);synced.nodes[0].label=synced.question;before=await fresh(page,synced);
    const reworded='Which spare-room option is worth investigating first?';
    await page.locator('#question-edit').click();await page.locator('#question-input').fill(reworded);
    after=await save(page,()=>page.locator('#question-save').click());
    assert.equal(after.question,reworded);assert.equal(after.nodes[0].label,reworded);
    assert.deepEqual(after.nodes.slice(1),before.nodes.slice(1));
    checks.push('The main question edits in place and saves by keyboard; only an unchanged matching root label follows its wording.');

    before=await fresh(page);
    await page.locator('#question-edit').click();await page.locator('#question-input').fill('A local draft of the question?');
    const concurrent=await read();concurrent.question='The agent clarified the governing question?';await put(concurrent);
    await page.locator('#question-conflict').waitFor({state:'visible',timeout:8000});
    assert.equal(await page.locator('#question-save').isDisabled(),true);
    assert.equal(await page.locator('#question-input').inputValue(),'A local draft of the question?');
    const conflictState=await read();await page.locator('#question-input').press('Control+Enter');
    assert.deepEqual(await read(),conflictState,'A keyboard save cannot bypass the question conflict');
    await page.locator('#question-discard').click();
    if(await page.locator('#question-form').isHidden())await page.locator('#question-edit').click();
    assert.equal(await page.locator('#question-input').inputValue(),concurrent.question);
    await page.locator('#question-input').fill('An agreed clarification of the latest question?');
    const unrelated=await read();unrelated.nodes.find(n=>n.id==='metric').notes='Fresh detail from the agent.';const remote=await put(unrelated);
    await page.waitForTimeout(1700);
    assert.equal(await page.locator('#question-conflict').isVisible(),false);
    after=await save(page,()=>page.locator('#question-input').press('Meta+Enter'));
    assert.equal(after.question,'An agreed clarification of the latest question?');
    assert.deepEqual(after.nodes,remote.nodes,'Question-only editing retains unrelated remote node edits');
    checks.push('Concurrent question changes keep the local draft and block stale saves; unrelated agent edits merge without loss.');

    before=await fresh(page);
    await focusCard(page,'metric');await page.keyboard.press('e');
    assert.equal(await page.locator('#label').isVisible(),true);
    await page.locator('#label').fill('AT is ordinary draft text');await page.locator('#label').press('Enter');
    assert.equal(await page.locator('#label').inputValue(),'AT is ordinary draft text\n','Plain Enter remains a textarea newline');
    assert.equal(await page.locator('#approach-panel').isHidden(),true,'Typing tree shortcut letters cannot open the picker');
    assert.deepEqual(await read(),before,'Typing or pressing plain Enter does not save');
    await save(page,()=>page.locator('#label').press('Control+Enter'));
    assert.equal(await page.locator('#label').isVisible(),true,'Saving keeps the panel open');
    await page.locator('#label').press('Tab');
    assert.equal(await page.locator('#notes').evaluate(el=>el===document.activeElement),true,'Native Tab reaches Notes without trapping focus');
    await page.locator('#label').focus();await page.locator('#label').fill('Keyboard-edited contribution');
    after=await save(page,()=>page.locator('#label').press('Control+Enter'));
    assert.equal(after.nodes.find(n=>n.id==='metric').label,'Keyboard-edited contribution');
    assert.equal(after.nodes.find(n=>n.id==='metric').notes,before.nodes.find(n=>n.id==='metric').notes);
    assert.equal(await page.locator('.inspector').isVisible(),true);await closeEditor(page);await page.locator('.inspector').waitFor({state:'hidden'});await isFocused(page,'metric');
    assert.equal(await page.locator('#main').evaluate(el=>el.classList.contains('inspect-open')),false);
    await page.keyboard.press('Enter');assert.equal(await page.locator('#label').isVisible(),true);
    await page.keyboard.press('Escape');await isFocused(page,'metric');
    await page.keyboard.press('t');assert.equal(await page.locator('#approach-panel').isVisible(),true);
    await page.keyboard.press('Escape');assert.equal(await page.locator('#approach-panel').isHidden(),true);
    assert.equal(await page.locator('.tree-node[data-id="metric"]').evaluate(el=>el.contains(document.activeElement)),true,'Closing the picker returns keyboard access to its card');
    checks.push('E/Enter edits, T chooses a tree, modified Enter saves while keeping the panel open; Close returns card focus, and Tab moves naturally into Notes.');

    before=await fresh(page);
    await focusCard(page,'metric');await page.keyboard.press('a');
    assert.equal(await page.locator('#kind').inputValue(),'metric');
    assert.equal(await page.locator('#kind').isVisible(),false,'The draft chooser replaces the duplicate Type control');
    assert.equal(await page.locator('#draft-choice').isVisible(),true,'The suggested card kind can be changed beside the draft');
    assert.equal(await page.locator('#thought-details').evaluate(el=>el.open),false);
    assert.equal(await page.locator('#label').inputValue(),'');
    assert.equal(await page.locator('#save').isDisabled(),true);
    await page.locator('#label').fill('Ticket receipts');after=await save(page,()=>page.locator('#label').press('Control+Enter'));
    const child=after.nodes.find(n=>n.label==='Ticket receipts');assert.equal(child.parentId,'metric');
    assert.equal(child.kind,'metric');assert.equal(child.relation.type,'calculated-from');
    assert.equal(child.method,undefined,'The default does not pin a framework');
    assert.equal(await page.locator('.inspector').isVisible(),true);await closeEditor(page);await page.locator('.inspector').waitFor({state:'hidden'});await isFocused(page,child.id);
    await page.keyboard.press('Shift+A');
    assert.equal(await page.locator('#kind').inputValue(),'metric');
    await page.locator('#label').fill('Direct workshop costs');after=await save(page,()=>page.locator('#label').press('Meta+Enter'));
    const sibling=after.nodes.find(n=>n.label==='Direct workshop costs');assert.equal(sibling.parentId,'metric');
    assert.equal(sibling.kind,'metric');assert.equal(after.nodes.length,before.nodes.length+2);
    await page.keyboard.press('Escape');await focusCard(page,'root');await page.keyboard.press('Shift+A');
    assert.equal(await page.locator('#main').evaluate(el=>el.classList.contains('inspect-open')),false,'A root cannot gain an invalid sibling');
    assert.deepEqual(await read(),after);
    checks.push('A adds a child to the focused card; Shift+A adds at the same parent, inherits useful editable defaults, and cannot create a second root.');

    before=await fresh(page);
    await focusCard(page,'issue');await page.keyboard.press('ArrowLeft');assert.equal(await card(page,'inherited').count(),0);
    await isFocused(page,'issue');await page.keyboard.press('ArrowRight');assert.equal(await card(page,'inherited').count(),1);
    await isFocused(page,'issue');await page.keyboard.press('ArrowRight');await isFocused(page,'inherited');
    await page.keyboard.press('ArrowLeft');await isFocused(page,'issue');
    await page.keyboard.press('ArrowDown');await isFocused(page,'explicit');
    await page.keyboard.press('ArrowUp');await isFocused(page,'issue');
    await focusCard(page,'metric');await page.keyboard.press('ArrowLeft');await isFocused(page,'root');
    assert.deepEqual(await read(),before,'Arrow navigation must never edit saved content');
    checks.push('Arrow keys collapse, expand and move between parents, children and siblings without changing the saved tree.');

    for(const [id,method] of [['metric','driver'],['hypothesis','hypothesis']]){
      await focusCard(page,id);await page.keyboard.press('t');
      const suggested=page.locator('#method-tasks button[data-suggested="true"]');
      assert.equal(await suggested.count(),1);assert.equal(await suggested.getAttribute('data-method'),method);
      assert.equal(await page.locator('#method-tasks button').count(),9,'Suggested choices do not hide other methods');
      assert.deepEqual(await read(),before,'A suggestion alone writes nothing');await page.keyboard.press('Escape');
    }
    for(const id of ['inherited','explicit']){
      await focusCard(page,id);await page.keyboard.press('t');
      assert.equal(await page.locator('#method-tasks button[data-suggested="true"]').count(),0,'Deliberate analytical type suppresses guessing for '+id);
      await page.keyboard.press('Escape');
    }
    assert.deepEqual(await read(),before);
    checks.push('Metric and hypothesis cards suggest suitable trees only in open exploration; existing analytical choices remain authoritative and suggestions write nothing.');

    await focusCard(page,'hypothesis');await page.keyboard.press('a');
    assert.equal(await page.locator('#kind').inputValue(),'question');assert.equal(await page.locator('#relation-type').inputValue(),'tests');
    await page.locator('#discard').click();await focusCard(page,'inherited');await page.keyboard.press('a');
    assert.equal(await page.locator('#kind').inputValue(),'question','The inherited issue method governs its next step');
    assert.equal(await page.locator('#relation-type').inputValue(),'part-of');
    await page.locator('#draft-choice').selectOption('evidence:supports');
    assert.equal(await page.locator('#kind').inputValue(),'evidence','The draft chooser lets the user change the proposed card kind');
    await page.locator('#label').fill('Observed staff-hour record');after=await save(page,()=>page.locator('#label').press('Control+Enter'));
    const changed=after.nodes.find(n=>n.label==='Observed staff-hour record');assert.equal(changed.parentId,'inherited');assert.equal(changed.kind,'evidence');
    assert.equal(after.nodes.find(n=>n.id==='issue').method,'issue');assert.equal(after.nodes.find(n=>n.id==='inherited').method,undefined);
    checks.push('Add follows card kind and the inherited method, while users can change the proposed card type before saving.');

    await closeEditor(page);await page.screenshot({path:path.join(output,'question-flow-desktop.png')});
    await page.setViewportSize({width:390,height:844});await page.locator('#question-edit').click();
    const box=await page.locator('#question-input').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391,'Question editing fits a phone-width viewport');
    await page.screenshot({path:path.join(output,'question-flow-mobile.png')});
    await page.locator('#question-discard').click();
    assert.deepEqual(errors,[]);checks.push('The new question and keyboard flows render without script errors, including a 390px question editor.');
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);if(errors.length)console.error('Browser errors:',errors);process.exitCode=1;});
