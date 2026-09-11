/* Repeated branch entry checks. Use a disposable loopback session only.
   NODE_PATH=/path/to/node_modules node tests/repeated-add-smoke.cjs http://127.0.0.1:PORT /tmp/repeated-add-qa */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const [url,output]=process.argv.slice(2);
if(!url||!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)||/:62031\/?$/.test(url))throw Error('Use a disposable loopback session, never a user canvas.');
const origin=url.replace(/\/$/,''),checks=[],errors=[];
const fixture={schemaVersion:1,revision:1,title:'Fictional repeated-add check',question:'What should this fictional bookshop investigate?',context:'Disposable fixture; no real observations.',nextQuestion:'',nodes:[
 {id:'root',parentId:null,label:'Investigate the bookshop',kind:'question',method:'issue',status:'open',notes:'Keep these original notes.'},
 {id:'a',parentId:'root',label:'Understand the queue',kind:'question',status:'open',notes:'Existing human notes.',relation:{type:'part-of'}},
 {id:'b',parentId:'root',label:'Check revenue inputs',kind:'metric',method:'driver',status:'open',notes:'Revenue = orders × average order value.',relation:{type:'part-of'}}
],decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}};
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json()}
async function put(state){const old=await read(),r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:old.revision,state})});assert.equal(r.status,200,await r.clone().text());return r.json()}
async function until(check,message){const end=Date.now()+10000;while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,25))}assert.fail(message)}
async function start(p,parent='a'){await card(p,parent).locator('.node-add').click();await p.locator('#label').waitFor({state:'visible'});assert.equal(await p.locator('#label').inputValue(),'');assert.equal(await p.locator('#add-another').isVisible(),true)}
async function blankNext(p,parent='a'){await p.waitForFunction(()=>document.querySelector('#label').value===''&&!document.querySelector('#draft-type-row').hidden);assert.equal(await p.locator('#label').evaluate(el=>el===document.activeElement),true);assert.match(await p.locator('#new-child-hint').textContent(),new RegExp(fixture.nodes.find(n=>n.id===parent).label));assert.equal(await p.locator('#save').isDisabled(),true);assert.equal(await p.locator('#add-another').isDisabled(),true);assert.equal(await p.locator('#edit-status').textContent(),'New thought','A blank unsaved continuation must not claim Saved')}
async function successful(p,action){const pending=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await action();assert.equal((await pending).status(),200);return read()}
async function group(browser,name,body,value=fixture,options={}){await put(structuredClone(value));const context=await browser.newContext({viewport:{width:1400,height:980},reducedMotion:'reduce',...options}),p=await context.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));try{await p.goto(origin);await card(p,'root').waitFor();await body(p,context);checks.push(name)}finally{await context.close()}}

(async()=>{
 await fs.mkdir(output,{recursive:true});const browser=await chromium.launch({headless:true});
 try{
  await group(browser,'Add another saves one child, retains only its type and connection type, and focuses an explicit blank sibling draft.',async p=>{
   assert.equal(await p.locator('#add-another').isHidden(),true);await start(p);const before=await read();assert.equal(await p.locator('#add-another').isDisabled(),true);
   await p.locator('#label').fill('  Packing may explain the queue.  ');await p.getByRole('combobox',{name:'New thought type'}).selectOption('hypothesis:possible-cause');
   await p.locator('#notes').fill('\n  Check the busy period first.\n');await p.locator('#evidence-details>summary').click();await p.locator('#source').fill('\n Fictional interview plan. \n');
   await p.locator('#thought-details>summary').click();await p.locator('#connection-details>summary').click();await p.locator('#relation-label').fill('A proposed explanation, not a finding.');
   assert.equal(await p.locator('#add-another').evaluate(el=>el.parentElement===document.querySelector('#save').parentElement),true,'Both actions have one stable footer');
   const saved=await successful(p,()=>p.locator('#add-another').click());await blankNext(p);const added=saved.nodes.filter(n=>!before.nodes.some(old=>old.id===n.id));assert.equal(added.length,1);const node=added[0];
   assert.equal(node.parentId,'a');assert.equal(node.label,'Packing may explain the queue.');assert.equal(node.kind,'hypothesis');assert.equal(node.status,'uncertain');assert.deepEqual(node.relation,{type:'possible-cause',label:'A proposed explanation, not a finding.'});assert.equal(node.notes,'\n  Check the busy period first.\n');assert.equal(node.source,'\n Fictional interview plan. \n');
   assert.equal(await p.locator('#kind').inputValue(),'hypothesis');assert.equal(await p.locator('#relation-type').inputValue(),'possible-cause');assert.equal(await p.locator('#status').inputValue(),'uncertain');for(const id of ['notes','source','relation-label'])assert.equal(await p.locator('#'+id).inputValue(),'');
   await p.waitForTimeout(850);assert.deepEqual(await read(),saved,'The blank continuation cannot autosave');await p.screenshot({path:path.join(output,'repeated-add-desktop.png')});
  });
  await group(browser,'Keyboard continuation supports Control and Command; ordinary Enter, IME, and ordinary Add retain their existing meaning.',async p=>{
   await start(p);await p.locator('#label').fill('Check the counter');await p.locator('#label').press('Enter');assert.equal(await p.locator('#label').inputValue(),'Check the counter\n');const before=await read();
   await p.locator('#label').dispatchEvent('keydown',{key:'Enter',code:'Enter',ctrlKey:true,shiftKey:true,isComposing:true,bubbles:true});await p.waitForTimeout(120);assert.deepEqual(await read(),before,'Composition Enter never commits');
   await successful(p,()=>p.locator('#label').press('Control+Shift+Enter'));await blankNext(p);assert.equal(await p.locator('#status').inputValue(),'open');
   await p.locator('#label').fill('Check the handover');await successful(p,()=>p.locator('#label').press('Meta+Shift+Enter'));await blankNext(p);
   await p.locator('#label').fill('Check collection times');const saved=await successful(p,()=>p.locator('#label').press('Control+Enter'));await p.waitForFunction(()=>document.querySelector('#draft-type-row').hidden);assert.equal(await p.locator('#add-another').isHidden(),true,'Ordinary Add does not force another draft');assert.equal(saved.nodes.filter(n=>n.parentId==='a').length,3);
   await p.locator('#notes').fill('Existing-card keyboard edit.');await p.locator('#notes').press('Control+Shift+Enter');await until(async()=>(await read()).nodes.some(n=>n.notes==='Existing-card keyboard edit.'),'Existing notes remain saveable');assert.equal((await read()).nodes.length,saved.nodes.length,'The repeated-add shortcut cannot create children from an existing-card editor');assert.equal(await p.locator('#add-another').isHidden(),true);
  });
  await group(browser,'An in-flight double click produces one saved node and one blank continuation.',async p=>{
   await start(p);await p.locator('#label').fill('One deliberate addition');const before=await read();let release,requests=0;const held=new Promise(resolve=>{release=resolve});
   await p.route('**/api/state',async route=>{if(route.request().method()!=='PUT')return route.continue();requests++;await held;await route.continue()});
   try{const box=await p.locator('#add-another').boundingBox();await p.mouse.click(box.x+box.width/2,box.y+box.height/2,{clickCount:2,delay:40});await until(async()=>requests===1,'The first save must reach the server');assert.equal(await p.locator('#add-another').isDisabled(),true);await p.keyboard.press('Control+Shift+Enter');await p.waitForTimeout(100);assert.equal(requests,1,'Repeated activation while busy cannot enqueue another addition');release();await blankNext(p);assert.equal((await read()).nodes.length,before.nodes.length+1);assert.equal(requests,1)}finally{release();await p.unroute('**/api/state')}
  });
  await group(browser,'Failed and conflicting saves retain the exact draft and never start another child.',async p=>{
   await start(p);const label='Keep this pending idea',notes='\n Keep every draft line.\n';await p.locator('#label').fill(label);await p.locator('#notes').fill(notes);const before=await read();
   await p.route('**/api/state',route=>route.request().method()==='PUT'?route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Deliberate test outage'})}):route.continue());
   const failure=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await p.locator('#add-another').click();assert.equal((await failure).status(),503);await p.waitForFunction(()=>!document.querySelector('#save').disabled);assert.equal(await p.locator('#label').inputValue(),label);assert.equal(await p.locator('#notes').inputValue(),notes);assert.deepEqual(await read(),before);
   await p.unroute('**/api/state');const external=await read();external.nodes.find(n=>n.id==='a').notes='Another editor changed the parent.';const changed=await put(external);await p.waitForFunction(()=>document.querySelector('#edit-status').textContent==='Needs review');assert.equal(await p.locator('#add-another').isDisabled(),true);await p.locator('#notes').press('Control+Shift+Enter');assert.equal(await p.locator('#label').inputValue(),label);assert.equal(await p.locator('#notes').inputValue(),notes);assert.deepEqual(await read(),changed);
  });
  await group(browser,'Discarding the next empty draft preserves Undo for the latest explicit addition.',async p=>{
   await start(p);const before=await read();await p.locator('#label').fill('An addition to undo');await successful(p,()=>p.locator('#add-another').click());await blankNext(p);await p.locator('#discard').click();assert.equal(await p.locator('#add-another').isHidden(),true);assert.equal(await p.locator('#undo').isEnabled(),true);await successful(p,()=>p.locator('#undo').click());assert.deepEqual((await read()).nodes,before.nodes);
  });
  const nearLimit=structuredClone(fixture);for(let i=0;i<296;i++)nearLimit.nodes.push({id:'existing-'+i,parentId:'a',label:'Existing question '+i,kind:'question',status:'open',notes:'',relation:{type:'part-of'}});
  await group(browser,'The 300th node saves successfully without opening an unusable continuation.',async p=>{
   assert.equal((await read()).nodes.length,299);await start(p,'b');await p.locator('#label').fill('The final permitted input');const saved=await successful(p,()=>p.locator('#add-another').click());await p.waitForFunction(()=>document.querySelector('#draft-type-row').hidden);assert.equal(saved.nodes.length,300);assert.equal(saved.nodes.filter(n=>n.label==='The final permitted input').length,1);assert.equal(await p.locator('#add-another').isHidden(),true);assert.match(await p.locator('#toast').textContent(),/300/);assert.equal(await p.locator('#label').inputValue(),'The final permitted input');
  },nearLimit);
  await group(browser,'On narrow touch screens Add and Add another stay reachable together; continued metric drafts keep the right parent and inputs.',async p=>{
   await card(p,'b').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#label').value==='Check revenue inputs');await start(p,'b');await p.locator('#label').fill('Orders each month');for(const id of ['save','add-another']){const box=await p.locator('#'+id).boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844,id+' stays inside the screen');assert.equal(await p.locator('#'+id).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),true,id+' is an actual touch target')}
   await p.screenshot({path:path.join(output,'repeated-add-mobile.png')});await successful(p,()=>p.locator('#add-another').tap());await blankNext(p,'b');assert.equal(await p.locator('#kind').inputValue(),'metric');assert.equal(await p.locator('#relation-type').inputValue(),'calculated-from');assert.equal(await p.locator('#status').inputValue(),'open');
  },fixture,{viewport:{width:390,height:844},hasTouch:true});
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
 }finally{await browser.close()}
})().catch(async error=>{await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,errors,failure:error.stack},null,2)+'\n');console.error(error);process.exitCode=1});
