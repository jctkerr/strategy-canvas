# Razn comparison and acceptance cases

## Observed onboarding and current canvas — 11 September 2026

**Observed in [Razn](https://razn.app/):** five screens—Welcome; Start with problem; Or try template; Your workspace; Work with agent. Each offered Skip, with Back after the first, Next/Done and replay. This shows the orientation flow, not the capabilities described within it.

On the inspected account, submitting the starting prompt, creating a project manually or choosing a framework led to a subscription screen. The working editors, agent results, calculations and deck output were not exercised. The [advertised feature list](https://razn.app/#features) remains a separate evidence category; these observations do not establish parity.

**Current Strategy Canvas:** nine tree methods with mixed subtrees; direct notes and sources; branch-linked calculations and investigations; editable Conclusion; an optional referenced brief and basic editable PowerPoint export. The [current journey](user-journey.md) connects these in one canvas, and the [compatibility record](compatibility.md#one-canvas-from-question-to-conclusion--11-september-2026) identifies exercised checks. The historical gaps below must not be read as today's feature inventory.

The useful onboarding lesson is to explain the next action briefly, keep guidance skippable and make it easy to replay. Wider framework coverage, sophisticated modelling, a rich document editor, learning history and hosted collaboration remain distinct scope; adding a tour does not supply them.

## Historical baseline — 10 September 2026

Public-source audit: **10 September 2026**. Strategy Canvas baseline: **`492d6bf`**, before the work prompted by this comparison. This is a dated gap assessment, not a parity claim or a test result for subsequent changes.

## Evidence boundary

- **Observed public example:** readable content on a public page. This verifies the example is present, not that the underlying editor or calculation works.
- **Published guidance:** a complete public instructional article; useful for understanding the intended workflow, not evidence of implemented software.
- **Marketed / untested:** Razn describes a capability, but its working controls, persistence or output were not exercised.

Razn's Features, Workflow and Pricing links point to homepage anchors. The learning page's module-preview link goes to the public blog; its curriculum and workflow actions go to [sign-in](https://razn.app/login). The inspected public navigation and search did not expose separate framework, model or deck product manuals. No account, trial, download, payment or private input was used. No historical agent-compatibility result is treated as a current test; this audit did not launch an agent client.

Local comparison used [README](../README.md), [SKILL](../SKILL.md), [schema](../references/schema.md), [tree recipes](../references/tree-methods.md), [reasoning guidance](../references/method.md) and the validator. Instructional requirements are distinguished below from runtime features. Existing tests were not rerun for this research document.

## Capability matrix

| Capability | Razn evidence and scope | Strategy Canvas at the baseline | Acceptance case |
| --- | --- | --- | --- |
| Frame and develop a problem | The [workflow](https://razn.app/#workflow) advertises framing, decomposition, analysis and communication. The [4S article](https://razn.app/blog/4s-method-state-structure-solve-sell) explains the intended artifacts. Published guidance; project execution untested. | Optional problem brief; editable tree with typed nodes, connections and mixed methods. Agent instructions recover context and develop useful possibilities. No enforced workflow stages. | **A1–A2** |
| Framework selection and application | [Homepage](https://razn.app/#features) claims 35+ frameworks, naming SWOT and Five Forces. Its [custom-framework article](https://razn.app/blog/custom-frameworks-case-interviews) teaches adapting structures to the question. Full catalog and application controls unverified. | Eight analytical tree families plus exploration; sourced recipes, worked examples and a task-led picker. These tree families are not equivalent to 35 business frameworks. Broader framework catalog is a gap. | **A3** |
| Quantitative modeling | [Homepage](https://razn.app/#features) displays a three-scenario uplift example and promises formulas, named variables, dependencies and sensitivity. Example observed; recalculation and traceability untested. | Driver/decision trees record equations and assumptions in notes. The agent calculates separately. No structured variables, scenario engine, formula evaluation or probability checks. | **A4** |
| Investigation priorities and workplan | The [workplan article](https://razn.app/blog/issue-tree-to-workplan) teaches linking a hypothesis to analysis, data, source, owner and deadline. The [4S article](https://razn.app/blog/4s-method-state-structure-solve-sell) claims first-class workplan artifacts. Guidance observed; editor untested. | Skill asks for consequential gaps and evidence-led investigation; actions and next steps can be recorded as text. No structured linked workplan. | **A5** |
| Structured findings and documents | [Homepage](https://razn.app/#features) shows an SCR example and markets a block editor. The [document article](https://razn.app/blog/answer-first-writing) explains answer-first arguments and evidence. Example/guidance observed; document editing untested. | Argument trees, decision fields and complete Markdown export. No editable SCR/pyramid document model or linked findings collection. | **A6** |
| Storyline and presentation output | [Homepage](https://razn.app/#features) shows an action-title slide example and advertises PowerPoint export. The [storyline article](https://razn.app/blog/deck-storyline-action-titles) describes title-sequence and evidence checks. Example/guidance observed; slide generation/export untested. | HTML, SVG, JSON, Markdown and browser print. No storyline objects, slide editor or PowerPoint generator. | **A7** |
| Learn by doing | [Learning page](https://razn.app/learn-consulting-by-doing) promises concept/example/practice/feedback/review, progress tracking and short sessions. Public essays are accessible; exercises, feedback and progress behavior are gated and untested. | Skippable introduction, help, worked recipes and agent evaluation prompts. No learner submissions, feedback history, progress tracker or scheduled review. | **A8** |
| Persistence, agents and collaboration | [Homepage](https://razn.app/#pricing) markets multiple AI models and workspace collaboration. Actual editing conflicts, sharing and offline behavior untested. | External agent conversation; local session with atomic revision checks and one-level undo. Complete portable exports; standalone edits require another export. Single-user helper, no hosted team permissions or shared workspace product. | **A2, A9** |

The homepage's separate illustrative examples do not prove a single end-to-end trace from evidence through a recalculated model to an updated deck. That continuity is a useful acceptance target for our implementation, not an observed Razn result.

## Measurable acceptance cases

These are proposed checks, **not passed checks**. Use the same fictional case throughout where possible. Keep the tree usable without completing every artifact or forcing a recommendation.

| ID | Test and observable pass condition |
| --- | --- |
| **A1 — Useful first map** | Give an agent a fictional workshop question, desired result and five staff-hours per week. It produces a populated, case-specific tree and visible brief, preserves unknown demand, and explains the chosen structure without requiring a framework form. No invented customers, results or preferred answer. |
| **A2 — Continue the same reasoning** | Save a manual note, then ask the agent to deepen a different branch. The latest manual edit and stable IDs survive. A deliberately stale write is rejected and reconciled. After restart, the same canonical tree and linked artifacts remain. Add opens a draft; discard creates no node. |
| **A3 — Apply the right framework** | For every newly supported framework, provide its decision purpose, primary attribution, actual mechanism, limits and one original worked example. Test both a suitable case and a case where it should be declined or adapted explicitly. A changed selection must preserve user content and must not mark it reviewed. Count completed, tested applications separately from names in a picker. |
| **A4 — Compute and trace scenarios** | Fictional inputs: 10 attendees, £120 fixed cost, £5 variable cost per attendee; ticket-price scenarios £15/£20/£25. Show net results **−£20/£30/£80** and base break-even **8 attendees**, with formulas, units and input provenance. Change fixed cost to £150: results become **−£50/£0/£50**, base break-even **10**. Dependent views must update or visibly become stale. Missing inputs, undefined names, cycles and zero denominators must not yield plausible-looking numbers. Numbers alone do not establish demand or viability. |
| **A5 — Turn a gap into work** | From unresolved willingness to pay, create a work item linked to the exact question/hypothesis, with analysis, required evidence, source, owner/date only when supplied, and an explicit priority rationale. Completing work records its finding and limitations; it does not automatically support the hypothesis. The item survives edit, undo, restart and export. |
| **A6 — Build an inspectable brief** | Produce an editable problem setup, provisional answer or explicit deferral, supporting claims and evidence references from the saved case. Every material quantitative claim points to its model/input and every cited observation to its source. Manual wording survives an unrelated agent edit. Changing a referenced fact updates the brief or visibly invalidates the affected claim before reuse. |
| **A7 — Produce a usable deck** | Derive an editable title sequence from A6; each slide has one claim, matching support and source/model references. Read titles alone for continuity, then inspect each slide against its claim. Export an actual `.pptx`, open it in a presentation application and verify editable titles, numbers, notes/references and layout. Re-export after A4's input change; no stale £30 claim may remain. A file extension or successful archive write is insufficient. |
| **A8 — Practice and improve** | Show one concept and worked example; accept a learner's own attempt. Give specific feedback on actual branches, assumptions and missing evidence with an example revision. Preserve the original attempt and feedback if progress is offered. Skipping practice/help leaves the working tree unchanged; completing UI steps does not certify strategy skill. |
| **A9 — Preserve and hand off** | Export a collapsed/focused map and all new artifacts as canonical JSON plus a populated visual HTML file. Reopen offline: complete content, sources, links and scenario assumptions remain. Make an offline edit, export again and resume from that JSON with a file-capable agent. State the save/chat boundary clearly. Confirm old schema-valid sessions remain usable. Hosted team collaboration would require separate permission, concurrent-edit and recovery checks. |

## What would justify a stronger comparison

Record actual outputs, inspected revisions, client/version and failures against A1–A9. Use the [independent Cursor workflow](../tests/cursor-workflow-prompt.md) through existing Cursor access only for the agent handoff. Do not buy credits, change plans or substitute another agent; label unavailable access untested. Historical test evidence stays separate and unchanged. Preserve a dated result rather than converting these requirements into a completion checklist by assertion.

The present baseline is strongest at editable, portable, method-aware trees. The substantive development gaps are linked quantitative analysis, workplans, structured communication artifacts and presentation output. Curriculum breadth and hosted collaboration are additional product scope. Neither adding more labels nor passing storage tests establishes equivalent consulting outcomes or Razn parity.


## Subsequent implementation evidence — 10 September 2026

The follow-up adds an optional **Analysis** workspace: explicit scenario models, branch-linked workplans and editable briefs with node/source/model references. Changed calculations leave old wording visibly stale. JSON and standalone HTML preserve these records. Basic editable PowerPoint export and five sourced business-framework recipes are also present. The recipes are guidance for the conversational agent, not five specialised editors.

The [compatibility record](compatibility.md#in-app-preview-and-current-analysis-checks) records 62 local Python tests, nine analysis browser groups, existing UI regression groups, native preview observations and a bounded Cursor handoff. Cursor command permissions blocked automatic session setup; a separately validated proposal needed reasoning corrections. These results support particular functions within A1–A9; they do not mark every acceptance case passed. Full learning history, a broad tested framework catalogue and hosted team collaboration remain outside this update. Razn's gated runtime was not exercised, so functional parity is not established.
