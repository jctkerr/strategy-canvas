# Strategy Canvas

Explore a decision with an AI agent and an editable visual tree.

Keep the options, assumptions and evidence in view while you talk. Open a promising branch, challenge it, and return to the wider picture when you need to. Save the whole tree when you want to pause or share it.

**[James Kerr](https://jameskerr.me)** · Free and open source · MIT licence

**[Try the interactive demo](https://jctkerr.github.io/strategy-canvas/)** · [Download the latest release](https://github.com/jctkerr/strategy-canvas/releases/latest)

![A fictional sales decision shown in Strategy Canvas](docs/images/canvas-preview.png)

## What you get

- A skill that guides an agent through exploration, deeper investigation and comparison.
- An editable canvas with branch focus, collapse, notes and source links.
- A local session that preserves edits from both you and the agent.
- Exports to interactive HTML, SVG and JSON. The browser also exports Markdown and offers print to PDF.

The skill helps make reasoning visible. It keeps assumptions separate from evidence and leaves the recommendation open until you are ready to compare. A complete tree does not establish that its claims are true or that every possible option has been found.

## Try the canvas

Requires **Python 3.9 or later on macOS, Linux or Windows through WSL**. It uses the Python standard library; there are no packages to install or build steps.

```sh
git clone https://github.com/jctkerr/strategy-canvas.git
cd strategy-canvas
python3 scripts/serve.py --session ../strategy-canvas-session --port 0
```

Open the `http://127.0.0.1:…` address printed in your terminal. Keep that terminal running. A new session opens the fictional sales example; an existing session resumes where you left it.

Select a thought, open **Details** to edit it, then save. Use **Focus branch** to work on one part of the tree and **Whole tree** to return. You can edit thoughts without an agent. Changing the overall question, context or decision uses the agent or the documented API.

## Use it with an agent

Give a local agent the path to [SKILL.md](SKILL.md) and a question you want to explore. The agent needs permission to read and write local files and run Python. Browser preview support is helpful; the printed URL also opens in an ordinary browser.

For example, from the cloned folder:

```text
Use the strategy-canvas skill in this folder. Help me explore where to
focus extra sales effort over the next three months. Start with what
you know, label the gaps, and keep the options open while we discuss them.
```

For Codex, you can install the skill for future tasks:

```sh
mkdir -p ~/.codex/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.codex/skills/strategy-canvas
```

Then invoke `$strategy-canvas` in a new task. If that directory already exists, use your existing copy or choose another location; the clone command will not overwrite it.

The canvas itself does not call an AI model. Your agent's normal access, capabilities and costs still apply.

## The examples

The [fictional sales decision](examples/demo.json) asks where extra sales effort should go over 90 days: existing clients, new clients, both, or neither. Each option includes an assumption to investigate. There is deliberately no winning option without evidence about demand and capacity.

These four branches belong to that specific allocation question. The skill chooses a structure for your question instead of imposing the same four branches on every decision. Its [method](references/method.md) explains how it handles scope, overlapping ideas and evidence gaps.

The online demo is a standalone copy. Changes stay in that browser tab; export them before closing or reloading it.

There is also a [fictional career example](https://jctkerr.github.io/strategy-canvas/career.html), with its [editable state](examples/career.json). It compares two job offers and staying in the current job, keeping questions about time, pay, team, growth and terms visible. Start with the three choices, then expand or focus a branch. The example leaves the decision open.

## Save and share

Use the canvas's **Export** menu, or export a saved session from the terminal:

```sh
python3 scripts/export_state.py \
  --session ../strategy-canvas-session \
  --output ../strategy-canvas-exports/my-decision
```

This writes HTML, SVG and JSON from the same saved revision. Every export includes the whole tree, even when branches are collapsed or focused. The HTML opens without a server; edits in that standalone copy last until reload unless you export it again.

Keep session folders and personal exports outside this repository. The supplied example is fictional. Every export includes notes and sources; SVG also embeds the complete state in its metadata. Review the whole export before sharing it.

## Local storage and boundaries

The server listens on your own machine at `127.0.0.1`. It has no accounts, analytics or automatic publishing. Optional LinkedIn previews contact LinkedIn only when you deliberately open them. Your AI agent may process material through its own provider; local canvas storage does not change that.

Live edits are saved with revision checks to prevent an older edit replacing a newer one silently. This is a single-user tool with one-level undo, not a hosted collaboration service or a full revision history.

See the [state and runtime reference](references/schema.md) for the API, file format and export behaviour. Direct Windows execution is unsupported because file locking uses `fcntl`; use WSL.

## Development

```sh
python3 -m unittest discover -s tests -v
```

The interface is in `assets/canvas.html`. Runtime and export helpers are in `scripts/`. Keep changes small and include a reproducible example when reporting a bug. Please use fictional or sanitised data in issues and contributions.

After changing the interface or example, regenerate the public demo with `python3 scripts/build_demo.py`. Check it with `python3 scripts/build_demo.py --check`.

## Licence

[MIT](LICENSE), copyright 2026 James Kerr. You can use, adapt and redistribute the skill, including commercially, under the licence terms.
