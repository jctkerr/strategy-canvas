/* Optional rendered onboarding checks. Use only a disposable session.
   NODE_PATH=/path/to/node_modules node tests/onboarding-smoke.cjs http://127.0.0.1:PORT /tmp/canvas-onboarding
   Tests replace that fictional session; no external services are contacted. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) throw Error('Provide a disposable loopback session URL and output directory.');
const origin=url.replace(/\/$/,''), results=[], errors=[];
const steps=['question','branch','notes','agent','conclusion'];
const fixture = {
  schemaVersion: 1, revision: 1, title: 'Fictional onboarding test',
  question: 'For the next three months, how should the neighbourhood bookshop use its spare room?',
  context: 'Fictional case. No demand has been established. '.repeat(30),
  nextQuestion: 'Which important unknown would you investigate first?',
  problem: {situation: 'A spare room is available.', desiredChange: 'Still to clarify.', constraints: 'Five staff hours a week. Demand and budget unknown.'},
  nodes: [
    {id: 'root', parentId: null, label: 'Use the spare room', kind: 'question', status: 'open', notes: 'Original notes.', method: 'exploration'},
    {id: 'workshops', parentId: 'root', label: 'Paid workshops', kind: 'option', status: 'open', notes: 'A possibility to investigate.', relation: {type: 'choice'}},
    {id: 'reading', parentId: 'root', label: 'Quiet reading room', kind: 'option', status: 'open', notes: '', relation: {type: 'choice'}},
    {id: 'storage', parentId: 'root', label: 'Keep as storage', kind: 'option', status: 'open', notes: '', relation: {type: 'choice'}}
  ],
  decision: {recommendation: '', rationale: '', uncertainties: [], nextSteps: []}
};

async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json();}
async function put(state){const before=await read();const r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state})});assert.equal(r.status,200,await r.clone().text());return r.json();}
const card=(page,id)=>page.locator('.tree-node[data-id="'+id+'"]');
async function frames(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function newContext(browser,options={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',...options});
 await context.route('**/*',route=>{const target=new URL(route.request().url());return ['file:','data:','blob:','about:'].includes(target.protocol)||target.origin===origin?route.continue():route.abort();});
 context.on('page',page=>{page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));});return context;
}
async function guide(page){if(await page.locator('#tree-guide').isHidden())await page.locator('#tree-guide-open').click();}
async function takeTour(page){await guide(page);await page.locator('#tour-toggle').click();await page.locator('#quick-start').waitFor({state:'visible'});await frames(page);}
async function helpAction(page,id){await guide(page);await page.locator(id).click();}
async function replay(page){await helpAction(page,'#help-open');await page.locator('#tour-replay').click();await page.locator('#quick-start').waitFor({state:'visible'});await frames(page);}
async function exportFile(page,format,name){await page.locator('details.export summary').click();const pending=page.waitForEvent('download');await page.locator('[data-export="'+format+'"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return file;}
async function viewport(page){await frames(page);return page.locator('#viewport').getAttribute('transform');}
async function selected(page){return page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id');}
async function bounds(page,selector){await frames(page);const rect=await page.locator(selector).boundingBox(),size=page.viewportSize();assert.ok(rect&&rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=size.width+1&&rect.y+rect.height<=size.height+1,selector+' stays in the viewport');return rect;}
async function noEditorCover(page){
 const coach=await bounds(page,'#quick-start'),editor=await page.locator('.inspector').boundingBox();
 if(editor&&await page.locator('.inspector').isVisible()){
  const w=Math.max(0,Math.min(coach.x+coach.width,editor.x+editor.width)-Math.max(coach.x,editor.x));
  const h=Math.max(0,Math.min(coach.y+coach.height,editor.y+editor.height)-Math.max(coach.y,editor.y));
  assert.ok(w*h<=1,'The tour must not cover the active writing panel');
  await bounds(page,'#save');
 }
 assert.equal(await page.locator('dialog[open], [aria-modal="true"]:visible').count(),0,'The tour is nonmodal');
}
async function checkStep(page,index){
 assert.equal(await page.locator('#quick-start').getAttribute('data-step'),steps[index]);
 assert.match(await page.locator('#tour-count').innerText(),new RegExp((index+1)+' of 5','i'));
 assert.equal(await page.locator('#tour-back').isHidden(),index===0);
 assert.equal(await page.locator('#tour-save-hint').isHidden(),true,'Saving guidance has no repeated footnote');
 assert.ok((await page.locator('#tour-title').innerText()).trim());assert.ok((await page.locator('#tour-body').innerText()).trim());
 assert.equal(await page.locator('#tour-next').innerText(),index===4?'Done':'Next →');
 await noEditorCover(page);
 const coach=await page.locator('#quick-start').boundingBox();
 for(const selector of ['#tour-count','#tour-title','#tour-body','#tour-skip','#tour-next']){const item=await page.locator(selector).boundingBox();const fits=item&&item.x>=coach.x-1&&item.y>=coach.y-1&&item.x+item.width<=coach.x+coach.width+1&&item.y+item.height<=coach.y+coach.height+1;if(!fits)await page.screenshot({path:path.join(output,'step-'+(index+1)+'-'+page.viewportSize().width+'-failure.png')});assert.ok(fits,selector+' is visible inside step '+(index+1)+' coach without internal scrolling: '+JSON.stringify({coach,item}));}
 const highlight=page.locator('#tour-highlight');
 if(await highlight.isVisible()){await bounds(page,'#tour-highlight');assert.equal(await highlight.evaluate(el=>getComputedStyle(el).pointerEvents),'none');assert.ok(await highlight.getAttribute('data-target'));}
}
async function editorSnapshot(page){return page.evaluate(()=>{const field=document.querySelector('#notes');return {label:document.querySelector('#label').value,notes:field.value,kind:document.querySelector('#kind').value,relation:document.querySelector('#relation-type').value,start:field.selectionStart,end:field.selectionEnd,fieldScroll:field.scrollTop,panelScroll:document.querySelector('.inspector-scroll').scrollTop};});}
async function selectNotesPosition(page){await page.locator('#notes').focus();await page.locator('#notes').press('Control+End');await page.locator('#notes').press('ArrowUp');await frames(page);}

(async()=>{
 await fs.mkdir(output,{recursive:true});await fs.rm(path.join(output,'results.json'),{force:true});const original=await put(fixture);const browser=await chromium.launch({headless:true});let page;
 try{
  const context=await newContext(browser);page=await context.newPage();await page.goto(origin);await card(page,'root').waitFor();
  assert.equal(await page.locator('#quick-start').isHidden(),true,'A saved canvas opens directly');
  for(const id of ['#add-primary','#add-child','#collapse-branch'])assert.equal(await page.locator(id).isVisible(),false,'Frequent card actions have one visible home');
  await guide(page);assert.equal(await page.locator('#tree-guide-methods').getAttribute('open'),null,'Detailed tree choices stay optional');
  const example=page.locator('#guide-example');assert.equal(await example.getAttribute('target'),'_blank');const exampleURL=new URL(await example.getAttribute('href'),origin);
  assert.ok(exampleURL.pathname.endsWith('/bookshop.html'));assert.equal(exampleURL.searchParams.get('tour'),'1');
  if(exampleURL.origin===origin){const response=await fetch(exampleURL);assert.equal(response.status,200,'The live worked-example link must resolve');}
  await page.locator('#tree-guide-close').click();
  const camera=await viewport(page),selection=await selected(page);await takeTour(page);
  for(let i=0;i<5;i++){
   await checkStep(page,i);assert.equal(await viewport(page),camera,'Tour steps do not refit or move the tree');assert.equal(await selected(page),selection);assert.deepEqual(await read(),original);
   if(i===1){await page.locator('#tour-back').click();await checkStep(page,0);await page.locator('#tour-next').click();await checkStep(page,1);}
   if(i===3){const text=await page.locator('#tour-body').innerText();assert.match(text,/agent|chat/i);assert.match(text,/select|branch|saved|live/i);assert.doesNotMatch(text,/built.in AI|AI is running|automatic AI/i);}
   if(i===4){assert.match(await page.locator('#tour-body').innerText(),/Conclusion/);assert.match(await page.locator('#tour-body').innerText(),/Export/);}
   await page.screenshot({path:path.join(output,'desktop-step-'+(i+1)+'.png')});await page.locator('#tour-next').click();
  }
  assert.equal(await page.locator('#quick-start').isHidden(),true);await page.reload();assert.equal(await page.locator('#quick-start').isHidden(),true);assert.deepEqual(await read(),original);
  results.push('Five optional nonmodal steps cover question, branch, notes, agent and conclusion; Back and Done leave canonical content, selection and camera unchanged.');

  await takeTour(page);await page.locator('#tour-next').click();await page.locator('#tour-skip').click();assert.equal(await page.locator('#quick-start').isHidden(),true);
  await takeTour(page);await checkStep(page,0);await page.locator('#tour-skip').click();await replay(page);await checkStep(page,0);
  await page.locator('#tour-next').focus();let escaped=false;
  for(let i=0;i<12;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>!document.querySelector('#quick-start').contains(document.activeElement))){escaped=true;break;}}
  assert.ok(escaped,'Tab can leave the tour normally');await page.locator('#tour-next').focus();await page.keyboard.press('Escape');assert.equal(await page.locator('#quick-start').isHidden(),true);assert.deepEqual(await read(),original);
  results.push('Skip, help replay and Take a tour restart cleanly; Tab escapes the coach and Escape closes it without a keyboard trap.');

  await card(page,'workshops').locator('.node-add').click();await page.locator('#label').fill('Would people book in advance?');
  await page.locator('#notes').fill(Array.from({length:45},(_,i)=>'Working observation '+(i+1)+': keep this human wording.').join('\n'));await selectNotesPosition(page);
  const draft=await editorSnapshot(page),draftCamera=await viewport(page),draftSelection=await selected(page);await takeTour(page);
  for(let i=0;i<5;i++){await checkStep(page,i);assert.equal(await viewport(page),draftCamera);assert.equal(await selected(page),draftSelection);if(i<4)await page.locator('#tour-next').click();}
  await page.locator('#tour-skip').click();assert.deepEqual(await editorSnapshot(page),draft,'Tour exit preserves draft text, metadata, caret and both scroll positions');assert.deepEqual(await read(),original);
  await takeTour(page);await page.locator('#notes').focus();const stepWhileTyping=await page.locator('#quick-start').getAttribute('data-step');await page.keyboard.type('aet');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#quick-start').getAttribute('data-step'),stepWhileTyping,'Typing never becomes tour/card shortcuts');assert.equal(await selected(page),draftSelection);assert.equal((await read()).nodes.length,original.nodes.length);
  await page.locator('#tour-skip').click();await page.locator('#discard').click();await page.locator('#close-details').click();
  results.push('An unsaved child keeps its exact title, Notes, type, parent, caret, scroll and camera across all steps; typing remains typing and the tour never adds it.');

  await page.locator('#question-edit').click();await page.locator('#question-input').fill('A human question draft that must survive help?');await page.locator('#question-input').press('ArrowLeft');
  const questionDraft=await page.locator('#question-input').evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd})),questionCamera=await viewport(page);
  await takeTour(page);await page.locator('#tour-skip').click();assert.deepEqual(await page.locator('#question-input').evaluate(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd})),questionDraft);assert.equal(await viewport(page),questionCamera);assert.deepEqual(await read(),original);
  await page.locator('#question-discard').click();
  results.push('The governing question can remain an unfinished human draft while the tour opens and closes.');

  const starterContext=await newContext(browser),starter=await starterContext.newPage();await starter.goto(origin+'/new.html#new');
  assert.equal(await starter.locator('#start-question').isVisible(),true);assert.equal(await starter.locator('.tree-node').count(),0);assert.equal(await starter.locator('#start-example').getAttribute('target'),'_blank');
  await starter.locator('#start-skip').click();await starter.locator('.tree-node').waitFor();assert.equal(await starter.locator('#quick-start').isHidden(),true);assert.equal(await starter.locator('.tree-node').count(),1);await starterContext.close();
  const inputContext=await newContext(browser),input=await inputContext.newPage();await input.goto(origin+'/new.html#new');await input.locator('#start-question').fill('What should our fictional shop investigate?');await input.locator('#start-submit').click();await input.locator('.tree-node').waitFor();
  assert.equal(await input.locator('#quick-start').isHidden(),true);assert.equal(await input.locator('.tree-node').count(),1);assert.equal(await input.locator('#question').innerText(),'What should our fictional shop investigate?');await inputContext.close();assert.deepEqual(await read(),original);
  results.push('Both Go straight to canvas and one-question Start reach an editable tree without a mandatory tour or invented branches.');

  const autoContext=await newContext(browser),auto=await autoContext.newPage();await auto.goto(origin+'?tour=1');await auto.locator('#quick-start').waitFor({state:'visible'});await checkStep(auto,0);await auto.locator('#tour-skip').click();await auto.waitForTimeout(1600);assert.equal(await auto.locator('#quick-start').isHidden(),true,'Ordinary live updates do not restart a dismissed tour');assert.equal(new URL(auto.url()).searchParams.has('tour'),false,'The explicit tour flag is consumed');await auto.reload();assert.equal(await auto.locator('#quick-start').isHidden(),true,'Reload does not restart the dismissed tour');
  await card(auto,'workshops').locator('.node-add').click();await auto.locator('#label').fill('Keep this restored draft instead of starting a tour');
  await auto.evaluate(()=>history.replaceState(null,'','?tour=1'));await auto.reload();await auto.locator('#label').waitFor({state:'visible'});assert.equal(await auto.locator('#label').inputValue(),'Keep this restored draft instead of starting a tour');assert.equal(await auto.locator('#quick-start').isHidden(),true,'A requested tour does not interrupt a recovered draft');await autoContext.close();assert.deepEqual(await read(),original);
  results.push('The explicit guided-example URL opens a tour; ordinary live updates do not restart it, and a recovered draft is never interrupted.');

  await takeTour(page);await page.locator('#tour-next').click();await frames(page);assert.equal(await page.locator('#tour-highlight').isVisible(),true,'Export exercises a visible teaching highlight');const html=await exportFile(page,'html','onboarding.html'),json=await exportFile(page,'json','onboarding.json');assert.deepEqual(JSON.parse(await fs.readFile(json,'utf8')),original);await page.locator('#tour-skip').click();
  const fileContext=await newContext(browser),standalone=await fileContext.newPage();await standalone.goto(pathToFileURL(html).href);assert.equal(await standalone.locator('#quick-start').isHidden(),true);assert.equal(await standalone.locator('#tour-highlight').isHidden(),true,'A downloaded copy has no ghost teaching ring');assert.equal(await standalone.locator('dialog[open]').count(),0);await takeTour(standalone);
  for(let i=0;i<3;i++)await standalone.locator('#tour-next').click();await checkStep(standalone,3);const offlineAgent=await standalone.locator('#tour-body').innerText();assert.match(offlineAgent,/export|JSON|attach/i);assert.doesNotMatch(offlineAgent,/agent can see|automatically see|live selection/i);
  await standalone.locator('#tour-next').click();await checkStep(standalone,4);assert.match(await standalone.locator('#tour-body').innerText(),/Export/);await standalone.locator('#tour-next').click();
  await helpAction(standalone,'#help-open');assert.match(await standalone.locator('#help-saving').innerText(),/browser when storage is available/);assert.match(await standalone.locator('#help-saving').innerText(),/JSON/);await standalone.locator('#help-done').click();
  assert.deepEqual(await standalone.locator('#boot-data').evaluate(el=>JSON.parse(el.textContent).state),original);await fileContext.close();
  results.push('Downloaded HTML starts with a closed tour and complete state; static guidance explains JSON handoff and local recovery rather than claiming a connected agent.');

  const denied=await newContext(browser);await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage disabled','SecurityError');}}));const blocked=await denied.newPage();await blocked.goto(origin);assert.equal(await blocked.locator('#quick-start').isHidden(),true);await takeTour(blocked);await blocked.locator('#tour-skip').click();await helpAction(blocked,'#help-open');await blocked.locator('#help-done').click();await card(blocked,'root').locator('.node-add').click();await blocked.locator('#label').fill('Still works without storage');assert.equal(await blocked.locator('#save').isEnabled(),true);await blocked.locator('#discard').click();await denied.close();assert.deepEqual(await read(),original);
  results.push('Unavailable browser storage does not break optional help, tour dismissal or drafting.');

  const mobileContext=await newContext(browser,{viewport:{width:390,height:844},hasTouch:true}),mobile=await mobileContext.newPage();await mobile.goto(origin);await mobile.locator('.context-disclosure summary').click();await frames(mobile);
  assert.ok((await mobile.locator('.context-body').boundingBox()).height<=131);assert.equal(await mobile.locator('.context-body').evaluate(el=>el.scrollHeight>el.clientHeight),true);await mobile.locator('.context-disclosure summary').click();
  await card(mobile,'root').locator('.node-add').tap();await mobile.locator('#label').fill('Mobile draft');await mobile.locator('#notes').fill('Keep the mobile note.');const mobileDraft=await editorSnapshot(mobile),mobileCamera=await viewport(mobile);await takeTour(mobile);
  for(let i=0;i<5;i++){await checkStep(mobile,i);assert.equal(await viewport(mobile),mobileCamera);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await bounds(mobile,'#tour-next');await bounds(mobile,'#tour-skip');await mobile.screenshot({path:path.join(output,'mobile-step-'+(i+1)+'.png')});if(i<4)await mobile.locator('#tour-next').click();}
  await mobile.locator('#tour-skip').click();assert.deepEqual(await editorSnapshot(mobile),mobileDraft);await mobile.locator('#notes').fill('Still editable after the tour.');assert.equal(await mobile.locator('#save').isEnabled(),true);await mobile.locator('#discard').click();await mobileContext.close();
  assert.deepEqual(await read(),original);assert.deepEqual(errors,[]);results.push('At 390px every step and its controls fit without covering an active editor; Notes remain editable and the camera and draft survive exit.');
  await card(page,'root').click();await page.locator('#close-details').click();await page.locator('#fit').click();await page.emulateMedia({reducedMotion:'no-preference'});await takeTour(page);await page.locator('#tour-next').click();await frames(page);assert.equal(await page.locator('#tour-highlight').isVisible(),true);
  const beforeMove=await card(page,'root').locator('.node-add').evaluate(el=>el.getBoundingClientRect().toJSON());const agentUpdate=structuredClone(await read());agentUpdate.nodes.push({id:'tour-agent-child',parentId:'workshops',label:'Check advance demand',kind:'question',status:'open',notes:'Agent-added fixture branch.',relation:{type:'idea'}},{id:'tour-agent-child-2',parentId:'workshops',label:'Check staffing capacity',kind:'question',status:'open',notes:'A second agent-added fixture branch.',relation:{type:'idea'}});const afterAgent=await put(agentUpdate);await card(page,'tour-agent-child').waitFor();await page.waitForTimeout(350);await frames(page);
  const target=await card(page,'root').locator('.node-add').evaluate(el=>el.getBoundingClientRect().toJSON()),ring=await page.locator('#tour-highlight').evaluate(el=>el.getBoundingClientRect().toJSON());assert.ok(Math.abs(target.y-beforeMove.y)>1,'The agent addition exercises actual movement');assert.equal(await page.locator('#tour-highlight').isVisible(),true);assert.equal(await page.locator('#tour-highlight').getAttribute('data-target'),'add-child');assert.ok(Math.abs(ring.x-(target.x-4))<1&&Math.abs(ring.y-(target.y-4))<1&&Math.abs(ring.width-(target.width+8))<1&&Math.abs(ring.height-(target.height+8))<1,'The teaching ring follows the current card after agent-driven layout movement: '+JSON.stringify({target,ring}));await page.locator('#tour-skip').click();assert.deepEqual(await read(),afterAgent,'The agent branch is the only canonical change');assert.deepEqual(errors,[]);results.push('Agent-added content updates the same canvas during a tour, and the teaching ring follows the settled animated control rather than staying at its old position.');
  const report={passed:true,checks:results,errors};await fs.writeFile(path.join(output,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(error){if(page&&!page.isClosed())await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
