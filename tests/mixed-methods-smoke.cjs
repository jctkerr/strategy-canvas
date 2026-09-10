/* Optional browser checks for different methods within one map.
   node tests/mixed-methods-smoke.cjs http://127.0.0.1:PORT /tmp/canvas-mixed-methods
   Use a disposable live session: this test replaces its fictional state. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const [url, output] = process.argv.slice(2);
if (!url || !output || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) throw Error('Provide a disposable loopback session URL and output directory.');
const origin = url.replace(/\/$/, '');
const results = [], errors = [];
const copy = value => JSON.parse(JSON.stringify(value));
const names = {
  exploration: 'Explore', issue: 'Issue tree', hypothesis: 'Hypothesis tree', driver: 'Driver tree',
  solution: 'Solution tree', objectives: 'Objectives tree', decision: 'Decision tree',
  opportunity: 'Opportunity tree', argument: 'Argument tree'
};
const fixture = {
  schemaVersion: 1, revision: 1, title: 'Fictional mixed-method test',
  question: 'What should we investigate before running an event?',
  context: 'Fictional editing fixture. Methods describe different questions within one map; no commercial conclusion is asserted.',
  nextQuestion: 'Which branch needs attention?',
  problem: {situation: 'An event is under consideration.', desiredChange: 'Understand the decision.', constraints: 'Demand is unknown.'},
  nodes: [
    {id: 'root', parentId: null, label: 'Investigate the event', kind: 'question', method: 'issue', status: 'open', notes: 'Root notes stay intact.'},
    {id: 'economics', parentId: 'root', label: 'Understand event economics', kind: 'question', method: 'driver', status: 'uncertain', notes: 'Keep costs, units and assumptions explicit.', relation: {type: 'part-of', label: 'The economics question'}, source: 'Fictional supplied inputs; not external evidence.'},
    {id: 'gross', parentId: 'economics', label: 'Contribution per attendee', kind: 'metric', status: 'open', notes: 'Inherits the nearest branch method.', relation: {type: 'calculated-from', label: 'Revenue less variable cost'}},
    {id: 'suspicion', parentId: 'economics', label: 'The price assumption may fail', kind: 'hypothesis', method: 'hypothesis', status: 'uncertain', notes: 'An explicitly different method below the economics branch.', relation: {type: 'challenges', label: 'Test the price assumption'}},
    {id: 'check', parentId: 'suspicion', label: 'What would customers pay?', kind: 'question', status: 'open', notes: 'Keep this question and its relationship.', relation: {type: 'tests', label: 'Seek disconfirming evidence'}},
    {id: 'costs', parentId: 'economics', label: 'Cost model kept separate', kind: 'metric', method: 'driver', status: 'open', notes: 'Explicitly matches the parent initially; the override must still survive.', relation: {type: 'calculated-from', label: 'Cost inputs'}, provenance: 'context'},
    {id: 'fixed', parentId: 'costs', label: 'Fixed event cost', kind: 'metric', status: 'open', notes: 'Inherits the explicit cost-model override.', relation: {type: 'calculated-from', label: 'Fixed input'}},
    {id: 'delivery', parentId: 'root', label: 'Make delivery manageable', kind: 'objective', method: 'solution', status: 'open', notes: 'Sibling subtree must be preserved.', relation: {type: 'part-of', label: 'The delivery question'}},
    {id: 'next', parentId: 'delivery', label: 'Use a repeatable format', kind: 'solution', status: 'uncertain', notes: 'A proposal, not a chosen action.', relation: {type: 'could-achieve', label: 'Reduce preparation overhead'}}
  ],
  decision: {recommendation: '', rationale: 'Still investigating.', uncertainties: ['Demand is unknown.'], nextSteps: []}
};
async function read() {
  const response = await fetch(origin + '/api/state');
  assert.equal(response.status, 200);
  return response.json();
}
async function put(proposed) {
  const latest = await read();
  const response = await fetch(origin + '/api/state', {
    method: 'PUT', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({expectedRevision: latest.revision, state: proposed})
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
function withMethod(before, id, method) {
  const expected = copy(before);
  expected.revision += 1;
  const node = expected.nodes.find(node => node.id === id);
  assert.ok(node);
  if (method === undefined) delete node.method;
  else node.method = method;
  return expected;
}
async function chosenMethod(page) {
  return page.locator('#method-tasks button[aria-pressed="true"]').getAttribute('data-method');
}
async function chooseMethod(page, method) {
  await page.locator('#method-tasks button[data-method="' + method + '"]').click();
  assert.equal(await chosenMethod(page), method);
}
async function showMethodHelp(page) {
  const details = page.locator('#method-help');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').first().click();
}
async function select(page, id) {
  await page.locator('.tree-node[data-id="' + id + '"]').click();
  assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'), id);
  assert.ok(await page.locator('#main').evaluate(element => element.classList.contains('inspect-open')), 'Card selection opens the editor');
  assert.equal(await page.locator('.tree-node .node-type').count(), 1, 'Only the selected card exposes its tree-type control');
}
async function assertDisplay(page, id, method, explicit) {
  await select(page, id);
  assert.equal(await page.locator('#approach-name').textContent(), names[method], id + ' must display its effective approach');
  const label = page.locator('.tree-node[data-id="' + id + '"] .node-method');
  assert.equal(await label.count(), explicit ? 1 : 0, id + ' must distinguish an explicit starting point from inheritance');
  if (explicit) assert.equal(await label.textContent(), names[method]);
  assert.ok((await page.locator('.tree-node[data-id="' + id + '"] > title').textContent()).includes('Approach: ' + names[method]));
}
async function submitMethod(page, before, id, method, reset = false) {
  const pending = page.waitForResponse(response => response.url().endsWith('/api/state') && response.request().method() === 'PUT');
  await page.locator(reset ? '#method-inherit' : '#method-apply').click();
  assert.equal((await pending).status(), 200);
  await page.locator('#approach-panel').waitFor({state: 'hidden'});
  const saved = await read();
  assert.deepEqual(saved, withMethod(before, id, method), 'Only the selected method and revision may change');
  return saved;
}
async function exportFile(page, format, name) {
  await page.locator('details.export summary').click();
  const pending = page.waitForEvent('download');
  await page.locator('[data-export="' + format + '"]').click();
  const file = path.join(output, name);
  await (await pending).saveAs(file);
  return file;
}

(async () => {
  await fs.mkdir(output, {recursive: true});
  await put(fixture);
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 1600, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('#question').waitFor();
    if (await page.locator('#quick-start').isVisible()) await page.locator('#tour-skip').click();
    const original = await read();
    await assertDisplay(page, 'root', 'issue', true);
    await assertDisplay(page, 'economics', 'driver', true);
    await assertDisplay(page, 'gross', 'driver', false);
    await assertDisplay(page, 'suspicion', 'hypothesis', true);
    await assertDisplay(page, 'check', 'hypothesis', false);
    await assertDisplay(page, 'costs', 'driver', true);
    await assertDisplay(page, 'fixed', 'driver', false);
    await assertDisplay(page, 'delivery', 'solution', true);
    await assertDisplay(page, 'next', 'solution', false);
    assert.deepEqual(await read(), original);
    results.push('One map displays inherited methods and explicit subtree starting points without changing canonical state.');

    await select(page, 'economics');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await showMethodHelp(page);
    assert.match(await page.locator('#method-current').innerText(), /Driver tree.*starts here/);
    await showMethodHelp(page);
    assert.equal(await page.locator('#approach-scope').textContent(), 'Understand event economics');
    assert.match(await page.locator('#method-effect').innerText(), /this branch/);
    assert.match(await page.locator('#method-effect').innerText(), /subtree types stay/);
    const tasks = await page.locator('#method-tasks button[data-method]').evaluateAll(buttons => buttons.map(button => button.dataset.method));
    assert.equal(tasks.length, 9);
    assert.equal(new Set(tasks).size, 9);
    for (const method of tasks) {
      await page.locator('#method-tasks button[data-method="' + method + '"]').click();
      assert.equal(await chosenMethod(page), method);
      assert.equal(await page.locator('#method-tasks button[aria-pressed="true"]').getAttribute('data-method'), method);
      assert.equal(await page.locator('#method-tasks button[data-method]:visible').count(), 9, 'All tree choices remain directly available');
      assert.ok((await page.locator('#method-purpose').innerText()).length > 20);
    }
    assert.deepEqual(await read(), original, 'Task choices must preview, not write');
    await page.locator('#approach-close').click();
    assert.deepEqual(await read(), original);
    results.push('All nine task choices preview a method without saving; scope explains descendants and preserved overrides.');

    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await chooseMethod(page, 'objectives');
    const objectives = await submitMethod(page, original, 'economics', 'objectives');
    await assertDisplay(page, 'gross', 'objectives', false);
    await assertDisplay(page, 'check', 'hypothesis', false);
    await assertDisplay(page, 'fixed', 'driver', false);
    await assertDisplay(page, 'next', 'solution', false);
    await assertDisplay(page, 'economics', 'objectives', true);
    results.push('Changing one subtree changes untyped descendants while preserving nested, same-value and sibling overrides and every existing relation.');

    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    assert.ok(await page.locator('#method-inherit').isVisible());
    const inherited = await submitMethod(page, objectives, 'economics', undefined, true);
    assert.equal(Object.hasOwn(inherited.nodes.find(node => node.id === 'economics'), 'method'), false);
    await assertDisplay(page, 'economics', 'issue', false);
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await showMethodHelp(page);
    assert.match(await page.locator('#method-current').innerText(), /inherited from.*Investigate the event/);
    assert.ok(await page.locator('#method-inherit').isHidden());
    await page.locator('#approach-close').click();
    await assertDisplay(page, 'gross', 'issue', false);
    await assertDisplay(page, 'check', 'hypothesis', false);
    await assertDisplay(page, 'fixed', 'driver', false);
    await assertDisplay(page, 'delivery', 'solution', true);
    await select(page, 'suspicion');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    const deepInherited = await submitMethod(page, inherited, 'suspicion', undefined, true);
    await assertDisplay(page, 'check', 'issue', false);
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await showMethodHelp(page);
    assert.match(await page.locator('#method-current').innerText(), /inherited from.*Investigate the event/);
    await page.locator('#approach-close').click();
    await assertDisplay(page, 'costs', 'driver', true);
    await assertDisplay(page, 'fixed', 'driver', false);
    await select(page, 'root');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    assert.ok(await page.locator('#method-inherit').isHidden());
    await showMethodHelp(page);
    assert.match(await page.locator('#method-effect').innerText(), /main question/);
    await page.locator('#approach-close').click();
    assert.deepEqual(await read(), deepInherited);
    results.push('Reset removes only the chosen override; nearest-ancestor inheritance skips untyped parents, and explicit same-value descendants remain pinned.');

    await select(page, 'gross');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await chooseMethod(page, 'argument');
    const externalAncestor = await read();
    externalAncestor.nodes.find(node => node.id === 'root').method = 'decision';
    const ancestorSaved = await put(externalAncestor);
    await page.locator('#approach-conflict').waitFor({state: 'visible'});
    assert.ok(await page.locator('#method-apply').isDisabled());
    assert.ok(await page.locator('#method-refresh').isVisible());
    assert.equal(await chosenMethod(page), 'argument', 'Keep the unsaved preview visible until the person refreshes');
    assert.deepEqual(await read(), ancestorSaved, 'Detecting an ancestor conflict must not write');
    await page.locator('#method-refresh').click();
    assert.ok(await page.locator('#approach-conflict').isHidden());
    assert.ok(await page.locator('#method-apply').isEnabled());
    assert.equal(await chosenMethod(page), 'decision');
    await showMethodHelp(page);
    assert.match(await page.locator('#method-current').innerText(), /Decision tree.*inherited from.*Investigate the event/);
    await chooseMethod(page, 'driver');
    const grossOverride = await submitMethod(page, ancestorSaved, 'gross', 'driver');
    results.push('An external ancestor-method change blocks a stale selection; Review latest restores the actual inheritance before saving.');

    await select(page, 'costs');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await chooseMethod(page, 'objectives');
    const externalSelected = copy(grossOverride);
    externalSelected.nodes.find(node => node.id === 'costs').method = 'hypothesis';
    const selectedSaved = await put(externalSelected);
    await page.locator('#approach-conflict').waitFor({state: 'visible'});
    assert.ok(await page.locator('#method-apply').isDisabled());
    assert.ok(await page.locator('#method-inherit').isDisabled());
    assert.deepEqual(await read(), selectedSaved);
    await page.locator('#method-refresh').click();
    assert.equal(await chosenMethod(page), 'hypothesis');
    await showMethodHelp(page);
    assert.match(await page.locator('#method-current').innerText(), /Hypothesis tree.*starts here/);
    assert.ok(await page.locator('#method-apply').isEnabled());
    await page.locator('#approach-close').click();
    await assertDisplay(page, 'fixed', 'hypothesis', false);
    assert.deepEqual(await read(), selectedSaved, 'Review and close must preserve the other editor’s method');
    results.push('An external change to the selected override blocks both apply and inherit until refreshed; closing preserves it.');

    await select(page, 'economics');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await chooseMethod(page, 'solution');
    const externalNotes = await read();
    const note = 'An unrelated sibling note changed while the picker stayed open.';
    externalNotes.nodes.find(node => node.id === 'delivery').notes = note;
    const notesSaved = await put(externalNotes);
    await page.waitForFunction(text => document.querySelector('.tree-node[data-id="delivery"] > title')?.textContent.includes(text), note);
    assert.ok(await page.locator('#approach-conflict').isHidden());
    assert.ok(await page.locator('#method-apply').isEnabled());
    assert.equal(await chosenMethod(page), 'solution');
    const finalState = await submitMethod(page, notesSaved, 'economics', 'solution');
    assert.equal(finalState.nodes.find(node => node.id === 'delivery').notes, note);
    results.push('An unrelated external note edit does not block the picker and survives the selected method save.');

    const jsonFile = await exportFile(page, 'json', 'mixed-methods.json');
    assert.deepEqual(JSON.parse(await fs.readFile(jsonFile, 'utf8')), finalState);
    const htmlFile = await exportFile(page, 'html', 'mixed-methods.html');
    const standaloneContext = await browser.newContext({viewport: {width: 1600, height: 1000}, reducedMotion: 'reduce'});
    const standalone = await standaloneContext.newPage();
    standalone.on('pageerror', error => errors.push(error.message));
    await standalone.goto(pathToFileURL(htmlFile).href);
    assert.equal(await standalone.locator('dialog[open]').count(), 0);
    assert.equal(await standalone.locator('#method-help').evaluate(element => element.open), false);
    assert.deepEqual(await standalone.locator('#boot-data').evaluate(element => JSON.parse(element.textContent).state), finalState);
    if (await standalone.locator('#quick-start').isVisible()) await standalone.locator('#tour-skip').click();
    await assertDisplay(standalone, 'root', 'decision', true);
    await assertDisplay(standalone, 'economics', 'solution', true);
    await assertDisplay(standalone, 'gross', 'driver', true);
    await assertDisplay(standalone, 'suspicion', 'solution', false);
    await assertDisplay(standalone, 'check', 'solution', false);
    await assertDisplay(standalone, 'costs', 'hypothesis', true);
    await assertDisplay(standalone, 'fixed', 'hypothesis', false);
    await assertDisplay(standalone, 'delivery', 'solution', true);
    await standalone.locator('.tree-node[aria-pressed="true"] .node-type').click();
    assert.equal(await standalone.locator('#method-tasks button[data-method]').count(), 9);
    assert.equal(new Set(await standalone.locator('#method-tasks button[data-method]').evaluateAll(buttons => buttons.map(button => button.dataset.method))).size, 9);
    await standalone.locator('#method-tasks button[data-method="argument"]').click();
    await standalone.locator('#approach-close').click();
    const reexported = await exportFile(standalone, 'html', 'mixed-methods-reexported.html');
    await standalone.goto(pathToFileURL(reexported).href);
    assert.deepEqual(await standalone.locator('#boot-data').evaluate(element => JSON.parse(element.textContent).state), finalState);
    assert.equal(await standalone.locator('#method-tasks button[data-method]').count(), 9);
    assert.deepEqual(await read(), finalState, 'Standalone review and export must not update the live session');
    results.push('HTML and JSON retain exact explicit overrides and relations; reopening and re-exporting restore inheritance with nine unique task and method choices.');

    await select(page, 'economics');
    await page.locator('.tree-node[aria-pressed="true"] .node-type').click();
    await showMethodHelp(page);
    await page.locator('#mixed-methods summary').click();
    await page.screenshot({path: path.join(output, 'mixed-methods-guide.png')});
    await page.locator('#approach-close').click();
    await page.screenshot({path: path.join(output, 'mixed-methods-canvas.png')});
    assert.deepEqual(errors, []);
    const report = {passed: true, checks: results};
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
