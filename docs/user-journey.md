# From a question to a useful stopping point

One canvas: **question → develop a branch → check the reasoning → record where we are → keep the work**. Return to any part when the question or evidence changes; these are not required stages.

A useful ending is either a **supported decision** with reasons, uncertainty and a next action, or a **clear next evidence check**: what to check, where to look and how the result could change the choice. A person may also pause with a useful exploration. Saving never requires a winner.

## The journey

1. **Start.** Manually, type a question or go straight to the root and edit it. With an agent, give the question and known context; it opens a useful initial tree beside the conversation. No framework selection or onboarding is required.
2. **Develop.** Use a card’s **+**, type and **Add**; its kind is an editable default. Or select a branch and say “Explore this.” The agent reads the current selection and saved state first.
3. **Understand.** Write notes, inspect sources and open linked calculations or investigations in the same right panel. The agent adds findings where they belong, preserving human words and uncertainty.
4. **Reframe.** Edit the question when the goal changes. Preserve useful alternatives; revise affected assumptions, calculations, work and conclusions. Changing a label alone does not repair the reasoning.
5. **Pause or decide.** **Conclusion** opens the canvas’s side panel: **Current position**, **Why**, **Still unknown**, **Next steps**. A deferral is valid. The agent uses these same canonical decision fields. A longer brief is optional.
6. **Keep and return.** Confirm the save. Export HTML, check the actual download and reopen it. For agent continuation, export JSON and adopt it into a new live session; the original session remains unchanged.

## Friction and the smallest useful response

Review started from `ed88885` on 11 September 2026. The changes below are implemented. The compatibility record links the exercised acceptance paths. [Runtime](../assets/canvas.html) · [storage contract](../references/schema.md).

| Friction found | Response |
| --- | --- |
| Heading, help entrances and footer reduce tree space. | Compact heading; one **?**; short, dismissible contextual hints. |
| **+** requires a kind before writing. | Open the suggested draft immediately; offer another kind inside the panel. |
| A deep addition can slip behind the side panel. | Pan only as far as needed to keep the new card and its **+** reachable; preserve zoom. |
| Full method controls repeat on cards. | Short labels only where a method starts or changes; inherited types stay reachable through selection or **T**. |
| Numbers and work exist behind a separate Analysis dialog. | Show the selected branch’s linked result and next work in its panel, with direct open/add. |
| Manual users lack an editable stopping point. | One **Conclusion** entry opens the canvas summary; retain an open decision without duplicating it in Brief. |
| Recovery and file export can be confused. | Keep save/error state visible. Browser recovery is local; verify the exported file before treating it as a portable backup. |

## Acceptance checks

Use one fictional case through both manual and agent paths. The linked browser checks exercise these criteria; reasoning quality remains a human/agent judgement:

- Start and add a child without mandatory guidance, a modal or a kind choice. Keep one visible home per action and a small stable bottom row with shortcut hints.
- Read and edit notes, sources and linked work without losing the tree, selection or editing position. Check keyboard and narrow-screen use.
- Change an assumption; preserve unrelated branches, IDs and human text. Review dependent wording; stale claims do not become current automatically.
- Record both endings above. Reopen **Conclusion** and find the reason and next check; neither requires a winner, owner or deadline.
- Exercise Undo, interrupted typing, failed saves and conflicting agent edits. Preserve recoverable drafts and show unresolved errors.
- Export a focused tree, reopen the actual HTML and verify all branches, notes, sources, analysis and conclusion. Import its JSON into a new session without losing content.

## Remaining boundaries

The [compatibility record](compatibility.md#one-canvas-from-question-to-conclusion--11-september-2026) owns the rendered journey, preservation and export results. These use fictional cases and a programmatic agent update; they do not establish a new Claude or Cursor client test.

Evidence quality, sound reasoning and a justified decision require human/agent judgement. A status dot, finished work item or calculation is not validation. Standalone copies do not sync with live sessions or across devices; external-agent setup and download support remain host-dependent.

## Friction still to watch

| Point | Remaining effort | Current way through |
| --- | --- | --- |
| Start with an agent | The host needs local execution and a working embedded preview. | One setup prompt; verify the actual pane before saying it is open. |
| Build a calculation manually | Inputs, units and formulas still need thought; a blank model is more demanding than a note. | Keep it optional. The agent can prepare an explicit model; the person can inspect and change its inputs. |
| Reach a justified conclusion | A tidy tree or positive scenario cannot settle missing evidence. | Record the consequential unknown and next check, or the supported decision with its limits. |
| Return on another device/tool | Browser recovery is not a shared online workspace. | Confirm the HTML/JSON download and reopen or adopt it. Keep the original open if that host cannot deliver downloads. |
