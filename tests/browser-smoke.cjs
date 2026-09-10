/* Optional rendered checks. Run with Playwright installed:
   node tests/browser-smoke.cjs http://127.0.0.1:PORT /tmp/canvas-browser-checks
   Use a disposable live session: this test replaces its fictional state. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) throw Error('Provide a disposable loopback session URL and output directory.');
const origin = url.replace(/\/$/, '');
const results = [];
const fixture = (method = 'exploration', kind = 'question') => ({
  schemaVersion: 1, revision: 1, title: 'Fictional browser test',
  question: 'How should the fictional bookshop use its spare room?',
  context: 'Fictional test. No customer demand has been established.', nextQuestion: '',
  problem: {situation: 'A spare room is available.', desiredChange: 'Explore useful uses.', constraints: 'Five staff hours a week.'},
  nodes: [{id: 'root', parentId: null, label: 'Use the spare room', kind, status: 'open', notes: 'Original root notes.', method},
          {id: 'existing', parentId: 'root', label: 'Keep as storage', kind: 'option', status: 'open', notes: 'Preserve this alternative.', relation: {type: 'choice'}}],
  decision: {recommendation: '', rationale: '', uncertainties: [], nextSteps: []}
});
async function read() { const r = await fetch(origin + '/api/state'); assert.equal(r.status, 200); return r.json(); }
async function put(state) { const latest = await read(); const r = await fetch(origin + '/api/state', {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:latest.revision,state})}); assert.equal(r.status,200,await r.clone().text()); return r.json(); }
async function download(page, format, name) {
  await page.locator('details.export summary').click();
  const promised = page.waitForEvent('download');
  await page.locator('[data-export="' + format + '"]').click();
  const file = path.join(output, name); await (await promised).saveAs(file); return file;
}
(async () => {
  await fs.mkdir(output, {recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:850}});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    const load = async state => { await put(state); await page.goto(origin); await page.locator('#question').waitFor(); await page.locator('.tree-node[data-id="root"]').click(); };
    await load(fixture());
    assert.equal(await page.locator('#main').evaluate(el=>el.classList.contains('inspect-open')), false);
    const original = await read();
    await page.locator('#add-primary').click();
    assert.equal((await read()).nodes.length, original.nodes.length, 'Opening Add must not save a placeholder');
    await page.locator('#label').fill('Possible poetry evenings');
    await page.locator('#discard').click();
    assert.deepEqual(await read(), original, 'Discard must preserve the complete canonical state');
    results.push('Add opens an unsaved draft; discard preserves the original state.');

    for (const [method,kind] of [['issue','question'],['hypothesis','hypothesis'],['driver','metric'],['solution','objective'],['objectives','objective'],['decision','question'],['opportunity','outcome'],['argument','assumption']]) {
      await load(fixture(method,kind));
      await page.locator('#approach-open').click();
      assert.equal(await page.locator('#method-choice').inputValue(),method);
      assert.ok((await page.locator('#approach-panel').innerText()).length > 150);
      assert.ok(await page.locator('#approach-panel a[href^="https://"]').count());
      await page.keyboard.press('Escape');
      await page.locator('#add-primary').click();
      await page.locator('#label').fill('A ' + method + ' addition');
      const response=page.waitForResponse(r=>r.url().endsWith('/api/state') && r.request().method()==='PUT');
      await page.locator('#save').click(); assert.equal((await response).status(),200);
      const state=await read(), added=state.nodes.find(n=>n.label==='A '+method+' addition');
      assert.ok(added?.relation?.type, method+' must save a meaningful connection');
      assert.equal(added.parentId,'root'); assert.notEqual(added.status,'supported');
      assert.equal(state.nodes.find(n=>n.id==='existing').notes,'Preserve this alternative.');
      assert.equal(state.decision.recommendation,'');
      await page.locator('#undo').click();
      await page.waitForFunction(()=>document.querySelectorAll('.tree-node').length===2);
      assert.equal((await read()).nodes.length,2);
      results.push(method+': guide/source visible, typed addition saved, original alternative preserved, undo works.');
    }

    for (const [method,rootKind,sequence] of [
      ['hypothesis','hypothesis',['question','evidence']],
      ['opportunity','outcome',['question','solution','test','evidence']],
      ['decision','question',['option','chance','outcome']],
      ['argument','claim',['claim','evidence']]
    ]) {
      await load(fixture(method,rootKind));
      let parent='root';
      for(const kind of sequence) {
        await page.locator('#add-primary').click();
        assert.equal(await page.locator('#kind').inputValue(),kind,method+' should offer a suitable component under this parent');
        await page.locator('#label').fill(method+' '+kind);
        const response=page.waitForResponse(r=>r.url().endsWith('/api/state') && r.request().method()==='PUT');
        await page.locator('#save').click(); assert.equal((await response).status(),200);
        const child=(await read()).nodes.find(n=>n.label===method+' '+kind);
        assert.equal(child.parentId,parent); assert.notEqual(child.status,'supported'); parent=child.id;
      }
    }
    results.push('Hypothesis, product-discovery, decision and argument branches offer the correct successive component roles.');

    await load(fixture('issue'));
    const beforeMethod=await read();
    await page.locator('#approach-open').click();
    await page.locator('#method-choice').selectOption('driver');
    await page.locator('#method-apply').click();
    await page.locator('#approach-panel').waitFor({state:'hidden'});
    const changedMethod=await read();
    assert.equal(changedMethod.nodes[0].method,'driver');
    assert.deepEqual(changedMethod.nodes.slice(1),beforeMethod.nodes.slice(1));
    assert.equal(changedMethod.nodes[0].label,beforeMethod.nodes[0].label);
    assert.equal(await page.locator('#add-primary').isEnabled(),true,'Add remains available after changing the approach');
    results.push('Changing an approach preserves all existing content and child metadata.');

    await page.locator('#problem-open').click();
    await page.locator('#problem-desiredChange').fill('Make better use of the room without adding staff.');
    await page.locator('#problem-save').click();
    await page.locator('#problem-panel').waitFor({state:'hidden'});
    assert.equal((await read()).problem.desiredChange,'Make better use of the room without adding staff.');
    assert.equal(await page.locator('#add-primary').isEnabled(),true,'Add remains available after saving the problem');
    const saved=await read();
    const jsonPath=await download(page,'json','complete.json');
    assert.deepEqual(JSON.parse(await fs.readFile(jsonPath,'utf8')),saved);
    const htmlPath=await download(page,'html','complete.html');
    const svgPath=await download(page,'svg','complete.svg');
    const mdPath=await download(page,'md','complete.md');
    assert.match(await fs.readFile(svgPath,'utf8'),/canonical-state/);
    assert.match(await fs.readFile(svgPath,'utf8'),/Make better use/);
    assert.match(await fs.readFile(mdPath,'utf8'),/Make better use/);
    const standalone=await browser.newPage(); await standalone.goto('file://'+htmlPath);
    assert.equal(await standalone.locator('dialog[open]').count(),0);
    await standalone.locator('.tree-node[data-id="root"]').click();
    await standalone.locator('#approach-open').click();
    assert.equal(await standalone.locator('#method-choice').inputValue(),'driver');
    assert.equal(await standalone.locator('#method-choice option').count(),9,'Standalone export must not duplicate method choices');
    await standalone.close();
    results.push('Problem brief saves; JSON round-trip is exact; HTML, SVG and Markdown carry the semantics.');

    await load(fixture('issue'));
    await page.locator('#inspect-toggle').click();
    await page.locator('#notes').fill('A draft that must survive a concurrent edit.');
    const external=await read(); external.nodes[0].notes='New notes from another editor.'; await put(external);
    await page.locator('#conflict').waitFor({state:'visible'});
    assert.equal(await page.locator('#notes').inputValue(),'A draft that must survive a concurrent edit.');
    await page.locator('#discard').click();
    assert.equal(await page.locator('#notes').inputValue(),'New notes from another editor.');
    await page.waitForFunction(()=>document.querySelector('#sync').textContent==='Saved locally');
    results.push('Concurrent external edits keep a local draft and expose the conflict.');
    await page.locator('#close-details').click();
    await page.setViewportSize({width:390,height:844});
    await page.locator('#approach-open').click();
    const rect=await page.locator('#approach-panel').boundingBox();
    assert.ok(rect.x>=0 && rect.x+rect.width<=391 && rect.y>=0 && rect.y+rect.height<=845,'Approach must fit mobile viewport');
    await page.screenshot({path:path.join(output,'mobile-approach.png')});
    await page.keyboard.press('Escape');
    await page.locator('#add-primary').click();
    assert.ok(await page.locator('#label').isVisible());
    await page.locator('#discard').click();
    await page.locator('#close-details').click();
    await page.setViewportSize({width:1280,height:850});
    await page.screenshot({path:path.join(output,'canvas.png')});
    results.push('Approach and Add are usable at 390px; no browser script errors.');
    assert.deepEqual(errors,[]);
    await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks:results},null,2)+'\n');
    console.log(JSON.stringify({passed:true,checks:results,output},null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
