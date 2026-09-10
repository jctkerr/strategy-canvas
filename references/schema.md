# Strategy Canvas state and runtime

The installed skill is a reusable template. Each conversation has a separate session directory containing `state.json` and `.state.lock`. Do not put private session data into the shareable skill bundle. The bundled demo is explicitly fictional.

## Start a session

Requires Python 3.9+ on macOS or Linux. No pip packages, Node build, remote fonts, CDN or service are needed. Optional native LinkedIn previews contact LinkedIn only after a person opens a source; the canvas itself has no external runtime dependency. File locking uses the standard-library `fcntl` module and therefore does not support Windows directly; WSL is suitable.

```sh
python3 /absolute/path/strategy-canvas/scripts/serve.py \
  --session /absolute/path/to/session \
  --port 0
```

The server binds only to `127.0.0.1`. Port `0` selects an available port. Use the exact printed URL, including the numeric loopback hostname. Keep the process alive in a persistent terminal/exec session. The session directory is created if necessary; the fictional example initialises `state.json` only when no state exists. An existing session is validated and preserved. Open the URL in a browser on the same machine or a host preview that can reach it. A remote agent's loopback URL is not the user's local server. Use a downloadable standalone HTML export when the host cannot provide an accessible live preview. Reuse the same URL and session for later turns.

The HTML template and styling live in `assets/canvas.html`; edit the CSS variables for an intentional visual variation. The canonical state is independent of the template. Template changes need a browser reload; state changes appear through polling roughly every 1.4 seconds while connected.

## Canonical schema

The top-level fields in the example below are required. The problem/method/relationship, structured sources and [analysis workspace](analysis-schema.md) extensions are optional; unknown fields are rejected. There must be exactly one root, every parent must exist, every ID must be unique and the tree must be acyclic. Node array order controls sibling order. Keep IDs stable across edits.

These are structural checks, not proof of semantic MECE or evidence quality. Use `notes` to record a split's question, universe, grouping basis, sibling boundaries and gaps. Use each child's optional `relation` to name the incoming connection; its type is descriptive, not a certified relationship. The runtime has one parent per node and no cross-link or graph field: refer to existing node IDs in notes and reuse `sourceIds` for shared evidence, without inventing schema fields or duplicating canonical items. Apply the semantic check in [method.md](method.md).

Record candidate mechanisms, assumptions and supporting/challenging evidence in existing notes and source fields. There is no `reviewed`, review-receipt or dependency-hash field, and the server does not perform semantic review or automatically invalidate old review claims. Use `context` and relevant node notes to identify draft/unreviewed reasoning, exact review scope and stale findings; the node `status` values retain their documented meaning. `supported` does not mean the whole decomposition passed review. An accepted PUT or successful export proves schema-valid storage, not first-principles reasoning, conceptual MECE or current evidence. Do not add unsupported certification fields or present an old review note as applying to changed content; follow the review-freshness instructions in the method reference.

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "title": "A short session title",
  "question": "The strategic question being explored",
  "context": "A concise statement of context and evidence limits",
  "nextQuestion": "An optional conversational prompt, never a required field for the person",
  "nodes": [
    {
      "id": "root",
      "parentId": null,
      "label": "A short thought",
      "kind": "question",
      "status": "open",
      "notes": "More detail revealed when selected",
      "source": "Optional source or basis"
    }
  ],
  "decision": {
    "recommendation": "",
    "rationale": "",
    "uncertainties": [],
    "nextSteps": []
  }
}
```

- `kind`: `question`, `option`, `criterion`, `evidence`, `assumption`, `action`, `hypothesis`, `metric`, `objective`, `solution`, `outcome`, `test`, `chance`, `claim`. These name the thought's role; they do not choose a method, establish truth or run a calculation.
- `status`: `open`, `supported`, `uncertain`, `ruled-out`. A supported status is not an automatic verification: explain its basis in notes/source.
- IDs: 1–80 ASCII letters, digits, underscores or hyphens; first character must be a letter or digit.
- Labels: 1–240 characters, non-blank. Short labels of roughly 3–8 words work best. Cards display up to three lines with truncation; the full label is available in the inspector, SVG title and JSON/Markdown/HTML exports.
- Other header text: at most 10,000 characters. `question` is non-blank. `nextQuestion` can be empty; the interface then offers a generic optional prompt.
- Notes/source: at most 20,000 characters. Source is optional multiline plain text. Details shows HTTP(S) URLs as clickable links without loading them automatically; other source/basis text stays intact.
- Decision recommendation/rationale: at most 20,000 characters. Each decision list allows at most 100 strings of at most 10,000 characters.
- `schemaVersion`: exactly 1. `revision`: positive integer, assigned to current revision + 1 on every accepted update.
- Tree: 1–300 nodes. Whole state: at most 2 MB UTF-8. The canonical map can hold substantive brainstorming breadth and depth. Keep its presentation concise through short labels, branch collapse and Focus branch; do not treat a small visible view as a limit on the ideas recorded.

## Optional problem, method and relationship metadata

This additive extension retains `schemaVersion: 1`. Existing states remain valid and unmodified; missing method or relation fields mean unspecified. The runtime never silently upgrades a legacy tree to an analytical method or infers causal meaning from its shape. Preserve these fields during ordinary edits and exports.

An optional top-level `problem` object holds any of the following optional fields, each a string of at most 10,000 characters. Empty strings and an empty object are valid; unknown fields, arrays and null are rejected.

- `situation`: what is happening, with known facts and relevant uncertainty.
- `desiredChange`: what the person wants to be different, or the decision they need to reach.
- `constraints`: relevant limits, boundaries or commitments.

This is a brief that the person can revise, not mandatory intake. Recover known context first and ask only about material gaps. Keep `question` as the governing question; the brief supplies its context rather than replacing it.

Each node may specify a `method` string. Its descendants inherit that method until a descendant explicitly overrides it. The closest explicit ancestor wins; array order does not affect inheritance. Setting the root method supplies the tree's starting approach; setting a non-root method changes only that subtree. Preserve deeper explicit overrides and unrelated branches. Removing an override restores inheritance; if no ancestor specifies a method, it remains unspecified. There is no default stored method and no automatic conversion or validation of existing children when a method changes.

| Value | Intended use |
| --- | --- |
| `exploration` | Generate and develop possibilities without forcing a premature comparison. |
| `issue` | Decompose a governing question into answerable subquestions. |
| `hypothesis` | Examine a provisional claim through testable conditions and disconfirming evidence. |
| `driver` | Express a result through explicit mathematical drivers, operators, units and assumptions. |
| `solution` | Connect a desired improvement to potential interventions and their causal mechanisms. |
| `objectives` | Clarify desired ends and more specific objectives before assessing alternatives. |
| `decision` | Compare choices with uncertain outcomes, probabilities and payoffs or utilities. |
| `opportunity` | Product discovery: outcome, research-grounded customer needs, solutions and assumption tests. |
| `argument` | Organise a conclusion, logically grouped supporting arguments and evidence. |

Each non-root node may also have an incoming `relation` object. `type` is required and must be one of the following strings. Optional `label` is plain text of at most 120 characters (empty is allowed), for a specific mechanism, operator or explanation. The root cannot have a relation. Unknown fields or types are rejected. Relations do not inherit: each describes that node's own connection to its parent.

| Type | Reading of the connection |
| --- | --- |
| `part-of` | The child is a component or subquestion of the parent; explain the grouping basis and boundaries. |
| `possible-cause` | The child might contribute to or explain the parent; a causal hypothesis, not proof. |
| `calculated-from` | The parent is calculated using the child; record the full equation and units in the parent's notes and use the label for the child's operator or role. |
| `could-achieve` | The child is an intervention that could help achieve the parent; explain the mechanism and assumptions. |
| `refines` | The child makes the parent's objective or concept more specific. |
| `supports` | The child offers an argument or evidence in favour of the parent; record its relevance and limits. |
| `challenges` | The child raises evidence or reasoning against the parent. |
| `choice` | The child is an available choice at the parent decision. |
| `outcome` | The child is a possible consequence or chance outcome beneath the parent. |
| `tests` | The child is a test of the parent assumption or claim. |
| `idea` | The child is a related possibility being explored; no stronger relationship is claimed. |

For example, a root metric can use `method: "driver"`; its child metric can use `relation: {"type": "calculated-from", "label": "Subtract variable cost"}`. The root's notes should contain the complete equation, measurement period and units. A later branch can override its inherited method with `method: "solution"` when exploring how to change the result. A method boundary does not change the incoming relationship: a break-even subquestion beneath an issue tree remains `part-of`, while its mathematical inputs use `calculated-from`. Inspect both sides of the boundary and the node roles after a method change; see the [worked mixed tree](tree-methods.md#move-between-methods). Add only the semantics the reasoning supports; do not populate fields just to appear complete.

Tree methods and relations describe meaning; changing them does not evaluate equations or certify strategy. Use an explicit [Numbers model](analysis-schema.md) for arithmetic and scenario calculations. A decision tree still needs an agent to check probabilities, conditional assumptions, payoff units/time horizon and information availability: the runtime has no specialised chance-node schema, probability-sum checks or automatic decision rollback. A one-parent tree cannot model feedback, shared causal dependencies or a means–ends network faithfully; use references in notes or a separate suitable representation. There is no `reasoning`, `reviewed` or causal-proof field. Method and relation changes require the agent to review affected reasoning; accepted storage does not perform that review.

## Optional structured sources and provenance

This additive extension retains `schemaVersion: 1`. Existing states with only the original fields continue to validate. Ordinary notes/label/source edits preserve structured fields. The agent maintains source records and provenance through the canonical CLI/API; the canvas deliberately keeps these out of the editing form.

An optional top-level `sources` array holds up to 150 objects. Each record requires:

- `id`: the same 1–80-character ID format as node IDs, unique within the source registry. Source and node IDs have separate namespaces.
- `provider`: `linkedin` or `web`.
- `url`: the inspected original HTTP(S) source URL, at most 2,048 characters, without credentials, whitespace or control characters. LinkedIn records require HTTPS and a `linkedin.com` hostname or subdomain, without an explicit port. Use `linkedin` for actual inspected post references, not a profile or inferred resource link.
- `title`: 1–500 characters, non-blank.
- `checkedAt`: the ISO date or timestamp of inspection, such as `2026-09-05` or `2026-09-05T12:30:00Z`.
- `summary`: 1–10,000 characters, non-blank. Describe what the source actually contains. Separate visible responses, the creator's claims and inferred applicability; reactions/comments do not establish conversion.

Optional fields are `author` (at most 200 characters), `publishedAt` (ISO date/timestamp, only when verified), `limitations` (at most 10,000 characters) and `embedUrl` (at most 2,048 characters). Omit unknown dates. Preserve meaningful access/context limits, such as a workshop offer appearing in an author's comment rather than in the main post.

`embedUrl` is allowed only for LinkedIn sources and must be copied from an inspected official **Embed this post** dialog whose native preview matches the original post. Accepted syntax is exactly `https://www.linkedin.com/embed/feed/update/urn:li:share:DIGITS`, with `ugcPost` or `activity` also accepted in place of `share`, and optional `?collapsed=0` or `?collapsed=1`. No fragments, credentials, other hosts/paths or arbitrary queries are accepted. The native share/ugcPost ID can differ from the activity ID in the original post URL: never manufacture, rewrite or infer one from the other. The validator checks URL syntax; inspection establishes that the two URLs refer to the same post. Raw embed HTML and `srcdoc` are not accepted. If no official embed was verified, omit `embedUrl` and use the original-link fallback.

Nodes may additionally carry:

- `sourceIds`: at most 20 distinct IDs referencing existing source records. Removing a source requires reconciling its node references in the same canonical update.
- `provenance`: `observed`, `proposed`, `catalogue` or `context`. The card labels these **Observed example**, **Idea**, **Catalogue** and **Context** respectively. An absent provenance retains the original kind label. This field is independent of `kind` and `status`: attaching a source does not upgrade an idea to observed or supported.

Use each node's `notes` for the reason it belongs in a category and how the cited source relates to it. Preserve legacy `source` text alongside structured references. For an observed example, identify the actual offered resource and the observed mechanism. For a proposed adaptation, say what is borrowed, what differs and what remains unverified.

## Source peek

A small source badge on a card opens a closable right-hand **Source peek**. LinkedIn-only references retain the LinkedIn icon. Web-only or mixed-provider references use a globe, with a tooltip identifying the provider mix; the chooser also labels each source LinkedIn or Web. The badge appears only for explicitly attached structured records or references on observed descendants; legacy source text is not automatically classified. On a collapsed family or method, the count deduplicates both LinkedIn and web sources from observed descendants. The count means attached examples, not successful or validated methods. Proposed/catalogue descendants do not inflate ancestor counts merely because they cite a source. Their own attached references remain available while their provenance stays explicit.

The peek shows the original source link, author/title, inspection date, recorded observations and limitations, and the citing thought's provenance and notes under **Why this thought cites it**. When opened from an ancestor it identifies the observed descendants that supply the reference. Multiple sources use a compact chooser within the peek. Details also exposes a **View linked sources** button when references exist, including ordinary web sources.

The native iframe is created only after an explicit source-open, source-choice or **Load native post** action. It is constrained to a validated LinkedIn embed URL; arbitrary websites are linked rather than embedded. No third-party post is requested on initial load. LinkedIn controls availability, authentication and embedding; a frame loading is not treated as proof that the native content rendered. The original link and an honest fallback remain available. If a source changes during polling, a different native URL requires another deliberate load.

Opening the peek closes the editing drawer, and opening Details closes the peek. Save or discard an active draft before opening a source, so draft content is preserved. Selection/focus/state changes reconcile removed or hidden source nodes; removing the current source clears its iframe and selects another available record without automatically loading it. Close × clears the frame and returns to the canvas. Peek state is local to the browser and is never stored in canonical state.

## Read and update

`GET /api/state` returns the canonical state object. Read it before proposing an assistant edit so manual canvas changes are preserved.

`PUT /api/state` with `Content-Type: application/json` accepts:

```json
{"expectedRevision": 1, "state": {"...": "the complete proposed state"}}
```

A successful response is the newly stored state with an incremented revision. The server ignores the proposed revision for incrementing, but validates it as a positive integer. A stale `expectedRevision` returns HTTP 409 with `{"error":"…","current":{...}}`; reread, reconcile and retry deliberately. Invalid input returns HTTP 400, wrong content type 415, oversized/empty body 413. Invalid Host or cross-origin requests are rejected. Browser requests must come from the printed server origin. JSON strings are treated as data, not HTML.

For an assistant operating through filesystem tools, use the same storage contract:

```sh
python3 /absolute/path/strategy-canvas/scripts/update_state.py \
  --session /absolute/path/to/session \
  --state /absolute/path/to/proposed-state.json \
  --expected-revision 1
```

The helper prints the accepted revision and node count. Exit code 3 means revision conflict, 2 means invalid input/read error. The CLI and HTTP server share a session lock and atomic replacement. Do not overwrite `state.json` directly after starting a session: direct writes bypass conflict checks.

## Canvas controls and persistence

Guidance starts collapsed. On request, **Quick start** opens a skippable three-step introduction explaining reading the tree, developing a thought and checking the reasoning with the agent. A short hint identifies the current save mode. It is a nonmodal banner: the canvas remains available. Collapsing the guide hides its expanded content and returns that space to the canvas; **Quick start** remains available to reopen at the same step within the current page. **How to use** opens a help dialog with connections, status, focus, undo and export guidance. Touring, collapsing or dismissing guidance does not add thoughts, mark reasoning reviewed or otherwise mutate canonical state. The root is selected on opening, and long Context text scrolls within a bounded area so the tree remains visible.

Dismissal is a local browser preference, not a session field. If browser storage is unavailable, the canvas remains usable and the introduction may appear again. Standalone exports reset transient onboarding/help UI and do not embed the exporting person's dismissal preference; the recipient's browser controls its own preference. The help distinguishes live saves from standalone exports and makes clear that conversation continues in the user's agent, not inside the canvas.

Click a node to select it and open its editor. The default form shows the card kind, thought and save controls; **Details** reveals status, notes, source and relationship fields. The kind selector mirrors the detailed field, preserving other metadata. Existing metadata is retained when editing only the label. The editor starts closed and is a closable overlay at every width. Close × returns to the unobstructed canvas. Context is available through the compact disclosure beneath the strategic question. Save changes explicitly. Pan the blank canvas by dragging; scroll to zoom; use Reset view and Expand all. Reset view keeps a readable minimum scale and centres the active branch when the whole tree would become too small; pan or deliberately zoom out for a wider overview. Details use a closable overlay at all widths rather than permanently consuming canvas width. Narrow previews preserve a readable automatic minimum scale. Each card’s **+** creates an unsaved child draft beneath that card. A separate chevron expands or collapses existing children. Keyboard users can tab to nodes and press Enter/Space to edit, and use the separately labelled Add, Tree type and collapse controls; Left/Right also collapse/expand. The active branch and its ancestor path are highlighted. Reduced-motion preferences disable visual animations.

Select any non-root thought and use **Focus branch** in the existing canvas controls to view that thought and its descendants as a readable subtree. On entry, the view reveals two levels beneath the selected thought; deeper parent nodes stay collapsed until expanded or focused in turn. While focused, a small breadcrumb shows its label and **← Whole tree**; use that return action to restore the wider map and its prior selection, collapsed branches and pan/zoom. Focus branch can deepen again from another selected descendant. Expand all expands only the current focused subtree, preserving other branches' collapse state. Save or discard an active draft before changing focus. Maps with more than 24 thoughts or six leaf thoughts initially show the root and collapsed top-level families; smaller maps initially show every branch. This is progressive disclosure of the complete state. Focus is local browser view state: it does not change the session, node IDs, parent links, sources or siblings, and a reload starts with the whole tree. If the focused node is removed, or the selected thought moves outside it during a canonical update, the view returns to the whole tree. Editing and adding deeper thoughts still update the same canonical map.

Every HTML/SVG/JSON/Markdown export retains the entire canonical tree while focused or collapsed. Standalone HTML starts in the whole-tree view. Print also clears focus and expands the whole tree before opening the browser print dialog.

The compact **Problem** control opens the optional situation, desired change and constraints brief. A card’s **Tree type** opens a nonmodal menu anchored beside it. Choosing one of nine methods saves immediately and closes the menu; there is no separate apply step. Escape, clicking outside or moving keyboard focus outside dismisses without saving. Explicitly typed cards keep their chip visible; inherited cards expose it on selection. Arrow keys move between choices without saving; Enter or Space chooses. **Example & help** keeps the full explanation, source, limits and mixed-method guidance optional; scope and inheritance remain available there. The type chip on each explicitly typed card marks a subtree starting point. Types belong to branches, not global depth levels. If another editor changes the selected method or its ancestor chain while the picker is open, applying is blocked until **Review latest setting**; unrelated note edits remain usable and are preserved. The contextual **Add** control names a useful next contribution for that approach and opens a draft under the selected node; only saving adds it to the canonical tree. Its suggested kind and relation remain editable. Delete branch removes the selected node and its descendants; the root cannot be deleted. Undo reverses the most recent locally saved action and is disabled after any intervening external revision. This is one-level undo, not a full history. View selection, pan/zoom and collapsed branches are local to the browser and do not change canonical JSON.

When another editor updates the session, the canvas polls and redraws while preserving selection and view. An unsaved local draft is retained; changing its underlying node or child-draft parent shows a conflict notice and blocks saving stale fields. Copy any wanted draft text, discard and reopen against the latest node before reconciling. Unrelated edits remain mergeable. Switching branches requires saving or discarding an active draft, so entered work is not silently lost. This save protection concerns edits only; conversational prompts are always optional.

## Exports

Save a populated visual tree as the primary result. A prose note or JSON link alone does not fulfil a request to save the tree.

### Deterministic file export

The standard-library helper creates durable visual artifacts without browser download handling:

```sh
python3 /absolute/path/strategy-canvas/scripts/export_state.py \
  --session /absolute/path/to/session \
  --output /absolute/path/to/outputs/decision-tree
```

Pass an output stem **without an extension**. The helper takes one locked, validated snapshot of the latest canonical state and writes `decision-tree.html`, `decision-tree.svg` and `decision-tree.json`. An existing output stem is replaced deliberately; use a new stem to preserve an earlier snapshot. Exporting over the session's own `state.json` is rejected. All three files represent the same revision. Files are written through temporary files and individually replaced atomically. The original session is not changed.

The HTML uses the exact reusable canvas template with safely embedded state and offline mode. It starts with the source peek closed and no iframe; optional native posts still require an explicit open and an internet connection. The SVG includes every node with complete visible labels, growing cards/row spacing when long labels need it. Each typed node shows its effective method; each explicitly related child shows its incoming relationship type and full label inside its card to avoid overlapping edge captions. The problem brief and title wrap above the tree. Full notes and sources remain in node titles, and canonical state is retained in SVG metadata. The usual concise-label layout matches the live canvas. JSON preserves all canonical fields, including the problem brief, explicit method/relationship metadata, complete source registry and provenance. SVG node titles include effective method, relationship, provenance and the full metadata of directly referenced sources; canonical SVG metadata also preserves the entire registry. The command prints the revision, node count and exact paths; an invalid state or file error exits with code 2. This helper generates no Markdown or PDF.

To preview these exact three saved files locally, add `--serve --port 0`. Keep the resulting process alive and use the exact printed loopback URL. `/` serves the populated standalone HTML, `/tree.svg` the full tree image, and `/state.json` the saved state; other paths are unavailable. This is a **saved snapshot preview**, not a live canonical session. Re-export explicitly when the original session changes. Standalone HTML edits remain in browser memory until exported again and do not modify the saved file or original session. The saved HTML/SVG/JSON remain usable after any preview server stops. Prefer linking the HTML tree and SVG image first, with JSON for further work and prose only as an optional companion.

### Browser export controls

Optional models, workplan and brief records survive complete JSON/HTML exports and SVG metadata. Markdown includes these analysis records and current results. The SVG picture itself depicts the tree; open the HTML Analysis workspace to use model controls. **Analysis → Brief** also exports a printable HTML brief. In a live session it can download an editable PowerPoint from `GET /api/export/pptx`. The endpoint reads one current validated snapshot and returns a PPTX attachment, or a 400 JSON error if the brief is missing or its revision marker is stale. Offline users can run `scripts/export_brief.py --state exported.json --output new-file.pptx` with an agent. Full source/model references remain in speaker notes, and text/figures are editable. No model is embedded as an executable spreadsheet in PowerPoint; re-export to update figures.

PPTX also rejects oversized exports without silent truncation. See the [slide and speaker-note limits](analysis-schema.md#powerpoint-export-limits) before preparing a large brief.

The Export menu first refreshes canonical state, and refuses to export unsaved drafts. Save or discard them first. All formats include every branch, even when the current view has collapsed branches.

- **Interactive canvas:** standalone `.html` containing the current state, styles and scripts. It works without the server, including local in-memory editing and further export. The label says “Standalone · export to save”: edits do not sync back to the assistant or persist after reload unless exported again.
- **Full tree image:** self-contained `.svg` containing the entire expanded tree, complete labels, question and revision. Long labels expand the exported cards so no label is silently truncated. Full node notes/sources are included as SVG titles for inspection, not printed body copy. Font fallbacks are local.
- **Decision brief:** `.md` with strategic question, context, recommendation or explicit lack of one, unresolved issues, next steps, complete reasoning tree with notes, provenance and source references, the complete structured source registry, and the optional next question.
- **Editable state:** complete `.json`, suitable for further editing and validated CLI/API import into a session.
- **Print / save as PDF:** expands the tree and opens the browser print dialog. This is a browser-assisted PDF route, not an automatic PDF file generator. Print layout is landscape; large trees may need SVG export for legible full-scale output.

No export is published or uploaded. Browser downloads go to the browser's configured download destination; choose or move files into a user-approved deliverable directory when needed.

## Boundaries

The local server is a single-user session helper without accounts or remote sharing. Share the skill bundle or an explicitly reviewed export. No analytics or automatic publishing is included. The canvas runs without a network dependency; deliberately opened native LinkedIn posts use LinkedIn and remain subject to its availability. Every saved HTML starts with the peek closed and no iframe, including an export made while a source was open. The template alone is intentionally empty until launched through the server; exported HTML is the portable populated artifact.

## Question-first entry and keyboard use

`docs/new.html`, the bare `assets/canvas.html` template, and the server's `GET /new.html` render a blank **standalone** starter (`state: null`, `offline: true`). A submitted nonblank question, up to 240 characters, creates one root question with status `open`, no explicit method and no invented children. The heading, title and first root label initially match. **Go straight to canvas** bypasses question entry, using `Your question` as an editable placeholder; if text was already entered, it is preserved. The tree opens with guidance collapsed and the root focused. The **New** link opens this independent canvas in another tab; it never resets the live session. Standalone work needs export; an agent should adopt the supplied exported JSON deliberately, not assume the original session's `/api/state` contains it.

**Edit** beside the heading opens a nonmodal main-question editor. Save updates `state.question`. If the root label matched the old question, it follows the new wording up to its 240-character limit; a custom short root label stays unchanged. No branch, method, conclusion or source is rewritten. A concurrent change to the same question (or to a root label being synchronised) blocks saving and retains the draft. Unrelated agent edits merge from the latest state.

Letter shortcuts apply only when an SVG card itself has focus: **A** adds a child; **Shift+A** adds a sibling; **Enter/E** edits; **T** opens its type menu. Left collapses expanded children, otherwise moves to the parent; Right expands collapsed children, otherwise moves to the first child. Up/Down move between siblings. Tab remains native focus navigation. **Cmd/Ctrl+Enter** submits a changed card or question editor; Escape closes an unchanged editor and returns focus, while a dirty draft remains available until saved or explicitly discarded. Menu buttons keep their own keyboard behaviour.

The type menu may mark one **Suggested** method for an untyped card within Explore: hypotheses/assumptions suggest Hypothesis, metrics Driver, objectives Objectives, claims Argument and solutions Solution. Clear why-questions suggest Issue; clear improvement questions suggest Solution. Generic questions, choices and evidence do not imply a formal framework. Any explicit local method or inherited non-Explore method takes precedence. Suggestions never select or save a method, create content, change evidence status or imply semantic validation. Child defaults follow the existing branch method first, then the parent card kind within Explore. Every default remains editable.
