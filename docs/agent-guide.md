# Use Strategy Canvas with your agent

Start with the [copy-and-paste prompt in the README](../README.md#use-it-for-your-decision). Your agent can handle setup. Use the instructions below if you prefer a reusable installation or need to troubleshoot.

Keep the complete folder: `SKILL.md` alone cannot run the canvas.

You need an existing agent account, Python 3.9+ on macOS, Linux or WSL, and permission for that agent to read the skill and save a separate session. The Python runtime has no additional packages to install. Agent subscriptions and model access are separate.

Installation instructions below follow the linked vendor documentation. Our [test record](compatibility.md) states which workflows we actually exercised.

## Run the canvas yourself

If you want to open it before connecting an agent:

```sh
git clone https://github.com/jctkerr/strategy-canvas.git
cd strategy-canvas
python3 scripts/serve.py --session ../strategy-canvas-session --port 0
```

Open the printed URL on the same computer and keep the terminal running. A new session starts with the fictional sales example. To run the development checks, use `python3 -m unittest discover -s tests -v` and `python3 scripts/build_demo.py --check` from the repository folder.

## Codex

In a terminal on the machine where Codex runs:

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.agents/skills/strategy-canvas
```

Start a new task. In Codex CLI or the IDE extension, type `$strategy-canvas` or select it through `/skills`. In the ChatGPT desktop skill selector, use `@` and choose the skill. You can always give the agent the absolute path to `SKILL.md` explicitly. Restart if a newly installed skill does not appear.

An existing installation under `~/.codex/skills` may already be available through your installer. Use that copy if it appears; avoid installing two copies with the same name. [Official skill locations and invocation](https://learn.chatgpt.com/docs/build-skills).

## Grok Bot

Open a Bot conversation and paste this, replacing the final sentence with your question:

```text
Download the complete Strategy Canvas skill from
https://github.com/jctkerr/strategy-canvas into /workspace/strategy-canvas
on your computer. Read README.md, SKILL.md and its required references.
Use the bundled runtime, keep my session in a separate /workspace folder,
and show the populated canvas in your computer view. Also return
a downloadable standalone HTML export and the editable JSON.

Help me explore where to focus extra sales effort over the next
three months. Keep assumptions visible and leave the choice open.
```

Open **Grok Bot's Computer** to view the live canvas on the Bot's machine. Its local address belongs to that computer; pasting it into a browser on your own machine will not connect to it. Keep the skill and session under `/workspace`, which Grok documents as durable storage. Open or download the returned HTML file for a portable copy. Edits to that copy do not automatically sync back to the Bot's live session. [Computer and storage guidance](https://docs.x.ai/grok-bot/computer-and-apps).

Keep discussing the same session with the Bot. If you edit the standalone copy, export its JSON and attach it when asking the Bot to continue from those edits. Tell it to reconcile with the existing session rather than overwrite newer work.

After a successful first run, you can ask the Bot to make the complete folder available as a reusable skill. Grok Bot's saved skills appear in the `/` menu when enabled for that Bot. This repository is a downloadable folder; it is not a listing in Grok's marketplace. [Skills](https://docs.x.ai/grok-bot/skills-routines-and-automations), [files and computer workspace](https://docs.x.ai/grok-bot/files-and-results).

## Grok Build / CLI

For the local Grok coding agent, use its own skill directory:

```sh
mkdir -p ~/.grok/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.grok/skills/strategy-canvas
```

Open Grok in your working folder, select the skill with `/strategy-canvas`, then describe your decision. `/skills` lists available skills. The agent must be able to run Python and keep the local server alive. This is a separate setup from Grok Bot. [Official Grok Build skill documentation](https://docs.x.ai/build/features/skills-plugins-marketplaces).

## Claude Code

```sh
mkdir -p ~/.claude/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.claude/skills/strategy-canvas
```

Start Claude Code in a working folder and enter `/strategy-canvas`, followed by your question. Allow the requested file and Python operations for this session. If the skills directory is newly created, restart Claude Code if needed. You can instead install into `.claude/skills/strategy-canvas` inside one project. [Official Claude Code skill documentation](https://code.claude.com/docs/en/skills).

## Cursor

```sh
mkdir -p ~/.cursor/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.cursor/skills/strategy-canvas
```

Open a working folder in Cursor. In Agent chat, type `/`, select `strategy-canvas`, and add your question. Let the agent run the bundled server and open the URL in your browser. A project-only installation can live at `.cursor/skills/strategy-canvas`.

Installing on your computer does not automatically make the folder available to a Cursor Cloud Agent. Give a cloud agent the repository link and use its supported preview or downloadable export. [Official Cursor skill documentation](https://cursor.com/docs/skills).

## Gemini CLI

With Gemini CLI installed and signed in:

```sh
gemini skills install https://github.com/jctkerr/strategy-canvas
```

The default scope is your user account. Add `--scope workspace` for the current project only. In Gemini CLI, run `/skills list` and, if needed, `/skills reload`. Then ask, “Use the strategy-canvas skill to explore…” and accept the skill activation prompt. Do not expect a `/strategy-canvas` command; Gemini uses its own skill activation tool. [Installation and management](https://geminicli.com/docs/cli/using-agent-skills/), [activation](https://geminicli.com/docs/cli/tutorials/skills-getting-started/).

## Other chat or cloud agents

A model name alone does not establish compatibility. Ask whether the particular app can read the full folder, execute Python, preserve files, and show or deliver HTML. A repository attachment or pasted `SKILL.md` supplies context; it does not grant those tools.

Claude chat supports uploading custom skill ZIPs with code execution enabled: **Customize → Skills → + → Create skill → Upload a skill**. Use the release ZIP containing the `strategy-canvas/` folder. This upload route has not been tested with Strategy Canvas. If the host cannot keep a server running, ask for downloadable HTML and JSON snapshots instead of claiming a live canvas. [Claude's upload instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

For an ordinary web chat without file execution, use the method conversationally or move to a compatible agent environment. This also applies to a Grok web session without the required computer tools; the Grok Bot and Grok Build instructions above do not establish web-chat support.

## Your first session

The canvas has a short introduction you can skip, and **How to use** is always available. Keep discussing the problem with your agent; it can choose a suitable structure and update the same tree. You do not need to learn or select a framework first.

1. Give the agent a question, your relevant constraints and what remains unknown.
2. Check that the canvas contains your situation, rather than the fictional sales demo.
3. Ask it to explore one branch. Keep alternatives visible and ask what would change the choice.
4. Select a thought and use **Add** to extend it, or **Details → Save** to edit it. Add offers a question, idea, reason or another suitable next component for that branch. Nothing is added until you save. Ask the agent to continue from your edits; it should read the latest saved revision first.
5. Ask it to export the complete tree as HTML, SVG and JSON. Open the HTML before sharing it.

**Live session:** edits are saved on the machine running the server. **Standalone HTML:** edits last until reload unless you export them again. **GitHub demo:** a fictional standalone example, not an AI conversation.

## Choose an approach when useful

Start by telling your agent what is happening and what you want to change. **Problem** keeps that brief and your constraints together. These fields are optional; you can start with an unfinished question.

**Approach** explains the method used for the selected branch, with an illustrative example, source and limitation. It includes open exploration, issue and hypothesis trees, quantitative drivers, solutions, objectives, decisions under uncertainty, opportunity solution trees and argument hierarchies. Your agent can choose a suitable approach; you can change it yourself. An approach change guides future additions and leaves existing thoughts in place.

Different branches may use different approaches. **Connection** in Details explains how a thought relates to its parent. Expand its controls to change that relationship. A connection label records your reasoning; it does not prove the relationship or run a calculation.

Agents should read the relevant recipe in [the tree-method guide](../references/tree-methods.md) before using a method. Each recipe covers its scope, steps, worked example and checks. Keep the person's problem in view instead of requiring them to learn the method names first.

## If something does not work

| What you see | What to do |
| --- | --- |
| Skill is missing | Check the folder contains `SKILL.md` directly, refresh the agent's skills list or give it the absolute path. |
| Destination already exists when cloning | Use the existing copy; do not delete it just to retry. To update a clean Git clone, run `git pull --ff-only` inside it. Preserve any local changes first. |
| Python or `fcntl` error | Install Python 3.9+ from its official source; on Windows use WSL. |
| Local URL will not open | Keep the server process running and open the exact printed URL on the same computer, or use the host's preview. |
| Remote Bot returns an inaccessible local URL | Open its computer view or ask it to attach the standalone HTML export. |
| Agent returns only prose | Ask it to run the bundled runtime and show a populated canvas; if it lacks execution, use another environment. |
| Your direct edit disappeared | Confirm you edited the live session, not a standalone copy. Ask the agent to read the current state and reconcile before saving. |
| Port is in use | Start with `--port 0` to select an available port. |
