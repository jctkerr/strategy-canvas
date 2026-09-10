/* Optional browser checks for first-use guidance.
   node tests/onboarding-smoke.cjs http://127.0.0.1:PORT /tmp/canvas-onboarding
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
async function read() { const r = await fetch(origin + '/api/state'); assert.equal(r.status, 200); return r.json(); }
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function exportFile(page, format, name) {
  await page.locator('details.export summary').click();
  const pending = page.waitForEvent('download');
  await page.locator('[data-export="' + format + '"]').click();
  const file = path.join(output, name); await (await pending).saveAs(file); return file;
}
async function visibleWithin(page, selector, container) {
  await frames(page);
  const box = await page.locator(selector).boundingBox(), parent = await page.locator(container).boundingBox();
  assert.ok(box && parent && box.x >= parent.x - 1 && box.y >= parent.y - 1 && box.x + box.width <= parent.x + parent.width + 1 && box.y + box.height <= parent.y + parent.height + 1, selector + ' must fit within ' + container);
}
(async () => {
  await fs.mkdir(output, {recursive: true});
  const latest = await read();
  const put = await fetch(origin + '/api/state', {method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({expectedRevision: latest.revision, state: fixture})});
  assert.equal(put.status, 200); const original = await read();
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 850}, reducedMotion: 'reduce'});
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    assert.ok(await page.locator('#quick-start').isVisible());
    assert.match(await page.locator('#tour-count').innerText(), /1 of 3/i);
    assert.ok(await page.locator('#tour-back').isHidden());
    await page.locator('#tour-next').click();
    assert.match(await page.locator('#tour-title').innerText(), /Develop/);
    await frames(page); const expandedHeight = (await page.locator('#canvas').boundingBox()).height;
    await page.locator('#tour-toggle').click(); await frames(page);
    assert.ok(await page.locator('#quick-start').isHidden());
    assert.equal(await page.locator('#tour-toggle').getAttribute('aria-expanded'), 'false');
    assert.ok((await page.locator('#canvas').boundingBox()).height > expandedHeight + 100, 'Collapsing must return space to the tree');
    await page.locator('#tour-toggle').click();
    assert.equal(await page.locator('#tour-toggle').getAttribute('aria-expanded'), 'true');
    assert.match(await page.locator('#tour-count').innerText(), /2 of 3/i, 'Reopening should retain the current step');
    assert.deepEqual(await read(), original);
    await page.locator('#tour-back').click();
    assert.match(await page.locator('#tour-count').innerText(), /1 of 3/i);
    await page.locator('#tour-next').click(); await page.locator('#tour-next').click();
    assert.equal(await page.locator('#tour-next').innerText(), 'Start exploring');
    await page.locator('#tour-next').click();
    assert.ok(await page.locator('#quick-start').isHidden());
    await page.reload(); assert.ok(await page.locator('#quick-start').isHidden());
    assert.deepEqual(await read(), original);
    results.push('Quick start collapses and restores the current step, returns space to the tree and remembers dismissal without changing canonical state.');

    await page.locator('.tree-node[data-id="workshops"]').click();
    await page.locator('#add-primary').click();
    assert.match(await page.locator('#new-child-hint').innerText(), /Paid workshops/);
    await page.locator('#label').fill('Would people book in advance?');
    await page.locator('#notes').fill('Unfinished reasoning to keep.');
    const draft = await page.locator('#kind').inputValue();
    await page.locator('#help-open').click();
    assert.match(await page.locator('#help-saving').innerText(), /computer running it/);
    await page.locator('#tour-replay').click();
    assert.match(await page.locator('#tour-count').innerText(), /1 of 3/i);
    await page.locator('#tour-skip').click();
    await page.locator('#help-open').click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#label').inputValue(), 'Would people book in advance?');
    assert.equal(await page.locator('#notes').inputValue(), 'Unfinished reasoning to keep.');
    assert.equal(await page.locator('#kind').inputValue(), draft);
    assert.equal(await page.locator('.tree-node[aria-pressed="true"]').getAttribute('data-id'), 'workshops');
    assert.ok(await page.locator('#save').isEnabled());
    assert.deepEqual(await read(), original);
    await page.locator('#discard').click(); await page.locator('#close-details').click();
    results.push('Add identifies its parent. Help, replay, skip and Escape preserve the selected card and unsaved draft.');

    await page.locator('#help-open').click(); await page.locator('#tour-replay').click();
    await page.locator('#tour-next').click();
    const html = await exportFile(page, 'html', 'onboarding.html');
    const json = await exportFile(page, 'json', 'onboarding.json');
    assert.deepEqual(JSON.parse(await fs.readFile(json, 'utf8')), original);
    const fileContext = await browser.newContext({reducedMotion: 'reduce'});
    const standalone = await fileContext.newPage(); standalone.on('pageerror', e => errors.push(e.message));
    await standalone.goto(pathToFileURL(html).href);
    assert.equal(await standalone.locator('dialog[open]').count(), 0);
    assert.ok(await standalone.locator('#quick-start').isVisible());
    assert.match(await standalone.locator('#tour-count').innerText(), /1 of 3/i);
    assert.match(await standalone.locator('#tour-save-hint').innerText(), /Export before closing/);
    assert.deepEqual(await standalone.locator('#boot-data').evaluate(el => JSON.parse(el.textContent).state), original);
    await standalone.locator('#help-open').click();
    assert.match(await standalone.locator('#help-saving').innerText(), /open page only/);
    assert.match(await standalone.locator('#help-saving').innerText(), /Editable state \(JSON\)/);
    await standalone.locator('#help-done').click();
    results.push('HTML export starts fresh for its recipient, closes help, preserves exact state and explains standalone saving and agent handoff.');

    await page.locator('#tour-skip').click();
    const denied = await browser.newContext({reducedMotion: 'reduce'});
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', {get() { throw new DOMException('Storage disabled', 'SecurityError'); }}));
    const blocked = await denied.newPage(); blocked.on('pageerror', e => errors.push(e.message));
    await blocked.goto(origin); await blocked.locator('#tour-skip').click();
    await blocked.locator('#help-open').click(); await blocked.locator('#help-done').click();
    await blocked.locator('#add-primary').click(); await blocked.locator('#label').fill('Still works without storage');
    assert.ok(await blocked.locator('#save').isEnabled()); await blocked.locator('#discard').click();
    assert.deepEqual(await read(), original);
    results.push('Disabled browser storage does not break the canvas, help, dismissal or drafting.');

    const mobileContext = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
    const mobile = await mobileContext.newPage(); mobile.on('pageerror', e => errors.push(e.message));
    await mobile.goto(origin); await mobile.locator('.context-disclosure summary').click();
    await frames(mobile);
    assert.ok((await mobile.locator('#canvas').boundingBox()).height >= 240, 'Long context and tutorial must leave working canvas space');
    assert.ok((await mobile.locator('.context-body').boundingBox()).height <= 131);
    assert.ok(await mobile.locator('.context-body').evaluate(el => el.scrollHeight > el.clientHeight));
    assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await visibleWithin(mobile, '#add-primary', '#canvas');
    await mobile.locator('#tour-next').click(); assert.match(await mobile.locator('#tour-count').innerText(), /2 of 3/i);
    await mobile.locator('#tour-skip').click();
    await mobile.locator('.context-disclosure summary').click();
    await visibleWithin(mobile, '.tree-node[aria-pressed="true"]', '#canvas');
    await mobile.locator('#help-open').click();
    const rect = await mobile.locator('#help-panel').boundingBox();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 391 && rect.y + rect.height <= 845);
    await mobile.screenshot({path: path.join(output, 'mobile-help.png')});
    await mobile.locator('#help-done').click();
    await mobile.locator('#add-primary').click(); assert.ok(await mobile.locator('#label').isVisible());
    await mobile.locator('#discard').click(); await mobile.locator('#close-details').click();
    await mobile.locator('#help-open').click(); await mobile.locator('#tour-replay').click();
    await mobile.screenshot({path: path.join(output, 'mobile-quick-start.png')});
    results.push('At 390px, long context scrolls separately, tutorial controls remain reachable, tree refits, and help and Add work.');

    await page.locator('#help-open').click(); await page.locator('#tour-replay').click(); await frames(page);
    await page.screenshot({path: path.join(output, 'quick-start.png')});
    assert.deepEqual(await read(), original); assert.deepEqual(errors, []);
    const report = {passed: true, checks: results};
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
