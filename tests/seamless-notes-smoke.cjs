/* Rendered note-taking checks. Use only a disposable live session.
   NODE_PATH=/path/to/node_modules node tests/seamless-notes-smoke.cjs http://127.0.0.1:PORT /tmp/seamless-notes-qa */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url) || /:62031\/?$/.test(url)) throw Error('Use a disposable loopback session, never the review canvas.');
const origin=url.replace(/\/$/,''), checks=[], errors=[];
const fixture={
  schemaVersion:1,revision:1,title:'Fictional seamless-notes check',
  question:'What would improve the fictional bookshop?',context:'Disposable interaction fixture. No observed customer evidence.',nextQuestion:'',
  nodes:[
    {id:'root',parentId:null,label:'Improve the bookshop',kind:'question',method:'issue',status:'open',notes:''},
    {id:'a',parentId:'root',label:'Understand the queue',kind:'question',status:'uncertain',notes:'Original queue notes.',source:'\n  Fictional supplied context.\n',sourceIds:['teaching-source'],relation:{type:'part-of'}},
    {id:'b',parentId:'root',label:'Understand delivery',kind:'question',status:'open',notes:'Original delivery notes.',relation:{type:'part-of'}}
  ],
  sources:[{id:'teaching-source',provider:'web',url:'https://example.com/teaching-source',title:'Fictional source for interaction testing',checkedAt:'2026-09-11',summary:'A synthetic source record used only to test the local source reader.',limitations:'Not evidence about a real bookshop.'}],
  decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}
};
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
const node=(state,id)=>state.nodes.find(n=>n.id===id);
async function read(){const response=await fetch(origin+'/api/state');assert.equal(response.status,200);return response.json();}
async function put(state){const before=await read();const response=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state})});assert.equal(response.status,200,await response.clone().text());return response.json();}
async function until(check,message,timeout=10000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,50));}assert.fail(message);}
async function persisted(id,text){await until(async()=>node(await read(),id)?.notes===text,'The intended notes did not reach their node.');}
async function active(p,id){await until(async()=>await p.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id')===id,'The expected card did not become selected.');}
async function exportHTML(p,name){await p.locator('details.export summary').click();const pending=p.waitForEvent('download');await p.locator('[data-export="html"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return fs.readFile(file,'utf8');}
async function exportJSON(p,name){await p.locator('details.export summary').click();const pending=p.waitForEvent('download');await p.locator('[data-export="json"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return JSON.parse(await fs.readFile(file,'utf8'));}
async function holdNextSave(p){
  let release,arrived,used=false;
  const gate=new Promise(resolve=>{release=resolve;});
  const pending=new Promise(resolve=>{arrived=resolve;});
  const handler=async route=>{
    if(route.request().method()!=='PUT'||used)return route.continue();
    used=true;
    const response=await route.fetch();
    arrived(response.status());
    await gate;
    await route.fulfill({response});
  };
  await p.route('**/api/state',handler);
  return {pending,release,async close(){release();await p.unroute('**/api/state',handler);}};
}

(async()=>{
  await fs.mkdir(output,{recursive:true});
  await put(structuredClone(fixture));
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:980},reducedMotion:'reduce'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  try{
    await page.goto(origin);await card(page,'a').click();
    assert.equal(await page.getByLabel('Notes',{exact:true}).isVisible(),true,'Notes open without a disclosure');
    assert.equal(await page.locator('#notes').getAttribute('placeholder'),'What have you learned?');
    const viewBefore=await page.locator('#viewport').getAttribute('transform');
    const before=await read(),note='\n  Inspect the packing queue.\nCheck counter time first.  \n\n';
    let putCount=0;page.on('request',r=>{if(r.url().endsWith('/api/state')&&r.method()==='PUT')putCount++;});
    await page.locator('#notes').fill(note);
    await page.waitForTimeout(150);
    assert.equal(putCount,0,'Typing is debounced rather than writing on each input');
    await persisted('a',note);
    assert.equal(putCount,1,'A pause in one edit produces one save');
    assert.equal(await page.locator('.inspector').isVisible(),true,'Autosave keeps the notes panel open');
    assert.equal(await page.locator('#notes').inputValue(),note,'Autosave preserves whitespace and the visible note');
    assert.equal(await page.locator('#viewport').getAttribute('transform'),viewBefore,'Writing and autosave do not move the tree');
    assert.equal(node(await read(),'a').source,node(before,'a').source,'Autosave preserves source formatting');
    assert.deepEqual((await read()).nodes.filter(n=>n.id!=='a'),before.nodes.filter(n=>n.id!=='a'),'Autosave updates only the edited card');
    await until(async()=>/^saved/i.test(await page.locator('#edit-status').innerText()),'Autosave should report its completed save.');
    assert.ok(await card(page,'a').getByRole('button',{name:/notes/i}).count(),'A note-bearing card has an accessible note indicator');
    checks.push('Existing-card notes autosave once after a pause, preserve formatting and unrelated branches, show saved state, and leave the panel and tree in place.');

    const held=await holdNextSave(page);
    try{
      await page.locator('#notes').fill('First version being saved.');
      assert.equal(await Promise.race([held.pending,new Promise((_,reject)=>setTimeout(()=>reject(Error('Autosave did not reach the held response')),10000))]),200);
      assert.equal(await page.locator('#notes').isEnabled(),true,'An in-flight note save does not stop typing');
      const newer='Second version typed while the first response is pending.';
      await page.locator('#notes').fill(newer);
      held.release();await persisted('a',newer);
      assert.equal(await page.locator('#notes').inputValue(),newer,'The first response cannot replace newer input');
      assert.equal(await page.locator('.inspector').isVisible(),true);
    }finally{await held.close();}
    checks.push('Typing continues during an in-flight save; the newer generation is subsequently saved without being replaced by the older response.');

    const aDraft='Queue note written just before changing cards.';
    await page.locator('#notes').fill(aDraft);await card(page,'b').click();
    await active(page,'b');await persisted('a',aDraft);
    assert.equal(await page.locator('#notes').inputValue(),'Original delivery notes.','Changing cards loads that card’s own notes');
    const bDraft='Delivery note belongs only to delivery.';
    await page.locator('#notes').fill(bDraft);await page.locator('#notes').press('Control+Enter');
    await persisted('b',bDraft);
    assert.equal(await page.locator('.inspector').isVisible(),true,'Ctrl+Enter flushes without closing');
    assert.equal(await page.locator('#notes').inputValue(),bDraft);
    assert.equal(node(await read(),'a').notes,aDraft,'A switch does not send the next card’s note to the previous card');
    checks.push('Changing cards flushes to the original target; the next card uses its own notes and Ctrl+Enter saves without closing.');

    await card(page,'a').click();
    const local='Local queue detail alongside an agent’s delivery update.';
    await page.locator('#notes').fill(local);
    const unrelated=await read();node(unrelated,'b').notes='Agent updated delivery independently.';await put(unrelated);
    await persisted('a',local);
    assert.equal(node(await read(),'b').notes,'Agent updated delivery independently.','Autosave retains unrelated agent edits');
    assert.equal(await page.locator('#conflict').isVisible(),false);
    checks.push('An unrelated agent edit merges with the human’s pending note without losing either change.');

    const failedSave=async route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Deliberate test outage.'})}):route.continue();
    await page.route('**/api/state',failedSave);
    const conflictDraft='Human draft retained through a connection failure and agent conflict.';
    try{
      await page.locator('#notes').fill(conflictDraft);
      await until(async()=>/fail|retry|not saved|saved.*browser|offline/i.test(await page.locator('#edit-status').innerText()),'The failed autosave must report that it has not reached the server.');
      assert.equal(await page.locator('#notes').inputValue(),conflictDraft);
      assert.equal(node(await read(),'a').notes,local,'A failed request cannot report a canonical save');
      await page.reload();await card(page,'a').click();
      assert.equal(await page.locator('#notes').inputValue(),conflictDraft,'Reload recovers the unsent human note for this live canvas');
      const competing=await read();node(competing,'a').notes='Agent changed the same queue note.';await put(competing);
      await page.locator('#conflict').waitFor({state:'visible'});
      assert.equal(await page.locator('#notes').inputValue(),conflictDraft,'Same-node conflict retains the recovered human draft');
      assert.equal(node(await read(),'a').notes,'Agent changed the same queue note.');
      assert.equal(await page.locator('#save').isDisabled(),true,'A conflicting draft cannot overwrite the newer node');
    }finally{await page.unroute('**/api/state',failedSave);}
    await page.locator('#discard').click();
    assert.equal(await page.locator('#notes').inputValue(),'Agent changed the same queue note.','Explicit Discard loads the agent’s current note');
    checks.push('Failed saves remain visibly unsent and survive reload; a later same-node agent edit preserves the recovered draft and blocks overwriting until deliberately resolved.');

    const sourceDraft=Array.from({length:45},(_,i)=>'Working line '+(i+1)+': inspect the relevant evidence.').join('\n');
    await page.locator('#notes').fill(sourceDraft);
    await page.locator('#notes').press('Control+End');await page.locator('#notes').press('ArrowUp');
    const notePosition=await page.locator('#notes').evaluate(el=>({start:el.selectionStart,end:el.selectionEnd,scroll:el.scrollTop}));
    assert.ok(notePosition.scroll>0,'The source return check starts with scrolled notes');
    const treePosition=await page.locator('#viewport').getAttribute('transform');
    const editorBounds=await page.locator('.inspector').boundingBox();
    await page.locator('#evidence-details > summary').click();
    await page.getByRole('button',{name:/View linked sources/}).click();
    await page.locator('#source-peek').waitFor({state:'visible'});
    const peekBounds=await page.locator('#source-peek').boundingBox();
    assert.ok(Math.abs(peekBounds.x-editorBounds.x)<=16&&Math.abs(peekBounds.width-editorBounds.width)<=16,'Sources use the same dock as notes');
    await page.getByRole('button',{name:'Back to notes',exact:true}).click();
    assert.equal(await page.locator('#notes').inputValue(),sourceDraft,'Returning from a source retains all note text');
    const returned=await page.locator('#notes').evaluate(el=>({start:el.selectionStart,end:el.selectionEnd,scroll:el.scrollTop}));
    assert.deepEqual(returned,notePosition,'Returning from a source restores caret, selection and note scroll');
    assert.equal(await page.locator('#viewport').getAttribute('transform'),treePosition,'Reading a source and returning never refits the tree');
    await persisted('a',sourceDraft);
    await until(async()=>/^saved/i.test(await page.locator('#edit-status').innerText()),'The source-reading draft should finish saving before export.');
    checks.push('Source reading uses the same dock; Back restores the exact note text, caret and scroll without moving the tree.');

    // Represent two simultaneously visible browser windows in the headless runner.
    await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'}));
    const liveOpened=context.waitForEvent('page');
    await page.evaluate(target=>{window.open(target,'_blank');},origin);
    const liveTwin=await liveOpened;liveTwin.setDefaultTimeout(10000);liveTwin.on('pageerror',e=>errors.push(e.message));
    await liveTwin.waitForLoadState();
    await liveTwin.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'}));
    await card(page,'a').click();await card(liveTwin,'b').click();
    await until(async()=>{
      const response=await fetch(origin+'/api/view');assert.equal(response.status,200);const view=await response.json();
      return view.status==='ambiguous'&&view.candidateNodeIds.includes('a')&&view.candidateNodeIds.includes('b');
    },'Two visible opener-related tabs selecting different branches must be reported as ambiguous to the agent.');
    await liveTwin.close();
    checks.push('Opener-related live tabs retain separate focus reports; different visible selections are reported as ambiguous to the agent.');

    const htmlA=await exportHTML(page,'recovery-a.html'),htmlB=await exportHTML(page,'recovery-b.html');
    await context.route(origin+'/recovery-a.html',route=>route.fulfill({status:200,contentType:'text/html',body:htmlA}));
    await context.route(origin+'/recovery-b.html',route=>route.fulfill({status:200,contentType:'text/html',body:htmlB}));
    const offlineA=await context.newPage(),offlineB=await context.newPage();
    for(const p of [offlineA,offlineB]){p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));}
    await offlineA.goto(origin+'/recovery-a.html');await card(offlineA,'a').click();
    const offlineNote='Recovered offline note that belongs only to copy A.';
    await offlineA.locator('#notes').fill(offlineNote);
    await until(async()=>/^saved|saved in (this|your) browser/i.test(await offlineA.locator('#edit-status').innerText()),'Offline notes should explain their browser save.');
    await offlineA.reload();await card(offlineA,'a').click();
    assert.equal(await offlineA.locator('#notes').inputValue(),offlineNote,'A standalone canvas recovers notes after reload');
    await offlineB.goto(origin+'/recovery-b.html');await card(offlineB,'a').click();
    assert.equal(await offlineB.locator('#notes').inputValue(),sourceDraft,'A separate exported canvas does not inherit another canvas’s recovered notes');
    const offlineExport=await exportJSON(offlineA,'recovered-state.json');
    assert.equal(node(offlineExport,'a').notes,offlineNote,'Export includes the recovered working notes');
    assert.equal(node(await read(),'a').notes,sourceDraft,'Standalone recovery cannot alter the live session');
    checks.push('Standalone notes survive reload, remain isolated between two exported canvases, export correctly and never change the live session.');

    const opened=context.waitForEvent('page');
    await offlineA.evaluate(target=>{window.open(target,'_blank');},origin+'/recovery-a.html');
    const twin=await opened;twin.setDefaultTimeout(10000);twin.on('pageerror',e=>errors.push(e.message));
    await twin.waitForLoadState();await card(twin,'b').click();
    const separateA='Tab A updated the queue.',separateB='Tab B updated delivery.';
    await offlineA.locator('#notes').fill(separateA);await twin.locator('#notes').fill(separateB);
    await until(async()=>/^saved/i.test(await offlineA.locator('#edit-status').innerText())&&/^saved/i.test(await twin.locator('#edit-status').innerText()),'Concurrent edits to different cards must settle without losing a draft.');
    const together=await exportJSON(offlineA,'two-tab-distinct-nodes.json');
    assert.equal(node(together,'a').notes,separateA,'The shared offline canvas retains tab A’s edit');
    assert.equal(node(together,'b').notes,separateB,'The shared offline canvas retains tab B’s edit');
    checks.push('Two tabs of the same offline canvas save different cards concurrently and retain both notes.');

    await offlineA.reload();await card(offlineA,'a').click();
    await twin.reload();await card(twin,'a').click();
    const contestedA='Tab A’s competing queue note.',contestedB='Tab B’s competing queue note.';
    await offlineA.locator('#notes').fill(contestedA);await twin.locator('#notes').fill(contestedB);
    await until(async()=>await offlineA.locator('#conflict').isVisible()||await twin.locator('#conflict').isVisible(),'Concurrent same-card edits must expose a conflict rather than silently replacing one note.');
    const loser=await offlineA.locator('#conflict').isVisible()?offlineA:twin;
    const winner=loser===offlineA?twin:offlineA;
    const loserNote=loser===offlineA?contestedA:contestedB,winnerNote=winner===offlineA?contestedA:contestedB;
    assert.equal(await loser.locator('#notes').inputValue(),loserNote,'The conflicted tab keeps its human draft');
    assert.equal(await loser.locator('#save').isDisabled(),true);
    await until(async()=>/^saved/i.test(await winner.locator('#edit-status').innerText()),'One of the concurrent notes should reach canonical browser storage.');
    const observer=await context.newPage();observer.setDefaultTimeout(10000);observer.on('pageerror',e=>errors.push(e.message));
    await observer.goto(origin+'/recovery-a.html');
    const observed=await exportJSON(observer,'two-tab-conflict-canonical.json');
    assert.equal(node(observed,'a').notes,winnerNote,'A clean tab reads the accepted note, never the conflicting draft');
    await observer.goto('about:blank');await observer.close();
    await loser.reload();await card(loser,'a').click();
    assert.equal(await loser.locator('#notes').inputValue(),loserNote,'A clean tab’s pagehide cannot erase another tab’s recovered conflicting draft');
    assert.match(await loser.locator('#edit-status').innerText(),/needs review/i,'Reload exposes the conflict against the newer canonical note');
    assert.equal(await loser.locator('#save').isDisabled(),true,'A recovered conflict still blocks overwriting the newer note');
    const winnerExport=await exportJSON(winner,'two-tab-winner-after-reload.json');
    assert.equal(node(winnerExport,'a').notes,winnerNote,'Recovering the conflicting draft does not overwrite the accepted note');
    checks.push('Same-card offline races keep one accepted note and a recoverable conflicting draft; a clean tab’s pagehide cannot erase it.');

    await offlineB.evaluate(()=>{
      const id=JSON.parse(document.querySelector('#boot-data').textContent).canvasId;
      const key='strategy-canvas:workspace:offline:'+id,record=JSON.parse(localStorage.getItem(key));
      record.state.nodes.find(n=>n.id==='a').parentId='b';
      record.state.nodes.find(n=>n.id==='b').parentId='a';
      localStorage.setItem(key,JSON.stringify(record));
    });
    await offlineB.reload();await card(offlineB,'a').click();
    assert.equal(await offlineB.locator('#notes').inputValue(),sourceDraft,'A cyclic recovery record is ignored in favour of the valid embedded canvas');
    assert.equal(await offlineB.locator('.tree-node').count(),fixture.nodes.length,'Corrupt recovery cannot remove the valid tree from view');
    assert.match(await offlineB.locator('#sync').innerText(),/export|recover|invalid|cannot/i,'Corrupt recovery requires a truthful preservation warning');
    assert.ok(!/^saved/i.test(await offlineB.locator('#edit-status').innerText()),'An invalid recovery store cannot claim a saved copy');
    checks.push('A cyclic browser recovery record is ignored safely and the usable embedded canvas stays visible without a Saved claim.');
    await offlineA.close();await twin.close();await offlineB.close();

    const blankA=await context.newPage(),blankB=await context.newPage();
    for(const [p,question]of[[blankA,'First separate question?'],[blankB,'Second separate question?']]){
      p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
      await p.goto(origin+'/new.html#new');await p.locator('#start-question').fill(question);await p.locator('#start-submit').click();await card(p,'root').waitFor();
    }
    await blankA.reload();await card(blankA,'root').waitFor();
    assert.equal(await blankA.locator('#question').innerText(),'First separate question?','Reloading the first blank canvas does not adopt the newer canvas’s identity');
    assert.equal(await blankB.locator('#question').innerText(),'Second separate question?');
    await blankA.close();await blankB.close();
    checks.push('Two separately started blank canvases retain their own questions when the earlier tab reloads.');

    const blockedContext=await browser.newContext({viewport:{width:1440,height:980},reducedMotion:'reduce'});
    try{
      await blockedContext.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage deliberately blocked by this test.','QuotaExceededError');};});
      await blockedContext.route(origin+'/blocked-storage.html',route=>route.fulfill({status:200,contentType:'text/html',body:htmlB}));
      const blocked=await blockedContext.newPage();blocked.setDefaultTimeout(10000);blocked.on('pageerror',e=>errors.push(e.message));
      await blocked.goto(origin+'/blocked-storage.html');await card(blocked,'a').click();
      const unsaved='Keep this note available to export when browser storage fails.';
      await blocked.locator('#notes').fill(unsaved);
      await until(async()=>/export|not saved|failed/i.test(await blocked.locator('#edit-status').innerText()),'Blocked storage must report that the note is not safely saved.');
      assert.equal(await blocked.locator('#notes').inputValue(),unsaved,'A storage failure keeps the visible note');
      assert.ok(!/^saved/i.test(await blocked.locator('#sync').innerText()),'The global status does not falsely claim saved browser storage');
      const blockedExport=await exportJSON(blocked,'storage-blocked-export.json');
      assert.equal(node(blockedExport,'a').notes,unsaved,'Export remains a usable way to preserve the note when storage is blocked');
      checks.push('Blocked browser storage never claims Saved; the human note remains visible and can still be exported.');
    }finally{await blockedContext.close();}

    await page.setViewportSize({width:390,height:844});await page.locator('#close-details').click();await page.locator('#fit').click();await card(page,'a').click();
    await page.locator('#notes').fill('A short mobile note.');await persisted('a','A short mobile note.');
    const footer=await page.locator('#edit-form > .edit-actions').boundingBox();
    assert.ok(footer.x>=0&&footer.y>=0&&footer.x+footer.width<=391&&footer.y+footer.height<=845,'The stable action row stays reachable on a phone');
    assert.equal(await page.locator('.inspector').isVisible(),true);
    await page.screenshot({path:path.join(output,'seamless-notes-mobile.png')});
    await page.setViewportSize({width:1440,height:980});await page.screenshot({path:path.join(output,'seamless-notes-desktop.png')});
    checks.push('Mobile notes autosave with the panel open and the action row within the viewport.');
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks},null,2));
  }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,error:error.message},null,2)+'\n');throw error;}
  finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
