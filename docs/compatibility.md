# Compatibility and test record

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

The current interface opens editing by clicking a thought. Each card has a child **+** and a separate collapse chevron; the selected card offers **Tree type**. The chooser has nine short choices with examples behind **Example & help**. Notes, sources and metadata remain behind **Details**, and Quick start begins collapsed. On small screens, the editor opens at the bottom so the selected card remains reachable.

[Seven direct-edit browser groups](test-evidence/direct-edit/browser-results.json) passed, including clicked-parent additions, keyboard access, unchanged hidden metadata, draft protection, subtree scope and offline editing. A same-node external change now blocks stale saves as well as preserving the draft. The current [14 method/editing](test-evidence/direct-edit/method-results.json), [eight mixed-method](test-evidence/direct-edit/mixed-results.json), [five onboarding](test-evidence/direct-edit/onboarding-results.json) and [nine analysis](test-evidence/direct-edit/analysis-results.json) groups also passed, alongside 62 Python tests. The default chooser rendered at 65 words and 526 pixels tall in the inspected desktop fixture. The 390-pixel checks use browser emulation.

The updated interface was also inspected in Codex's existing in-app bookshop tab. Opening a child draft and the shorter chooser left the complete saved session unchanged at revision 3 with 15 thoughts. This UI update does not add an independent Claude or Cursor execution claim.
