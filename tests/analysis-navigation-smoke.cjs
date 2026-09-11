const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const [url,out]=process.argv.slice(2);if(!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)||!out)throw Error('Use a disposable session.');const origin=url.replace(/\/$/,''),checks=[];
async function read(){return(await fetch(origin+'/api/state')).json()}
async function put(state){const before=await read(),r=await fetch(origin+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:before.revision,state})});assert.equal(r.status,200);return r.json()}
(async()=>{await fs.mkdir(out,{recursive:true});let fixture=await read();fixture.analysis={brief:{situation:'Fictional review',complication:'Unknown demand',answer:'Hold off',sections:[],basedOnRevision:fixture.revision}};fixture.decision={recommendation:'Hold off',rationale:'Original human reason',uncertainties:[],nextSteps:[]};await put(fixture);const b=await chromium.launch({headless:true});try{const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.locator('#analysis-open').click();await p.locator('#brief-detail summary').click();const external=await read();external.decision.rationale='Newer agent reason must survive export and the next save.';await put(external);const download=p.waitForEvent('download');await p.getByRole('button',{name:'Printable brief',exact:true}).click();await(await download).saveAs(path.join(out,'review.html'));assert.equal(await p.getByLabel('Why',{exact:true}).inputValue(),external.decision.rationale);await p.getByLabel('Next steps',{exact:true}).fill('Check the latest booking evidence.');await p.locator('#analysis-save').click();await p.waitForFunction(()=>!analysisDirty);assert.equal((await read()).decision.rationale,external.decision.rationale);checks.push('Export refreshes the whole analysis/conclusion snapshot; a later manual edit preserves the agent’s newer conclusion.');
await p.getByLabel('Current position',{exact:true}).fill('Saved once despite simultaneous navigation.');const before=await read();let release,seen;const gate=new Promise(r=>release=r),started=new Promise(r=>seen=r);await p.route('**/api/state',async route=>{if(route.request().method()==='GET'){seen();await gate}await route.continue()});await p.locator('#analysis-save').click();await started;const target=p.locator('.tree-node').first();await target.click();assert.equal(await p.locator('#analysis-panel').evaluate(el=>el.inert),true);release();await p.locator('#analysis-panel').waitFor({state:'hidden'});const saved=await read();assert.equal(saved.decision.recommendation,'Saved once despite simultaneous navigation.');assert.equal(saved.revision,before.revision+1);await p.unroute('**/api/state');assert.deepEqual(errors,[]);checks.push('Saving and selecting a branch share one pending save; the editor stays locked until completion and the conclusion is written once.');
// An untouched create draft may be abandoned, but an explicit Save must finish first.
await p.getByRole('button',{name:'+ Calculation',exact:true}).click();
const pendingModelId=await p.evaluate(()=>analysisModelId);
const beforeUntouched=await read();
const expectedModel=await p.evaluate(()=>structuredClone(analysisDraft.models.find(m=>m.id===analysisModelId)));
assert.equal(await p.evaluate(()=>analysisOpeningSnapshot===JSON.stringify({analysis:analysisDraft,decision:analysisDecisionDraft})),true);
let releaseUntouched,seenUntouched;
const untouchedGate=new Promise(r=>releaseUntouched=r),untouchedStarted=new Promise(r=>seenUntouched=r);
await p.route('**/api/state',async route=>{if(route.request().method()==='GET'){seenUntouched();await untouchedGate}await route.continue()});
await p.locator('#analysis-save').click();await untouchedStarted;
await target.click();
assert.equal(await p.locator('#analysis-panel').isVisible(),true,'Navigation waits for the explicit save even when the new calculation is unchanged');
assert.equal(await p.locator('#analysis-panel').evaluate(el=>el.inert),true);
releaseUntouched();
await p.locator('#analysis-panel').waitFor({state:'hidden'});
const afterUntouched=await read();
assert.equal(afterUntouched.revision,beforeUntouched.revision+1,'Exactly one canonical write');
assert.deepEqual(afterUntouched.analysis.models,[...(beforeUntouched.analysis.models||[]),expectedModel]);
assert.equal(afterUntouched.analysis.models.filter(m=>m.id===pendingModelId).length,1);
assert.deepEqual(afterUntouched.decision,beforeUntouched.decision);
await p.unroute('**/api/state');assert.deepEqual(errors,[]);
checks.push('Explicitly saving an untouched new calculation serializes immediate card navigation and preserves exactly the intended record once.');
await fs.writeFile(path.join(out,'results.json'),JSON.stringify({passed:true,checks},null,2)+'\n');console.log(JSON.stringify({passed:true,checks},null,2));}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
