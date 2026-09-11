# Compatibility and test record

## Find and develop a branch — 11 September 2026

Find searches thought titles, notes and sources. Selecting a result reveals its branch and opens its notes while retaining zoom. **Add another** saves a card and starts the next draft under the same parent. Investigations open one at a time, with a chooser when several belong to a branch.

[Search checks](test-evidence/easier-branches/find.json), [seven repeated-add groups](test-evidence/easier-branches/repeated-add.json), [six investigation groups](test-evidence/easier-branches/work-selector.json), [ten tour groups](test-evidence/easier-branches/tour.json), [nine journey groups](test-evidence/easier-branches/journey.json) and [three navigation groups](test-evidence/easier-branches/navigation.json) cover drafts, save failures, conflicting agent edits, cancellation, keyboard use and complete exports. **86 Python tests** pass. [Receipt](test-evidence/easier-branches/receipt.json).

The search and repeated-add flow were also used in Codex's in-app browser on a separate fictional bookshop session. Small-screen checks use 390px browser emulation; they are not a physical-phone or new Claude/Cursor client test. [Search](test-evidence/easier-branches/find-desktop.png) · [Small screen](test-evidence/easier-branches/find-mobile.png) · [Add another](test-evidence/easier-branches/add-another.png).

## Optional canvas tour — 11 September 2026

**86 Python tests** and **32 browser groups** pass: [10 tour checks](test-evidence/canvas-tour/tour.json), [five controls](test-evidence/canvas-tour/controls.json), [nine connected-journey checks](test-evidence/canvas-tour/journey.json) and [eight mixed-method checks](test-evidence/canvas-tour/methods.json). The five-step tour points to real controls without opening editors or changing content, selection or camera. Skip, replay, keyboard use, exact draft/caret preservation, recovered drafts, agent-driven motion and complete exports were exercised.

[Desktop](test-evidence/canvas-tour/desktop.png) · [Narrow screen with an open draft](test-evidence/canvas-tour/mobile.png) · [Receipt](test-evidence/canvas-tour/receipt.json). Worked examples open separately so the current question is kept. Mobile checks use 390px browser emulation. These tests add no new Claude or Cursor execution claim; Razn’s subscription-gated editors remain untested.

## Smooth tree motion — 11 September 2026

**86 Python tests**, [seven motion check groups](test-evidence/tree-motion/motion-results.json), [14 notes/recovery groups](test-evidence/tree-motion/seamless-results.json) and [five keyboard groups](test-evidence/tree-motion/keyboard-results.json) passed. New cards ease in while existing cards and connectors move together. Checks cover manual and agent additions, interrupted movement, stable selection and notes saves, exports during motion, reduced motion and narrow screens.

[Before](test-evidence/tree-motion/01-before-add.png) · [During](test-evidence/tree-motion/02-during-add.png) · [After](test-evidence/tree-motion/03-after-add.png) · [Narrow screen](test-evidence/tree-motion/04-mobile-add.png). [Frame samples](test-evidence/tree-motion/samples.json) record the painted geometry. These are fictional browser fixtures; the 390px checks use emulation. No new Claude or Cursor execution is claimed.

## Seamless notes and agent selection — 11 September 2026

**86 Python tests** and **66 browser check groups** passed: [14 seamless editing](test-evidence/seamless-notes/seamless-results.json), [10 direct controls](test-evidence/seamless-notes/direct-results.json), and regression checks for [keyboard](test-evidence/seamless-notes/keyboard-results.json), [questions](test-evidence/seamless-notes/question-results.json), [methods](test-evidence/seamless-notes/methods-results.json), [onboarding](test-evidence/seamless-notes/onboarding-results.json) and [analysis](test-evidence/seamless-notes/analysis-results.json).

Checks cover autosave while typing, saving to the right card, same-panel sources, current selection and ambiguous tabs, draft/conflict recovery, separate canvases, and exporting when browser storage fails. Recovery is local to the browser, not cloud sync. [Desktop](test-evidence/seamless-notes/seamless-notes-desktop.png) · [Narrow screen](test-evidence/seamless-notes/seamless-notes-mobile.png). These are fictional fixtures; the 390px checks use browser emulation.

In Codex’s actual in-app panel, a manual note was saved, CLI `focus` identified the selected demand branch, and an agent appended a note while preserving the original text. Both appeared in the panel. [Trial receipt](test-evidence/seamless-notes/codex-agent-trial.json). This adds no new Claude or Cursor execution claim.

## Working notes panel — 11 September 2026

All **78 Python tests**, **11 direct-edit browser check groups** and [five keyboard check groups](test-evidence/working-notes/keyboard-checks.json) passed. Working notes open directly in a right-hand desktop panel or a bottom sheet at 390px. Checks cover saving to the correct card, preserving unsaved notes on Close or card switches, blocking stale saves after conflicting agent updates, merging unrelated updates, and retaining notes in complete offline exports. [Test receipt](test-evidence/working-notes/checks.json).

[Desktop](test-evidence/working-notes/working-notes-desktop.png) · [Narrow screen](test-evidence/working-notes/working-notes-mobile.png). These are fictional browser fixtures. The Paid workshops panel was also opened and inspected in Codex’s in-app browser. No new Claude or Cursor execution coverage is claimed.

## Driver cards and examples — 11 September 2026

All **78 Python tests** and **11 direct-edit browser check groups** passed. These cover adding qualitative Driver cards, keyboard additions, Undo, branch inheritance, numerical Metric defaults and complete exports. [Test receipt](test-evidence/driver-overview/checks.json).

The [examples gallery](https://jctkerr.github.io/strategy-canvas/examples.html) contains all nine methods with sources. A mixed growth example combines qualitative levers, arithmetic and hypothesis testing. Both rendered in Codex's in-app browser; the qualitative Driver's contextual **+** menu was inspected there. The case and figures are fictional. These checks do not establish new Claude or Cursor execution coverage. Older runtime versions cannot import the new Driver card kind; update the skill before importing these examples.

**Checked 10 September 2026.** Strategy Canvas needs an agent environment that can read the full skill folder, run Python and save files. The [setup guide](agent-guide.md) gives instructions for each host. A supported skill format alone does not prove the complete workflow works.

| Environment | Evidence |
| --- | --- |
| Codex desktop, local macOS | Local runtime, populated canvas, direct browser edits, agent updates and standalone exports exercised. Current in-app tab rendered the updated canvas; a separate pane-opening request returned queued and is not treated as visible confirmation. |
| Grok Bot desktop | Public v0.1.1 loaded in a fresh Bot. Canvas creation, browser editing through an exported copy, JSON handoff, follow-up updates and final exports exercised. Two reviewer corrections were needed to fix the option hierarchy. Details below. |
| Grok Build / CLI | Installation and invocation checked against official documentation; execution not tested. |
| Claude Code | Installation instructions checked. An execution test stopped before a model call because the test environment was signed out. |
| Cursor desktop / CLI | Desktop Browser pane rendered the live bookshop canvas and its Analysis dialog. Separately, CLI Auto prepared a schema-valid fictional proposal using file tools; command permissions blocked full automatic setup. See the bounded test below. |
| Gemini CLI | Installation and activation checked against official documentation; execution not tested. |
| Claude chat / other web chat | No Strategy Canvas execution test. File execution and export capabilities depend on the host. |

These results concern the named products, not every app that uses the same model. The Grok Bot interface did not expose its model version. The test does not establish Grok Build or ordinary Grok web-chat compatibility.

## What the Grok Bot test did

The Bot received the public repository link and a fictional bookshop decision. The bookshop had a spare room, a three-month horizon, five available staff hours a week, no demand data and no confirmed budget. The supplied options were paid workshops, a quiet reading room or storage; the prompt asked it to keep the choice open.

1. The Bot read the skill and ran its bundled server on its own computer. Its live canvas was visible in the computer view. The downloaded HTML and JSON matched: revision 2, 20 nodes.
2. In the downloaded HTML, the tester opened **Details**, appended `Reader edit: workshops must finish by 18:00.`, saved and exported JSON. That browser-generated file had revision 3.
3. The tester attached the JSON and asked the Bot to deepen workshops while preserving the edit. The prompt did not repeat the finish time. Revision 4 retained the 18:00 constraint and developed options around it.
4. The first tree had mixed shared constraints with competing options. The first correction retained a parking container beside the options. A second correction produced four option children: the three supplied choices plus a clearly proposed shared timetable. The final notes explicitly avoid claiming an exhaustive partition.
5. The final downloaded HTML, SVG and JSON each contained the same validated state: revision 5, 29 nodes. The 18:00 edit remained, unrelated branches were retained and the recommendation stayed empty. Branch focus and return to the whole tree worked in the exported HTML.

The Bot reported using `update_state.py` with expected revision 3 for the first continuation and expected revision 4 for the final correction. Downloaded files independently confirmed the resulting revisions; the remote command history was not independently audited.

This verifies a working file handoff with Grok Bot. It does not verify simultaneous direct editing through Grok's remote computer view, persistence across a Bot restart, reusable skill installation, or unattended strategic correctness. Only the fictional case above was exercised. The hierarchy corrections show why reviewing the reasoning still matters.

## Inspect the evidence

The original, wholly fictional state files are retained unchanged:

- [Initial Bot output, revision 2](test-evidence/grok-bot/initial.json)
- [Browser edit, revision 3](test-evidence/grok-bot/reader-edited.json)
- [First follow-up, revision 4](test-evidence/grok-bot/first-follow-up.json)
- [Final corrected output, revision 5](test-evidence/grok-bot/final.json)

These are test records, including the observed mistakes, rather than recommended strategy examples. This first test used [v0.1.1, commit 779e881](https://github.com/jctkerr/strategy-canvas/tree/779e8817dcda0a8c2634cc9a348d7b6b0fde32a3).

Original final export SHA-256 hashes:

```text
HTML  9cca3c8d6b9147e0d478b095455a2407ca2eacb73e81e8aa2ba567c89397a919
JSON  1fc2a4f550e53762ef000841a4ed733c5c56ca70cb5647482ac6ca37b198fd75
SVG   07578761999bc0da6c1fb1027fcdf10665119dfb053fac954eddd6e0b7fe678a
```

## Short setup prompt test

A second, fresh Grok Bot conversation received the README's short setup prompt, with the question replaced by the same fictional bookshop case and an instruction to use a separate session without personal files or integrations. No installation commands or setup follow-up were supplied. The Bot returned a populated canvas and downloadable HTML and JSON. The [original output](test-evidence/grok-bot/short-prompt.json) validated at revision 2 with 21 nodes; the HTML contained the same state and the recommendation was empty.

This was a fresh conversation on the same Grok Bot account and computer environment, not a clean-machine installation. The copied prompt also worked through GitHub's copy button in Comet. Other clients have not received this setup test.

The initial output again placed shared criteria and an evidence boundary beside the options. That finding led to the concrete [choice-tree example](../references/method.md#check-the-first-split-of-a-choice-tree) in the method. When asked to read and apply that updated example, the Bot produced the [corrected output](test-evidence/grok-bot/short-prompt-corrected.json): three option children at the root, shared material in context, and unchanged option branches. Its revision 3 HTML and JSON matched. This is an observed assisted correction, not proof that future first attempts will always follow the rule.

## Runtime checks

All 30 standard-library tests passed locally on 10 September 2026. They cover state validation, revision conflicts, competing writers, atomic saves, loopback access boundaries and complete exports. The generated demo check and skill metadata validator also passed.

The repository's [Python checks](https://github.com/jctkerr/strategy-canvas/actions/workflows/python.yml) run on Linux with Python 3.9 and 3.14, and macOS with Python 3.14. Software tests check runtime behaviour; they do not establish the quality or completeness of an agent's strategy.

## Tree methods and editing checks

The method update was checked locally on 10 September 2026. [Fourteen rendered browser checks](test-evidence/method-guidance/browser-results.json) exercised all eight method guides, contextual additions, successive component roles, draft discard, undo, method changes, problem edits, concurrent updates and standalone export/reload. Controls were also exercised at a 390-pixel viewport. This is browser emulation, not a physical-phone test. The repeatable development check is `tests/browser-smoke.cjs`; it requires Playwright and a disposable local session. It is not required to use the skill.

A separate agent used the updated skill to generate these fictional cases and validated their HTML, SVG and JSON snapshots:

- [A bookshop with an unclear objective](test-evidence/method-guidance/bookshop.json): proposed objectives and possible means, the five-hour constraint retained, no recommendation. Review identified potential overlap between commercial room hire and community room access. Their notes acknowledge overlap; one canonical room-access idea with references to its benefits could make the map clearer.
- [An event with uncertain demand](test-evidence/method-guidance/event.json): choices, unknown attendance and cost drivers. The £20/£5/£120 inputs also appear in the method recipe, so this checks following instructions rather than unseen arithmetic.
- [An event with new inputs](test-evidence/method-guidance/event-new-inputs.json): £24.50 tickets, £6.20 variable cost and £146.50 avoidable fixed cost. [Decimal arithmetic](test-evidence/method-guidance/checked-arithmetic.json) gives £18.30 contribution, a minimum of nine paying attendees, a 10p loss at eight and £18.20 surplus at nine. Demand probabilities and capacity remain unknown; no expected value was invented.

These are bounded local checks, not evidence of unattended strategic correctness. The new method guidance has not been rerun in Grok Bot; its earlier compatibility evidence above remains specific to those tested versions and workflows. This earlier method test used equations recorded in notes. The subsequent optional Numbers workspace evaluates explicit models; it does not automatically extract or validate equations or probabilities from tree notes.

## Onboarding checks

On 10 September 2026, [five rendered check groups](test-evidence/onboarding/browser-results.json) exercised first visits, stepping back and forward, skip/replay, remembered dismissal, help during an unsaved draft, standalone export/reopen and disabled browser storage. Canonical state and revision stayed unchanged throughout. At a 390-pixel viewport, the checks exercised long scrollable context, tutorial controls, tree refitting, help and adding a thought. This was Chromium browser emulation, not a physical-phone test.

The repeatable check is `tests/onboarding-smoke.cjs`, using Playwright and a disposable local session. The 30 runtime tests and 14 existing method/editing browser checks also passed with this update. This UI check does not extend the earlier Grok compatibility claims.

## Mixed approaches and collapsible guidance

The follow-up update on 10 September 2026 passed [eight rendered check groups](test-evidence/mixed-methods/browser-results.json) for task-based previews, nested method changes, inheritance resets, explicit same-value overrides, preservation of sibling branches and connections, concurrent method updates, unrelated edits and standalone re-export. Each save was checked against the complete expected state. These editing fixtures test method handling, not the validity of combining arbitrary analytical content.

The [onboarding checks](test-evidence/onboarding/browser-results.json) also verify that **Quick start** collapses, returns space to the tree and reopens at the same step without changing saved content. The existing 30 runtime tests and 14 rendered method/editing checks passed. Local desktop and 390-pixel browser layouts were inspected; no new external-agent compatibility is claimed.


## In-app preview and current analysis checks

On 10 September 2026, the updated 15-node fictional bookshop session rendered inside Codex's existing browser tab and Cursor desktop's native Browser pane. In Cursor, the tester used **Command Palette → Open Browser Tab**, entered the exact session URL and opened and closed **Analysis**. The saved state remained exactly revision 3 with all 15 nodes unchanged. These were observed host interactions, not proof that an independent agent automatically chose the right preview tool. Codex's separate pane-opening request returned queued. Claude's routes are documented from official guidance, but were not executed in this test. See [host preview instructions](../references/host-preview.md).

The current local suite passed **62 Python tests**. Nine [rendered analysis check groups](test-evidence/analysis/browser-results.json) cover explicit example drafts, low/base/high recalculation, missing values and arithmetic errors, parser agreement, linked work, brief freshness, reference protection, portable export and a 390-pixel viewport. The previous 14 method/editing, five onboarding and eight mixed-method groups also passed with this interface. Mobile checks use emulation.

A nine-slide fictional brief opened without a repair prompt in Microsoft PowerPoint on macOS. Its conditional scenario figures were inspected, and selecting a word in the body confirmed native editable text. Export tests cover stale briefs, complete embedded state, namespaces, source tracing and resource limits. The live PowerPoint download button was not separately exercised; the native check used the exporter command. This is a basic editable brief, not a slide-design product.

## Cursor file-tool handoff check

Cursor CLI, using its **Auto** selection and existing account, read the skill and an unseen fictional case. The first run could read and edit files, but every requested shell command was rejected by the host. No permissions were bypassed, credits purchased or alternative agent used. It therefore did not create or serve a canonical session, or execute exports.

A follow-up explicitly retained that restriction and requested a complete JSON proposal using available file tools. The [original proposal](test-evidence/cursor/proposal.json) passed separate validation in the current runtime. Its invented 12 attendees, £170 fixed cost and £7 variable cost, with ticket prices £18/£24/£30, yielded conditional surpluses **−£38/£34/£106** and whole-attendee break-even thresholds **16/10/8**. Those figures matched independent arithmetic.

Review still identified two reasoning corrections: exclusive room use across the full three months was an added assumption, and a solution subtree reversed the means-to-outcome relationship. These findings are retained rather than treating schema or arithmetic success as strategic correctness. This is evidence of a bounded Cursor file-tool handoff, not a passed automatic setup workflow or a native-preview action by that independent agent. The desktop preview check above is separate.


For a second file-only turn, a reviewer appended an 18:00 finish constraint to the latest proposal, then asked Cursor to raise the fictional fixed cost to £204 and address the reasoning findings. The [follow-up](test-evidence/cursor/follow-up.json) preserved the complete workshop notes and all prior node/model/variable/workplan/section IDs. Separate [runtime verification](test-evidence/cursor/verified-results.json) returned **−£72/£0/£72** and **19/12/9**. The means/outcome direction was repaired; exclusive use became a provisional scope assumption and combinations remained open. The constraint was preserved but not carried through to the staffing investigation. No canonical session, UI or exports were executed by Cursor in either file-only turn.


## Direct editing and shorter chooser — 10 September 2026

The v0.3.2 interface opened editing by clicking a thought. Each card has a child **+** and a separate collapse chevron; the selected card offers **Tree type**. The chooser has nine short choices with examples behind **Example & help**. Notes, sources and metadata remain behind **Details**, and Quick start begins collapsed. On small screens, the editor opens at the bottom so the selected card remains reachable.

[Seven direct-edit browser groups](test-evidence/direct-edit/browser-results.json) passed, including clicked-parent additions, keyboard access, unchanged hidden metadata, draft protection, subtree scope and offline editing. A same-node external change now blocks stale saves as well as preserving the draft. The accompanying [14 method/editing](test-evidence/direct-edit/method-results.json), [eight mixed-method](test-evidence/direct-edit/mixed-results.json), [five onboarding](test-evidence/direct-edit/onboarding-results.json) and [nine analysis](test-evidence/direct-edit/analysis-results.json) groups also passed, alongside 62 Python tests. The default chooser rendered at 65 words and 526 pixels tall in the inspected desktop fixture. The 390-pixel checks use browser emulation.

The updated interface was also inspected in Codex's existing in-app bookshop tab. Opening a child draft and the shorter chooser left the complete saved session unchanged at revision 3 with 15 thoughts. This UI update does not add an independent Claude or Cursor execution claim.

## Tree types on the canvas — 10 September 2026

The Tree type modal is replaced by a nonmodal menu anchored beside the card. One choice saves the branch type; clicking outside or pressing Escape dismisses without saving. Explicit subtree types remain visible on their cards, and children inherit the nearest type. Existing node content, incoming relations, sibling types and deeper overrides remain unchanged. Example & help is optional.

[Direct interaction checks](test-evidence/inline-types/direct-results.json), [eight mixed-method groups](test-evidence/inline-types/mixed-results.json) and [14 method/editing groups](test-evidence/inline-types/browser-results.json) passed, including desktop and 390-pixel browser emulation, keyboard dismissal/focus, per-branch save, inheritance reset, remote conflicts and offline re-export. All 62 Python tests passed. Both existing Codex bookshop previews were refreshed and inspected; their shared saved session remained exactly unchanged at revision 3 with 15 thoughts. No new independent agent-client execution is claimed.

## Start with a question, use the keyboard — 10 September 2026

The blank starter accepts one question and creates a single open root with no invented branches or forced method. The main question can be edited inline, preserving custom root labels, existing branches and unrelated agent edits. A concurrent edit to the same question blocks a stale save and keeps the draft. The visible Card selector makes child defaults changeable without opening Details.

Tree type suggestions are local rules based on the card kind and clear wording within Explore. They do not apply automatically, infer a formal Decision or Opportunity tree from a generic question, or replace explicit and inherited specialised choices. A/E/T, Shift+A, arrow navigation, Cmd/Ctrl+Enter and Escape were checked using actual browser keyboard events. Native Tab and typing remain intact; unsaved drafts survive Escape.

[Nine question-flow groups](test-evidence/question-first/flow-results.json), [nine direct-edit groups](test-evidence/question-first/direct-results.json), [eight mixed-method groups](test-evidence/question-first/mixed-results.json), [14 method/editing groups](test-evidence/question-first/browser-results.json) and [five onboarding groups](test-evidence/question-first/onboarding-results.json) passed. All 63 Python tests passed, including the blank route's independence from the existing live tree. Desktop and 390-pixel browser layouts were inspected; the narrow checks use emulation.

Both Codex bookshop previews were refreshed and the inline main-question editor was inspected. The saved live session stayed unchanged at revision 3 with 15 thoughts. New opens a separate standalone tree: export its HTML to retain it, and provide its JSON to an agent when moving into a live session. This update does not establish a new Claude or Cursor client execution result.

## Compact card editor checks

On 10 September 2026, 37 browser check groups passed across [direct editing](test-evidence/compact-editor/direct-results.json), [question and keyboard flows](test-evidence/compact-editor/question-results.json), [tree methods](test-evidence/compact-editor/browser-results.json) and [onboarding](test-evidence/compact-editor/onboarding-results.json). The editor opens beside its card on desktop and as a compact bottom sheet at a 390px viewport. Its default view has one text field; optional card settings and notes stay collapsed. Tests cover retaining dirty drafts on Close, returning focus after Save/Add, concurrent edits and exports. These are browser tests, including phone-sized emulation, not a new external-agent or physical-phone test. The current editor was also opened and inspected in the Codex in-app preview.

## Contextual add menu checks

On 10 September 2026, [10 direct-edit browser check groups](test-evidence/contextual-add/results.json) passed with the contextual **+** menu. Checks cover hover without focus, selection or state changes; moving the pointer into the menu; click and keyboard choice; unchanged framework methods; draft guards; the direct **A** shortcut; exported copies; and touch-context taps at a 390px viewport. Touch emulation does not establish physical-phone behavior. The menu was also opened and inspected in the Codex in-app preview.

## Manual use and local CLI — 10 September 2026

A [hands-on Codex trial](test-evidence/user-cli/trial-report.json) started with a blank question, added branches through the contextual menu and keyboard, and created a driver subtree inside an issue tree. In a separate live session, the tester manually added a question, extended the same tree through the new partial-edit CLI, then revised the question manually again. A stale agent update was rejected without changing the tree. The fresh update preserved the correction and all existing nodes. The final ten-node tree, including nested issue, hypothesis and driver methods, was observed in the in-app browser. [Before](test-evidence/user-cli/manual-before.json), [manual correction](test-evidence/user-cli/manual-revised.json), [final state](test-evidence/user-cli/final-state.json), [conflict receipt](test-evidence/user-cli/conflict-receipt.json).

The new `canvas.py` helper starts with a question or adopts exported JSON, reads the current state and applies a batch of explicit partial changes. The two shared-session saves took about **50 ms** and **47 ms** on the test machine. These are local command times, excluding reasoning, patch preparation and the browser's polling delay. Fourteen new CLI tests cover imports, preserved fields, rejected batches and concurrent browser/CLI writes; the complete Python suite passed **77 tests**. The [shared-session export checks](test-evidence/user-cli/shared-artifacts.json) verified matching HTML/SVG/JSON state, rendered the ten-node HTML, and imported the export exactly with the updated installed CLI.

The trial found a keyboard gap after choosing a tree type. A/E/T and Shift+A now work from card controls, while Enter/Space retain their control actions. [Five focused browser groups](test-evidence/user-cli/keyboard-results.json) passed, including unsaved-draft protection. The singular count also now reads “1 thought.”

An independent Codex subagent used the previously installed skill's original CLI helpers for an 18-node mixed tree and successive updates. [Measured runtime operations](test-evidence/user-cli/installed-skill-receipts.json) totalled 408 ms, excluding reasoning and payload preparation. Its [HTML, SVG and JSON checks](test-evidence/user-cli/installed-skill-artifacts.json) retained the same complete canonical state. This is a local installed-skill test, not a new Claude, Cursor or Grok client result.

There is no dedicated Strategy Canvas MCP tool. The CUA MCP operated the Codex browser successfully; a separate Playwright MCP could not connect to its configured browser port. The Codex in-app standalone JSON download was requested, but neither a file nor a download event was verified. The toast now says “Download requested” rather than claiming delivery. A standalone export/import round trip in that host remains unverified; live-session CLI exports provide the tested file-delivery route. Keep standalone edits open until their exported file is confirmed. All cases were fictional, with unknown demand and no recommendation; successful storage does not validate strategic reasoning.


## One canvas from question to conclusion — 11 September 2026

The default **+** opens a draft immediately, with an optional contextual kind choice. The heading is smaller, help has one **?** entry, method badges appear where a type starts or changes, and the selected branch gets a dismissible prompt. Add and collapse each have one visible home on the cards; new deep additions pan only enough to stay reachable at the same zoom. Calculations and investigations now open in the existing side panel, with linked records visible under the branch's notes. **Conclusion** edits the canonical decision fields; an explicit deferral and next evidence check are valid. A longer brief stays optional and independently authored.

The [eight journey checks](test-evidence/simpler-canvas/journey.json) exercise notes → calculation → next evidence check → conclusion → Undo → actual HTML download/reopen and JSON adoption into a separate CLI session. They also check a concurrent agent update, preserved human wording, stale brief text and a narrow-screen panel. Returning from an untouched new calculation discards the empty draft. The [three navigation checks](test-evidence/simpler-canvas/analysis-navigation.json) cover refreshing the entire conclusion snapshot during export and serialising simultaneous saves/navigation, including an explicit save of an untouched new calculation. Recovery JSON now includes pending conclusion text. These are fictional local browser/CLI tests, not independent Claude or Cursor runs or proof of strategic validity.

Additional rendered groups cover [direct add](test-evidence/simpler-canvas/add.json), [editing](test-evidence/simpler-canvas/direct-edit.json), [keyboard controls](test-evidence/simpler-canvas/keyboard.json), [simpler chrome](test-evidence/simpler-canvas/chrome.json), [analysis](test-evidence/simpler-canvas/analysis.json), [notes and recovery](test-evidence/simpler-canvas/notes.json), [questions](test-evidence/simpler-canvas/questions.json), [motion](test-evidence/simpler-canvas/motion.json) and [mixed methods](test-evidence/simpler-canvas/methods.json), [onboarding](test-evidence/simpler-canvas/onboarding.json) and [tree editing](test-evidence/simpler-canvas/browser.json). All 103 browser check groups passed. The 86 Python tests and generated-demo check pass. Browser checks use disposable fixtures; mobile checks use emulation, not a physical phone.

The populated workshop branch and its connected notes/results panel were also opened and visually inspected in Codex's in-app browser. The [friction map](user-journey.md) records the full journey and remaining limits: host setup, manual formula entry, judgement about evidence and moving portable copies between tools. Browser recovery and a requested download are not proof of a portable file; the tested export path confirms the file and reopens it. The existing Codex in-app standalone download limitation remains unverified in this update.

## Quieter writing panel — 11 September 2026

The conclusion uses sentence-case labels, a serif heading and borderless text that grows with its content. Cards and connectors are lighter; direct add controls remain visible. The bottom action row stays fixed.

[Nine journey groups](test-evidence/writing-margin/journey.json) and [three navigation groups](test-evidence/writing-margin/navigation.json) passed with this update. Long conclusion text retains its exact content and caret across field switches and narrow-screen resizing; text fits without internal clipping, the panel scrolls, and save/reopen plus HTML/JSON export preserve the wording. The 86 Python tests and generated-demo check passed. Codex’s in-app desktop preview was inspected; mobile checks use browser emulation.
