/* One investigation at a time. Run only against a disposable loopback session. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const [url,output]=process.argv.slice(2);
if(!url||!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url))throw Error('Use a disposable local session.');
const origin=url.replace(/\/$/,''),checks=[],errors=[];
const work=(id,nodeId,title)=>({id,nodeId,title,analysis:'Keep the existing method.',evidenceNeeded:'Actual observations.',source:'Fictional fixture; not real findings.',priorityReason:'Could change the choice.',owner:'',dueDate:'',status:'open',finding:'Original '+id+' finding.',limitations:'Unknown demand.'});
const fixture={schemaVersion:1,revision:1,title:'Fictional investigation selector',question:'What should the fictional bookshop check?',context:'Disposable QA only.',nextQuestion:'',nodes:[
  {id:'root',parentId:null,label:'Decide whether to hold a workshop',kind:'question',status:'open',notes:'Keep this human note.'},
  {id:'workshop',parentId:'root',label:'Paid workshop',kind:'option',status:'uncertain',notes:'Human wording stays intact.'},
  {id:'storage',parentId:'root',label:'Keep storage',kind:'option',status:'open',notes:'Preserve this alternative.'}
],decision:{recommendation:'Wait for evidence.',rationale:'An illustrative case is not demand evidence.',uncertainties:['Demand'],nextSteps:['Check before committing.']},analysis:{workplan:[work('demand','workshop','Check willingness to pay'),work('delivery','workshop','Check staff availability'),work('space','storage','Check storage needs')],brief:{situation:'A fictional room is available.',complication:'Demand is unknown.',answer:'Wait.',sections:[],basedOnRevision:1}}};
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json()}
async function put(state){const before=await read(),r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state})});assert.equal(r.status,200,await r.clone().text());return r.json()}
const active=p=>p.locator('#analysis-work-body [data-work-id]');
const title=p=>p.getByRole('textbox',{name:'Next step',exact:true});
async function choose(p,id){await p.locator('#analysis-work-choice').selectOption(id);assert.equal(await active(p).getAttribute('data-work-id'),id);assert.equal(await p.locator('#analysis-work-choice').evaluate(el=>el===document.activeElement),true)}
async function save(p){const pending=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await p.locator('#analysis-save').click();assert.equal((await pending).status(),200);await p.waitForFunction(()=>!analysisDirty);return read()}
async function back(p){await p.locator('#analysis-close').click();await p.locator('#analysis-panel').waitFor({state:'hidden'})}
async function exportFile(p,format,name){await p.locator('details.export summary').click();const pending=p.waitForEvent('download');await p.locator('[data-export="'+format+'"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return file}
async function openWork(p,label='Check staff availability'){await p.locator('.tree-node[data-id="workshop"]').click();await p.locator('#branch-work').getByRole('button',{name:new RegExp('^'+label)}).click()}
(async()=>{
  await fs.mkdir(output,{recursive:true});await put(structuredClone(fixture));
  const browser=await chromium.launch({headless:true});let p;
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await openWork(p);
    const baseline=await read();
    assert.equal(await active(p).count(),1);assert.equal(await active(p).getAttribute('data-work-id'),'delivery');
    assert.equal(await p.getByRole('combobox',{name:'Next step',exact:true}).count(),1);
    assert.deepEqual(await p.locator('#analysis-work-choice option').evaluateAll(options=>options.map(o=>o.value)),['demand','delivery']);
    await choose(p,'demand');await p.locator('#analysis-work-choice').press('Tab');
    assert.equal(await active(p).getByRole('button',{name:'Remove',exact:true}).evaluate(el=>el===document.activeElement),true,'Tab leaves the native chooser normally');
    await choose(p,'delivery');
    assert.deepEqual(await read(),baseline);
    checks.push('Only the requested investigation opens; the native chooser lists the same branch, retains keyboard focus and Tab navigation, and changes no saved content.');

    const deliveryText='Human delivery note.\nKeep the exact second line and £20 amount.';
    await p.getByLabel('Finding',{exact:true}).fill(deliveryText);
    await choose(p,'demand');await title(p).fill('Check actual willingness to pay');
    await p.getByLabel('Finding',{exact:true}).fill('Human demand note remains tentative.');
    assert.equal(await p.locator('#analysis-work-choice option:checked').textContent(),'Check actual willingness to pay');
    await choose(p,'delivery');assert.equal(await p.getByLabel('Finding',{exact:true}).inputValue(),deliveryText);
    assert.deepEqual(await read(),baseline,'Switching drafts must not autosave');
    const saved=await save(p),expected=structuredClone(baseline);expected.revision=saved.revision;
    expected.analysis.workplan[0].title='Check actual willingness to pay';expected.analysis.workplan[0].finding='Human demand note remains tentative.';expected.analysis.workplan[1].finding=deliveryText;
    assert.equal(saved.revision,baseline.revision+1);assert.deepEqual(saved,expected);
    checks.push('Title and multiline findings survive switching; one Save preserves every other field, branch, conclusion and brief.');

    await title(p).fill('');await choose(p,'demand');await p.locator('#analysis-save').click();
    await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('Give each work item a title'));assert.deepEqual(await read(),saved);
    await choose(p,'delivery');assert.equal(await title(p).inputValue(),'');assert.equal(await p.evaluate(()=>analysisDirty),true);
    await title(p).fill('Check staff availability');await save(p);
    checks.push('An invalid hidden investigation stays in the draft and blocks saving until corrected.');

    await p.getByLabel('Finding',{exact:true}).fill('My unsaved delivery finding.');
    const external=await read();external.analysis.workplan[1].finding='Newer agent finding.';await put(external);
    await p.locator('#analysis-conflict').waitFor({state:'visible'});await choose(p,'demand');
    assert.equal(await p.locator('#analysis-conflict').isVisible(),true);assert.equal(await p.locator('#analysis-save').isDisabled(),true);
    await choose(p,'delivery');assert.equal(await p.getByLabel('Finding',{exact:true}).inputValue(),'My unsaved delivery finding.');
    await p.locator('#analysis-discard').click();await p.locator('#analysis-conflict').waitFor({state:'hidden'});
    assert.equal(await p.getByLabel('Finding',{exact:true}).inputValue(),'Newer agent finding.');
    checks.push('Switching investigations retains conflict protection and human wording; explicit discard adopts the newer saved finding.');

    const beforeBatch=await read();await active(p).getByRole('button',{name:'Remove',exact:true}).click();
    assert.equal(await active(p).getAttribute('data-work-id'),'demand');assert.equal(await active(p).count(),1);assert.equal(await p.locator('#analysis-work-choice').count(),0);
    await p.locator('#analysis-work-add').click();const newId=await active(p).getAttribute('data-work-id');
    assert.notEqual(newId,'demand');assert.equal(await p.locator('#analysis-work-choice').inputValue(),newId);assert.equal(await active(p).count(),1);
    await title(p).fill('Check booking evidence');const afterBatch=await save(p);
    assert.equal(afterBatch.analysis.workplan.some(w=>w.id==='delivery'),false);assert.equal(afterBatch.analysis.workplan.find(w=>w.id===newId).nodeId,'workshop');
    assert.deepEqual(afterBatch.analysis.workplan.find(w=>w.id==='space'),beforeBatch.analysis.workplan.find(w=>w.id==='space'));
    await back(p);await p.locator('#undo').click();await p.waitForFunction(()=>state.analysis.workplan.some(w=>w.id==='delivery'));
    const undone=await read();assert.deepEqual(undone.analysis,beforeBatch.analysis);
    checks.push('Removing the selected item falls back to a remaining item, a single item hides the chooser, Add selects the new draft, and Undo restores the prior work.');

    const expectedExport=await read(),html=await exportFile(p,'html','investigations.html'),json=await exportFile(p,'json','investigations.json');
    assert.deepEqual(JSON.parse(await fs.readFile(json,'utf8')),expectedExport);
    const offline=await context.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.goto(pathToFileURL(html).href);await openWork(offline);
    assert.equal(await active(offline).count(),1);await choose(offline,'demand');
    assert.equal(await title(offline).inputValue(),'Check actual willingness to pay');
    await offline.setViewportSize({width:390,height:844});await offline.locator('#analysis-work-choice').scrollIntoViewIfNeeded();
    const box=await offline.locator('#analysis-work-choice').boundingBox(),footer=await offline.locator('#analysis-panel .analysis-footer').boundingBox();
    assert.ok(box.x>=0&&box.x+box.width<=391&&box.y>=0&&box.y+box.height<=845);
    assert.ok(footer.y>=0&&footer.y+footer.height<=845);
    await offline.screenshot({path:path.join(output,'work-selector-mobile.png')});
    await p.setViewportSize({width:1440,height:1000});await openWork(p);await p.screenshot({path:path.join(output,'work-selector-desktop.png')});
    assert.deepEqual(errors,[]);
    checks.push('Complete HTML/JSON exports retain every investigation; the reopened selector and save controls fit a 390px panel.');
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log(JSON.stringify({passed:true,checks},null,2));
  }catch(error){if(p)await p.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,error:error.stack,errors},null,2)+'\n');throw error}finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
