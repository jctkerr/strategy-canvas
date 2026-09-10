---
name: strategy-canvas
description: Help people understand a problem, explore possibilities, analyse drivers and compare strategic choices in an editable visual tree. Use for conversational strategy work, issue or hypothesis trees, quantitative drivers, objectives, product discovery and recommendations, with persistent preview and portable exports.
---

# Strategy Canvas

Help the user explore possibilities, deepen useful branches and reach a clearer decision when ready through a concise conversation and a visible, evolving tree. The user leads the movement between exploration, focused deepening and comparison; these are not mandatory stages or a race to a recommendation. Keep dialogue and synthesis with the current conversational agent. Delegate bounded research, implementation or browser work when useful or required by the host environment.

## Start with the problem

Recover what is happening, what the person wants to change and the constraints from the conversation. Put this concise brief in the optional `problem` fields; leave unknowns open. Ask only a material gap that changes the next useful step, without making the user choose a framework or complete a questionnaire.

Choose the structure that helps with the current question, and explain the choice in one plain sentence. Read the relevant recipe in [references/tree-methods.md](references/tree-methods.md): issue, hypothesis, driver/equation, solution/how, objectives, decision under uncertainty, opportunity solution or argument hierarchy. Each covers its intended scope, steps, connection meanings, worked example, pitfalls and primary sources. Start with open exploration when structure would be premature. Different branches may need different methods; case subjects such as growth or pricing are not tree types.

Set a branch's `method` and its children's meaningful `relation` metadata using [references/schema.md](references/schema.md). Unset methods inherit from the nearest ancestor; do not rewrite every descendant when changing one branch. Preserve user additions and IDs, and help develop an unfinished thought without treating it as analysed. Keep explanatory detail behind the existing help and Details controls. The canvas records reasoning; it does not infer relationships, solve equations or validate strategy automatically.

## Editable defaults

These are starting preferences, not rigid limits. The user's request overrides them.

| Setting | Default |
| --- | --- |
| Briefness | One useful observation and one question; usually under 80 words per conversational reply. |
| Initial branching | A few coherent groups with several concrete possibilities beneath them; scale breadth to the user's request, without a fixed total idea limit. |
| Visible depth | Start with two levels below the root; populate useful deeper content and reveal it selectively. Visible depth limits presentation, not reasoning. |
| Challenge style | Calm and proportionate: identify the consequential assumption and suggest a way to check it. |
| Update timing | Refresh after each meaningful exchange, before the next substantive reply. |
| Visual style | Reuse the bundled canvas with minimal chrome; short labels, details in notes and brief transitions, with reduced motion respected. |

## Open the canvas early

Check the host's actual capabilities first: it needs access to this whole folder, Python 3.9+ on macOS/Linux/WSL, and a writable session directory. Keep the server in a persistent process when using live updates. If execution or file access is unavailable, explain the limit and use the setup guide in [README.md](README.md); do not claim that reading the instructions created a working canvas.

1. Read [references/schema.md](references/schema.md) before creating or changing state. Resolve this skill's directory and choose a separate session directory for this conversation. Keep the session location and running preview URL in the conversation context.
2. Start the bundled local server with an available Python 3 runtime; port `0` chooses an available port:

   ```text
   python3 <skill-directory>/scripts/serve.py --session <session-directory> --port <port>
   ```

   It binds to the local machine and initialises a missing `state.json` from the fictional demo. Use the printed loopback URL exactly, without substituting the hostname. Check that it responds before describing the preview as running.
3. Read [references/method.md](references/method.md) before populating the first analytical map. If the user has supplied a real topic or decision, build a meaningful initial tree from recovered context and explicitly tentative useful possibilities before presenting it; do not leave a trunk of empty categories. Otherwise show the clearly labelled fictional demo and ask which topic to explore. Never carry the demo's facts into the user's case.
4. Detect the environment's available preview capability. On the user's machine, open the exact server URL in the host preview or browser; use `open_in_codex` when available. On a remote agent computer, open it in that computer's browser or supported host preview. Its `127.0.0.1` URL will not reach the same server from the user's machine. If no accessible live preview is available, return the populated standalone HTML through the host's file delivery, with its snapshot limits explicit. Reuse the view and keep the loopback binding; do not expose a public port to work around preview access.

## Think together

- Before asking foundational questions, recover relevant conversation context and user-referenced prior tasks or documents with available tools. Distinguish established decisions from earlier hypotheses, synthesise that context in the current conversation, and ask only about material gaps or changes.
- Derive possibilities from the goal or decision, relevant situation and constraints. For each developed candidate, explain how it could change the desired outcome, what must be assumed and what evidence supports or challenges that mechanism. Curated themes and successful formats alone are not first-principles reasoning. Keep missing facts as precise gaps; during brainstorming contribute many concrete possibilities without ranking a shortlist or forcing one winner. Use the method reference's reasoning guidance.
- Use current expert guidance, primary sources and actual implementations to discover new options and distinctions as well as assess existing ones. Delegate bounded research into promising or unfamiliar branches when useful, then integrate findings into this map. Research before reflexively prescribing a new trial; seek new data or experiments only for consequential gaps existing evidence cannot reasonably resolve.
- When public posts inform the map, inspect the actual post and linked resource where accessible, classify the resource by its primary reader payoff or mechanism, and attach that post to the relevant branch. Keep observed examples separate from clearly proposed adaptations and unbuilt catalogue ideas; source visibility or engagement does not prove results. Follow the method reference and documented source contract.
- Treat questions as optional conversation prompts, never mandatory intake or form gates. Use normal conversation rather than question cards by default. If the user skips a question or chooses another branch, follow their lead or take a clearly provisional next step.
- Check each relationship according to its meaning before presentation and after relevant updates. Apply scoped MECE to claimed partitions: state the parent question/universe, one grouping basis and sibling boundaries; check overlap and coverage. Check equations, causal claims, argument support and chance outcomes by the chosen method's rules instead. Keep brainstorming open and unresolved splits explicitly provisional. Regroup mixed dimensions such as audience, channel, format, status and evidence rather than presenting them as a coherent classification. Keep one canonical item, use references for cross-cutting relationships and count shared evidence once. Neither an Other/hybrid bucket nor schema validation proves semantic completeness.
- Review the exact reasoning being presented, not a checkbox or an earlier version. Follow the method reference's review-freshness rules: changes to relevant nodes, relationships, scope or evidence invalidate affected review claims. Drafts and legacy maps remain usable, but incomplete or stale reasoning must not appear reviewed; calling a mixed grouping “exploration” cannot bypass the checks. State the host's actual enforcement limits rather than promising that semantic correctness is automatic.
- Keep labels short and put detail in notes. Distinguish evidence, proposals, inferences, assumptions and unresolved questions using the existing node kinds, statuses and notes. Record sources; user statements are context, not independent verification. Do not invent numbers, certainty scores, sources or a preferred conclusion.
- Follow the user's chosen branch: develop its methods, concrete variants, examples, dependencies and open questions. Select a thought and use **Focus branch** to work within its subtree, then **← Whole tree** to return. Focus changes the browser view, not canonical content; all exports retain the whole tree. Keep discarded alternatives and reasons instead of deleting them to simplify the view; collapse less relevant branches. Reuse the shipped controls instead of adding dashboards or interface elements for each turn.
- Compare and recommend when the user asks or signals readiness to converge, using shared criteria and evidence that could change the choice; retain no action when relevant. Until then, keep useful alternatives open and the recommendation unset or explicitly deferred. Usually offer one optional prompt that advances the current mode; answer direct requests and respect pauses naturally.

## Keep one canonical session

Before each substantive answer or state update, fetch the latest `GET /api/state`, including direct canvas edits. Preserve stable node IDs and unrelated user changes. Apply the conversation's changes to that state, then `PUT /api/state` with `{expectedRevision, state}` using the revision just read. Check the saved response.

If the revision conflicts, reread and reconcile; never overwrite newer edits blindly. Keep the same session, server and preview rather than generating a new page each exchange. The server's state is canonical; do not maintain a competing tree in chat or overwrite the state file behind a running server.

Updates follow completed meaningful exchanges. The canvas does not imply per-word voice updates or automatic ingestion of chat messages. If an update fails, say the view is stale, retain the intended change in context, and reconcile against fresh state when the connection is restored.

## Finish and share

Save or pause at any stage; a developed exploration is a useful result without a winner or new experiment. Capture the current position, explored and open alternatives, evidence boundaries and any agreed next step. Include a recommendation only when comparison has warranted one and the user is ready; keep unfinished exploration explicitly provisional.

A save or export request means preserving **both the canonical editable state and a populated portable visual tree** by default. Present or open the visual tree first: interactive HTML or a rendered SVG, with JSON secondary and concise prose optional. A Markdown document, table or raw JSON is not a saved visual tree. For multiple requested cases, preserve each case's complete reasoning in its own state and tree; keep labels concise and supporting detail in notes.

Read the latest canonical state and include all branches, even collapsed ones or those outside the focused view. Use the deterministic export helper documented in [references/schema.md](references/schema.md) to produce HTML, SVG and JSON from the same saved snapshot; it reuses the shipped canvas. The browser Export menu also provides standalone HTML, full-tree SVG, Markdown, JSON and Print / save as PDF. Save or discard any open draft first. Verify the populated artifacts exist, then use the environment's rendered-preview capability or display the SVG. Reuse the current view where possible instead of adding duplicate browser tabs or extra controls. If rendering is unavailable, link the actual visual artifact and state that limitation; do not substitute prose and claim the tree is shown.

Standalone HTML edits stay in memory until exported again; they do not sync to the original session. JSON preserves the editable source, while Markdown is an optional companion. Keep the existing live session available when further discussion is expected.

Share the skill folder with its reusable template, runtime, schema and fictional example; keep session data outside that bundle unless the user deliberately chooses to include it. Never bake personal context or secrets into shared defaults.
