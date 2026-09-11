/* Rendered branch-motion checks. Only use a disposable live session.
   NODE_PATH=/path/to/node_modules node tests/motion-smoke.cjs http://127.0.0.1:PORT /tmp/motion-qa */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const [url,output]=process.argv.slice(2);
if(!url||!output||!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)||/:62031\/?$/.test(url))throw Error('Use a disposable loopback session, never a user canvas.');
const origin=url.replace(/\/$/,''),checks=[],errors=[],evidence={};
const fixture={schemaVersion:1,revision:1,title:'Fictional motion check',question:'What should this fictional bookshop investigate?',context:'Disposable motion fixture; no real findings.',nextQuestion:'',nodes:[
{id:'root',parentId:null,label:'Improve the bookshop',kind:'question',method:'issue',status:'open',notes:''},
{id:'a',parentId:'root',label:'Understand queues',kind:'question',status:'open',notes:'',relation:{type:'part-of'}},
{id:'a1',parentId:'a',label:'Check counter time',kind:'question',status:'uncertain',notes:'',relation:{type:'part-of'}},
{id:'b',parentId:'root',label:'Understand delivery',kind:'question',status:'open',notes:'',relation:{type:'part-of'}},
{id:'b1',parentId:'b',label:'Check packing time',kind:'question',status:'uncertain',notes:'',relation:{type:'part-of'}}],decision:{recommendation:'',rationale:'',uncertainties:[],nextSteps:[]}};
const card=(p,id)=>p.locator('.tree-node[data-id="'+id+'"]');
const child=(id,label)=>({id,parentId:'a',label,kind:'question',status:'open',notes:'',relation:{type:'part-of'}});
async function read(){const r=await fetch(origin+'/api/state');assert.equal(r.status,200);return r.json();}
async function put(state){const latest=await read();const r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:latest.revision,state})});assert.equal(r.status,200,await r.clone().text());return r.json();}
async function until(check,message,timeout=10000){const end=Date.now()+timeout;while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,30));}assert.fail(message);}
async function fresh(p){await put(structuredClone(fixture));await p.goto(origin);await card(p,'b').waitFor();await p.waitForTimeout(320);}
async function armAdd(p,label){await card(p,'a').focus();await p.keyboard.press('a');assert.equal(await p.locator('#save').getAttribute('aria-label'),'Add thought');await p.locator('#label').fill(label);}
async function submit(p){const pending=p.waitForResponse(r=>r.url().endsWith('/api/state')&&r.request().method()==='PUT');await p.locator('#label').press('Control+Enter');assert.equal((await pending).status(),200);return read();}
async function download(p,format,name){await p.locator('details.export summary').click();const pending=p.waitForEvent('download');await p.locator('[data-export="'+format+'"]').click();const file=path.join(output,name);await(await pending).saveAs(file);return file;}
async function startTrace(p){await p.evaluate(()=>{
  window.__motionSamples=[];window.__recordTreeMotion=true;
  function sample(t){
    if(!window.__recordTreeMotion)return;
    const viewport=document.querySelector('#viewport'),inverse=viewport.getScreenCTM().inverse(),nodes={},edges={};
    for(const g of document.querySelectorAll('.tree-node')){
      const rect=g.querySelector('rect.card'),bounds=rect.getBBox(),screen=rect.getScreenCTM(),matrix=inverse.multiply(g.getScreenCTM());
      const left=new DOMPoint(bounds.x,bounds.y+bounds.height/2).matrixTransform(screen),right=new DOMPoint(bounds.x+bounds.width,bounds.y+bounds.height/2).matrixTransform(screen);
      nodes[g.dataset.id]={x:matrix.e,y:matrix.f,opacity:Number(getComputedStyle(g).opacity),left:{x:left.x,y:left.y},right:{x:right.x,y:right.y}};
    }
    for(const edge of document.querySelectorAll('.edge[data-child-id]')){
      const length=edge.getTotalLength(),matrix=edge.getScreenCTM();
      const start=edge.getPointAtLength(0).matrixTransform(matrix),end=edge.getPointAtLength(length).matrixTransform(matrix);
      edges[edge.dataset.childId]={start:{x:start.x,y:start.y},end:{x:end.x,y:end.y},opacity:Number(getComputedStyle(edge).opacity)};
    }
    window.__motionSamples.push({t,nodes,edges,camera:viewport.getAttribute('transform'),focus:document.activeElement?.id,notes:document.querySelector('#notes').value});
    window.__motionFrame=requestAnimationFrame(sample);
  }
  sample(performance.now());
});}
async function finishTrace(p,name){await p.waitForTimeout(340);const samples=await p.evaluate(()=>{window.__recordTreeMotion=false;cancelAnimationFrame(window.__motionFrame);return window.__motionSamples;});evidence[name]=samples;return samples;}
function finalPositions(trace){return trace.at(-1).nodes;}
function checkMovement(trace,id,message){
  const values=trace.map(f=>f.nodes[id]?.y).filter(Number.isFinite),from=values[0],to=values.at(-1),distance=Math.abs(to-from);
  assert.ok(distance>30,message+': the fixture must actually move this existing card');
  const middle=values.filter(y=>Math.abs(y-from)>1&&Math.abs(y-to)>1);
  assert.ok(new Set(middle.map(y=>y.toFixed(1))).size>=3,message+': at least three genuinely intermediate positions must be painted');
  return {from,to,distance};
}
function checkConnections(trace,states){
  const parents=new Map(states.flatMap(s=>s.nodes.map(n=>[n.id,n.parentId])));let checked=0;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  for(const frame of trace)for(const[id,edge]of Object.entries(frame.edges)){
    const parent=frame.nodes[parents.get(id)],node=frame.nodes[id];if(!parent||!node||edge.opacity<.05||node.opacity<.05)continue;
    assert.ok(distance(edge.start,parent.right)<2,'A moving connector stays attached to its parent: '+id);
    assert.ok(distance(edge.end,node.left)<2,'A moving connector stays attached to its child: '+id);checked++;
  }
  assert.ok(checked>20,'The test measured actual connector endpoints across frames');
}
function checkEnter(trace,id){
  const visible=trace.map(f=>f.nodes[id]).filter(Boolean);assert.ok(visible.length>3,'The new card is sampled over several frames');
  assert.ok(visible.some(n=>n.opacity>.01&&n.opacity<.99),'The new card visibly enters rather than appearing fully opaque');
  assert.ok(visible.some(n=>Math.abs(n.x-visible.at(-1).x)>1),'The new card has visible entering movement');
  assert.ok(visible.at(-1).opacity>.999,'The new card finishes fully visible');
}
function samePositions(actual,expected,message){
  assert.deepEqual(Object.keys(actual).sort(),Object.keys(expected).sort(),message+': node IDs');
  for(const[id,p]of Object.entries(expected)){assert.ok(Math.abs(actual[id].x-p.x)<.1&&Math.abs(actual[id].y-p.y)<.1,message+': '+id);assert.ok(actual[id].opacity>.999,message+': full opacity '+id);}
}
async function positions(p){await startTrace(p);return finalPositions(await finishTrace(p,'reference-'+Object.keys(evidence).length));}

(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:980},reducedMotion:'no-preference'});
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  try{
    await fresh(page);await armAdd(page,'Check Saturday staffing');
    await page.screenshot({path:path.join(output,'01-before-add.png')});
    await startTrace(page);const manual=await submit(page),added=manual.nodes.find(n=>n.label==='Check Saturday staffing');
    await page.waitForFunction(id=>{const g=document.querySelector('.tree-node[data-id="'+id+'"]');return g&&Number(getComputedStyle(g).opacity)>.03&&Number(getComputedStyle(g).opacity)<.98;},added.id);
    await page.screenshot({path:path.join(output,'02-during-add.png')});
    const manualTrace=await finishTrace(page,'manual-add');
    await page.screenshot({path:path.join(output,'03-after-add.png')});
    checkMovement(manualTrace,'b','Manual Add');checkMovement(manualTrace,'root','Manual Add root');checkEnter(manualTrace,added.id);checkConnections(manualTrace,[manual]);
    assert.equal(new Set(manualTrace.map(f=>f.camera)).size,1,'Adding a branch never jumps the camera');
    checks.push('Manual Add paints intermediate existing-card positions, a visible entrance and connected edges without moving the camera.');

    await card(page,'a').click();await page.locator('#notes').fill('Human draft');
    await startTrace(page);const external=await read();external.nodes.push(child('external','Check delivery handover'));await put(external);
    for(let i=0;i<22;i++){await page.locator('#notes').press('End');await page.keyboard.type('.');await page.waitForTimeout(90);}
    await card(page,'external').waitFor();const humanText='Human draft'+'.'.repeat(22),externalTrace=await finishTrace(page,'external-add');
    assert.equal(await page.locator('#notes').inputValue(),humanText,'Agent additions preserve every typed character');
    const afterAppearance=externalTrace.filter(f=>f.nodes.external);
    assert.ok(afterAppearance.every(f=>f.focus==='notes'),'Agent layout updates never take focus from the human notes');
    checkMovement(externalTrace,'b','External addition');checkEnter(externalTrace,'external');checkConnections(externalTrace,[await read()]);
    assert.equal(new Set(externalTrace.map(f=>f.camera)).size,1,'External additions keep the camera fixed');
    await page.locator('#notes').press('Control+Enter');await until(async()=>(await read()).nodes.find(n=>n.id==='a').notes===humanText,'The human note must remain saveable after an agent addition.');
    checks.push('An agent’s branch addition moves the existing tree smoothly while human typing, focus and camera stay intact.');

    await fresh(page);await startTrace(page);
    await armAdd(page,'Rapid first');const first=await submit(page);
    await armAdd(page,'Rapid second');const second=await submit(page);
    const html=await download(page,'html','during-motion.html');
    const rapidTrace=await finishTrace(page,'rapid-additions');checkMovement(rapidTrace,'b','Rapid additions');checkConnections(rapidTrace,[first,second]);
    const b=rapidTrace.filter(f=>f.nodes.b);let smallFrameSteps=0;
    for(let i=1;i<b.length;i++)if(b[i].t-b[i-1].t<55){assert.ok(b[i].nodes.b.y>=b[i-1].nodes.b.y-.1,'Retargeting does not jump an existing card backwards');assert.ok(b[i].nodes.b.y-b[i-1].nodes.b.y<85,'Retargeting starts from the painted position rather than snapping to a target');smallFrameSteps++;}
    assert.ok(smallFrameSteps>8,'Several successive rendered frames were checked');
    const ids=await page.locator('.tree-node').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));assert.equal(new Set(ids).size,ids.length,'Rapid updates leave no duplicate card elements');
    const removed=second.nodes.find(n=>n.label==='Rapid first').id,replaced=structuredClone(second);replaced.nodes=replaced.nodes.filter(n=>n.id!==removed);replaced.nodes.push(child('replacement','Replacement question'));await put(replaced);
    await card(page,'replacement').waitFor();await page.waitForTimeout(340);
    assert.equal(await card(page,removed).count(),0,'Removed cards leave no ghosts');
    assert.deepEqual((await page.locator('.tree-node').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).sort(),replaced.nodes.map(n=>n.id).sort());
    assert.deepEqual((await page.locator('.edge').evaluateAll(edges=>edges.map(e=>e.dataset.childId))).sort(),replaced.nodes.filter(n=>n.parentId).map(n=>n.id).sort(),'Every remaining node has exactly its expected connector');
    checks.push('Rapid additions retarget from painted positions; later canonical replacement settles with exactly the current cards and edges.');

    await startTrace(page);await card(page,'b').click();await card(page,'a').click();await page.locator('#notes').fill('A settled note-only edit.');
    await until(async()=>(await read()).nodes.find(n=>n.id==='a').notes==='A settled note-only edit.','The note edit should autosave.');
    const noteTrace=await finishTrace(page,'selection-and-autosave'),stable=noteTrace[0].nodes;
    for(const frame of noteTrace)samePositions(frame.nodes,stable,'Selection and note-only autosave do not restart motion');
    assert.equal(new Set(noteTrace.map(f=>f.camera)).size,1);
    checks.push('Selection and notes autosave produce no position reset, fade restart or camera movement.');

    const exported=await context.newPage();exported.setDefaultTimeout(10000);exported.on('pageerror',e=>errors.push(e.message));await exported.emulateMedia({reducedMotion:'reduce'});await exported.goto(pathToFileURL(html).href);await card(exported,'b').waitFor();
    samePositions(await positions(exported),finalPositions(rapidTrace),'An export taken during motion opens at the correct complete final layout');
    const json=await download(exported,'json','during-motion.json');assert.deepEqual(JSON.parse(await fs.readFile(json,'utf8')),second,'Motion exports retain the exact canonical snapshot');await exported.close();
    checks.push('An export made during motion contains the complete canonical snapshot and opens at its final layout.');

    await put(structuredClone(fixture));const reduced=await context.newPage();reduced.setDefaultTimeout(10000);reduced.on('pageerror',e=>errors.push(e.message));await reduced.emulateMedia({reducedMotion:'reduce'});await reduced.goto(origin);await card(reduced,'b').waitFor();await reduced.waitForTimeout(100);
    await armAdd(reduced,'Reduced motion addition');await startTrace(reduced);const reducedState=await submit(reduced),reducedId=reducedState.nodes.find(n=>n.label==='Reduced motion addition').id;
    const reducedTrace=await finishTrace(reduced,'reduced-motion'),present=reducedTrace.filter(f=>f.nodes[reducedId]);
    assert.ok(present.length>2);for(const frame of present)samePositions(frame.nodes,finalPositions(reducedTrace),'Reduced motion paints the final layout immediately');checkConnections(reducedTrace,[reducedState]);
    const reference=await context.newPage();reference.setDefaultTimeout(10000);await reference.emulateMedia({reducedMotion:'reduce'});await reference.goto(origin);await card(reference,'b').waitFor();
    samePositions(finalPositions(reducedTrace),await positions(reference),'Animated and fresh rendered layouts agree');await reference.close();await reduced.close();
    checks.push('Reduced motion shows final card and connector geometry immediately, matching a fresh render.');

    await page.setViewportSize({width:390,height:844});await fresh(page);await armAdd(page,'Mobile branch');await page.waitForTimeout(100);await startTrace(page);const mobile=await submit(page),mobileId=mobile.nodes.find(n=>n.label==='Mobile branch').id;
    const mobileTrace=await finishTrace(page,'mobile-add');checkMovement(mobileTrace,'b','Mobile Add');checkEnter(mobileTrace,mobileId);checkConnections(mobileTrace,[mobile]);
    assert.equal(await page.locator('.inspector').isVisible(),true,'Adding on mobile keeps editing available');
    const actions=await page.locator('#edit-form > .edit-actions').boundingBox();assert.ok(actions.x>=0&&actions.y>=0&&actions.x+actions.width<=391&&actions.y+actions.height<=845,'Mobile actions remain reachable during and after adding');
    await page.screenshot({path:path.join(output,'04-mobile-add.png')});checks.push('Mobile additions animate with attached connectors while the notes panel and bottom controls remain usable.');
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'samples.json'),JSON.stringify(evidence)+'\n');await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log(JSON.stringify({passed:true,checks},null,2));
  }catch(error){await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});await fs.writeFile(path.join(output,'samples.json'),JSON.stringify(evidence)+'\n');await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,error:error.message},null,2)+'\n');throw error;}
  finally{await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
