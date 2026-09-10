# Analysis records and calculations

`analysis` is an optional top-level object in a `schemaVersion: 1` state. It accepts only the optional fields `models`, `workplan` and `brief`. `{}` is valid. Existing states without analysis stay valid and are not changed. The existing 2 MB UTF-8 whole-state limit still applies. Unknown fields are rejected at every structured level below.

Analysis augments the reasoning tree. A calculation does not establish demand, a completed task does not support a hypothesis automatically, and a saved brief is not a semantic review receipt. Keep supplied facts, illustrative assumptions, missing inputs and findings distinguishable in the recorded basis and limitations.

## Numbers

`models` is an array of at most 20 objects. Each model requires:

- `id`: a unique identifier within `models`.
- `title`: non-blank text of at most 240 characters.
- `variables`: an array of 1–100 variables.
- `outputId`: the ID of an existing variable in this model, identifying its primary result.

Optional model fields are `nodeId` (an existing tree node ID) and `description` (text of at most 10,000 characters). Omit an unknown node reference rather than using null.

Model, variable, workplan and brief-section IDs use `[A-Za-z_][A-Za-z0-9_]{0,63}`: 1–64 ASCII characters, beginning with a letter or underscore. Variable IDs are unique within their model. `ceil`, `floor` and Python keywords (including `True`, `False` and `None`) are reserved variable names. These stricter analytical IDs do not change the existing tree/source ID syntax.

Each variable requires `id`, `label` (non-blank text, at most 240 characters), `unit` (text, at most 80 characters), and `basis` (text, at most 10,000 characters). Explain where an input or formula comes from; a blank basis is allowed as a draft. Optional `sourceIds` contains at most 20 distinct existing IDs from the state's source registry. A source reference does not prove the number is correct.

A variable must have exactly one of:

```json
{"values": {"low": 15, "base": 20, "high": 25}}
```

```json
{"formula": "(price - variable_cost) * attendees - fixed_cost"}
```

All three `values` keys are required and no others are accepted. Each value is a finite JSON number or null. Null means unknown, never zero. Booleans and non-finite inputs are rejected. Numbers are interpreted as finite IEEE 754 doubles; no currency, decimal-place or unit conversion is automatic. Low/base/high are scenario names, not probabilities, confidence intervals or guaranteed best/worst results. There is no enforced ordering across them.

`formula` is text of at most 2,000 characters. It may use decimal numbers, scientific notation, same-model variable IDs, `+`, `-`, `*`, `/`, parentheses, unary `+`/`-`, and `ceil(expression)` or `floor(expression)` with exactly one positional argument and no comma. For example:

```text
contribution = price - variable_cost
net = contribution * attendees - fixed_cost
minimum_attendance = ceil(fixed_cost / contribution)
```

The left-hand IDs above identify separate variables; each stored formula contains only the expression to the right of `=`. Formulas have no assignment, powers, modulo, comparison, strings, attributes, subscripts, arrays, comments, imports or arbitrary function calls. Numeric separators, hexadecimal and other non-decimal literal syntax are unsupported. Whitespace is allowed. Formulas do not refer to another model's variables.

The interpreter never calls `eval`. Each formula is limited to 200 expression nodes and a depth of 30, counting constants, variable names, binary operators, unary operators and function calls (parentheses and operator tokens do not add separate nodes). Dependencies are resolved before evaluating an expression, with at most 100 variables in a model. Variable array order does not determine calculation order. Repeated references use the same variable value within a scenario.

Incomplete or invalid formulas remain saveable drafts within the text length limit. Invalid syntax, unsupported operations, exceeded calculation complexity, missing variable names, cycles, null inputs, division by zero and non-finite results produce visible calculation errors. The schema does reject missing `outputId` targets and invalid metadata references. An error in one scenario does not suppress valid results in the other scenarios or independent variables. Errors propagate to dependent results; no fallback value is invented.

### Evaluator interface

After validating the canonical state, Python callers can use:

```python
from analysis import evaluate_model
result = evaluate_model(model)
```

The function does not mutate its model. It returns:

```json
{
  "modelId": "workshop",
  "outputId": "net",
  "scenarios": ["low", "base", "high"],
  "values": {"net": {"low": -20.0, "base": 30.0, "high": 80.0}},
  "errors": {"net": {"low": null, "base": null, "high": null}}
}
```

`values` and `errors` contain **every variable**, not only the abbreviated `net` example above. Each cell has either a finite numeric value and null error, or null value and a nonempty human-readable error string. Strings such as `Missing input: attendees (base).`, `Unknown variable: price.`, `Division by zero.` or `Circular reference involving: net.` describe calculation failures. Treat their wording as explanatory text, not stable machine error codes. Rendering should show the error rather than formatting null as zero. The interpreter expects a schema-valid model; malformed record structures are validation failures, not calculation results.

## Workplan

`workplan` is an array of at most 100 items. Every item requires all these fields:

| Field | Contract |
| --- | --- |
| `id` | Unique analytical identifier within the workplan. |
| `nodeId` | Existing tree node ID whose question this work addresses. |
| `title` | Non-blank text, at most 240 characters. |
| `analysis` | What reasoning or analysis is needed; text, at most 10,000 characters. |
| `evidenceNeeded` | The evidence that would answer the question; text, at most 10,000 characters. |
| `source` | Planned or inspected source/basis, as plain text of at most 10,000 characters. This is not a structured source ID field. |
| `priorityReason` | Why this work could change the decision; text, at most 10,000 characters. |
| `owner` | Text, at most 200 characters; empty is allowed. |
| `dueDate` | Empty string or a valid `YYYY-MM-DD` date. |
| `status` | Exactly `open`, `in-progress` or `done`. |
| `finding` | What was found; text, at most 10,000 characters. Empty is valid in a draft. |
| `limitations` | What remains unresolved or bounded; text, at most 10,000 characters. |

Changing a workplan status never changes a tree node's status. `done` means the recorded work is completed; it is not a claim that the hypothesis passed, evidence is sufficient, or the proposed action is approved. Findings and their limits remain separate. No owner or deadline is manufactured automatically.

## Brief

`brief` requires `situation`, `complication`, `answer`, `sections` and `basedOnRevision`. The first three are text of at most 20,000 characters each; empty strings are valid drafts. `sections` is an array of at most 50 records, each requiring:

- `id`: a unique analytical identifier within the brief.
- `claim`: text of at most 1,000 characters; empty is allowed.
- `body`: text of at most 20,000 characters; empty is allowed.
- `nodeIds`: at most 50 distinct existing tree node IDs.
- `sourceIds`: at most 20 distinct existing structured source IDs.
- `modelRefs`: at most 50 distinct `{modelId, variableId, scenario}` records. The model and variable must exist, and scenario must be `low`, `base` or `high`. No other fields are accepted. Uniqueness is by all three fields within the section.

Empty reference arrays are valid. References provide traceability, not proof that a claim follows from the referenced material. A variable with a calculation error is a valid reference: show that error and preserve the resulting limitation rather than inventing a result.

`basedOnRevision` is a positive integer. When explicitly writing, editing or rechecking the brief, read the latest canonical state and set this to the revision read. The accepted save increments the state's revision by one. Once `state.revision > brief.basedOnRevision + 1`, the brief is conservatively stale and needs rechecking. It may still be viewed, edited and retained in JSON/HTML exports as stale or draft; PowerPoint export rejects a stale brief. This tracks revision freshness, not semantic validity; a fresh draft can still contain untested reasoning.

Never advance `basedOnRevision` automatically when editing models, workplan items or tree content. Those edits preserve the brief's previous stamp. A future stamp is rejected: validation requires it not to exceed the state's revision, and updating requires it not to exceed the actual stored revision read before that save. Setting a large caller-supplied `revision` cannot bypass this rule.

```python
from analysis import brief_is_stale
needs_recheck = brief_is_stale(state)
```

The helper returns false when no brief exists. It checks only the revision relationship above. Structural validation does not certify the narrative or automatically rewrite unsupported claims.

## References, deletion and exports

Tree node and source references must remain valid in the same canonical update. Removing a referenced node, source, model or variable requires updating its analytical references deliberately; an unrelated edit must preserve them. Failed validation leaves the saved state unchanged.

Canonical JSON and HTML boot data retain these optional records exactly. Calculated results are derived from their model, not separately stored truth. A presentation or report must distinguish input assumptions, computed scenario results, missing evidence and brief freshness. The fictional [workshop-analysis.json](../examples/workshop-analysis.json) illustrates this contract; its invented values are not evidence about a real bookshop or paying audience.

### PowerPoint export limits

The PPTX exporter allows at most **200 generated slides**, **256 KB (256,000 UTF-8 bytes) of speaker notes per generated section**, and **2 MB (2,000,000 UTF-8 bytes) of notes across the deck**. Section notes include authored wording and linked supporting material; the total also includes continuation-slide notes. These export limits are separate from the 2 MB canonical-state limit: a valid state can still exceed the presentation limits.

Oversize export fails with an explicit error; it never silently truncates content to fit. Shorten or split the brief and its references, or use the complete JSON/HTML export. Within the limits, long wording continues onto additional slides, supporting references remain in speaker notes, and the exact state snapshot is embedded in the PPTX as `strategy-canvas.json`. A missing or stale brief also fails export rather than manufacturing a current recommendation.
