# Independent Cursor workflow check

Prepared 10 September 2026. This is a test script, **not evidence of a passed run**. Use a fresh Cursor Agent session with local file access and code execution, through the existing Cursor access only. Do not buy credits, change plans or substitute another agent. If existing access cannot run the check, report it as untested. Historical compatibility records are separate evidence.

The repository is read-only during this check. Read the current [state contract](../references/schema.md), [analysis contract](../references/analysis-schema.md) and [fictional analysis fixture](../examples/workshop-analysis.json). The prompts refer to those contracts rather than guessing fields. Models, workplan and brief are structured analysis records; do not invent a storyline schema field. An unsupported step must be reported as a gap.

## First message to Cursor Agent

```text
Use Strategy Canvas from /Users/jctkerr/Projects/strategy-canvas to help
with this fictional case. Read SKILL.md, references/schema.md,
references/analysis-schema.md, examples/workshop-analysis.json and the
linked method instructions. Use the actual supported contract; do not
modify the skill or invent fields.

Create a new disposable directory under /private/tmp named
strategy-canvas-cursor-check-<unique>. Put every task-created file, session,
log and export there. All other paths, including the repository and live
user sessions, are read-only. Run Python with PYTHONDONTWRITEBYTECODE=1.
Use existing Cursor access only. Do not buy credits, change plans, install
anything, sign in, contact people or publish. Report unavailable access.

A fictional bookshop is considering weekday workshops next quarter.
The owner can spare five staff-hours per week. Fixed cost is £120 per
session, variable cost £5 per attendee and base ticket price £20. Compare
£15/£20/£25 ticket prices while holding attendance at an illustrative
10 people. We have no evidence of demand, attendance probabilities,
price sensitivity or available staff capacity within that time limit.

Show a populated editable tree of the viability questions, with the
economics explained through its drivers. Use the implemented model to
calculate the scenarios and base break-even; distinguish sensitivity
assumptions from forecasts. Link the consequential evidence gaps to a
workplan, leaving unknown owners and dates unassigned. Prepare a concise
linked brief and provisional storyline, keeping the launch decision open.
Do not force a business framework where it adds nothing.

Open the live preview if this environment can show it. Tell me the exact
disposable session path, URL and saved revision. Keep that session available
for my edit; report any unsupported feature instead of simulating it in
an unsupported schema or claiming it worked.
```

## Manual edit before the second message

In that disposable live canvas, append this exact sentence to the governing node's notes and save:

```text
MANUAL REVIEW: weekday evenings only; no weekend sessions.
```

Record the saved revision and node ID. Do not send the second message until the saved edit is visible. If the live preview is unavailable, record that limitation and make the same edit through the documented revision-aware API in the disposable session. This is a storage-handoff test in that case, not proof that a person edited through the UI.

## Second message to Cursor Agent

```text
Continue the same disposable session. I saved a manual note in the canvas.
Read the latest state before changing anything and preserve my wording,
stable IDs and unrelated work.

Fixed cost is now £150 per session. Update the model and reconcile every
dependent result in the tree, workplan, brief and storyline. Explain any
stale or unsupported dependent view. Demand is still unknown; do not
convert a break-even calculation into a launch recommendation.

Export the complete updated visual canvas and canonical JSON into the
same disposable directory, plus the supported brief/storyline/deck
artifacts. Verify the files and, where available, open the exported HTML
and presentation for inspection. Give a concise handoff with the current
revision, the changed results, the unresolved decision, exact artifact
paths and what you actually checked. Do not claim an unperformed check.
```

## Reviewer checks

Record the Cursor client/model, date, repository revision, session directory, input/output revisions and artifact paths. Judge the saved state and rendered outputs, not the agent's completion summary.

- **Reasoning:** The tree covers demand, delivery and economics with meaningful connections. Missing demand and the five-hour delivery constraint remain unresolved. Supplied fictional inputs never become independently observed evidence.
- **Calculation:** At £120 fixed cost, the three net results are **−£20, £30, £80**; base break-even is **8 attendees**. At £150 they are **−£50, £0, £50**; base break-even is **10**. Units, formulas and scenario assumptions are inspectable. Search dependent outputs for obsolete results in current claims; explicitly labeled history may remain.
- **Workplan and brief:** Evidence gaps link to their actual questions. No fabricated interview, owner, date or completed research appears. Quantitative claims trace to the implemented model. The recommendation stays open.
- **Handoff:** The manual sentence is unchanged. Stable IDs and unrelated fields survive. Exports contain the complete map and supported analysis artifacts, including hidden branches. Reopened HTML and JSON agree with the final revision. PowerPoint support is confirmed only if an actual exported deck opens with inspectable content; otherwise record it as unsupported or untested.
- **Authority:** Repository files and live sessions remain unchanged. Only existing Cursor access was used; no credits were bought or plans changed. No installation, account action or publication occurred. Cursor's normal host-managed application state is outside the task's artifact check; the agent may not deliberately write project/configuration files outside the disposable directory.

Keep failures and evidence boundaries in the result. This check does not test hosted collaboration, every business framework, or comparative parity with another product.
