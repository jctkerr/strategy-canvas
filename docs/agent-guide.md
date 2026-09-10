# Use Strategy Canvas with your agent

Start with the [copy-and-paste prompt in the README](../README.md#use-it-for-your-decision). Your agent can handle setup. Use the instructions below if you prefer a reusable installation or need to troubleshoot.

Keep the complete folder: `SKILL.md` alone cannot run the canvas.

You need an existing agent account, Python 3.9+ on macOS, Linux or WSL, and permission for that agent to read the skill and save a separate session. The Python runtime has no additional packages to install. Agent subscriptions and model access are separate.

Installation instructions below follow the linked vendor documentation. Our [test record](compatibility.md) states which workflows we actually exercised.

## Keep the canvas beside the conversation

Ask your agent: **“Show Strategy Canvas in this app's built-in preview, keep it open, and update the same canvas as we talk.”** The skill should handle this through the app's available tools. You should see your question and an editable tree before it says the preview is ready.

The agent should also help sharpen the question as you go. It should use your answers to revise the main question, relevant branches and next steps, preserving your edits. You can say **“That is not quite the problem”**, **“This constraint has changed”** or **“Let's explore this branch”**; there is no fixed sequence of questions to complete.

| Where you are working | In-app route |
| --- | --- |
| Codex desktop | Built-in **Browser**; the agent should open and reveal the local session there. |
| Claude desktop, Code | Embedded **Preview** in a local Code session. |
| Claude desktop, Cowork | **Built-in browser** when available and able to reach the server; otherwise a native HTML artifact preview. |
| Claude Chat | Native HTML artifact/file preview when execution is available; this is a snapshot unless a live server is separately connected. |
| Cursor desktop | Native **Browser** in the IDE Agent panel or Agents Window; request the inline pane. |

The app, execution location and available tools matter. A terminal/CLI test does not prove that a desktop pane opened, and a cloud machine's local URL does not open on your laptop. Agents should follow the [host preview instructions](../references/host-preview.md), which include the official sources and rendered checks. An external browser is not the default fallback.

On **10 September 2026**, the fictional 15-node bookshop rendered in Codex's existing in-app tab and Cursor's native Browser pane; Cursor's Analysis dialog also rendered without changing saved strategy content. Claude routes remain documentation-checked only. See the [test record](compatibility.md) for the evidence boundary.

## Run the canvas yourself

If you want to open it before connecting an agent:

```sh
git clone https://github.com/jctkerr/strategy-canvas.git
cd strategy-canvas
python3 scripts/serve.py --session ../strategy-canvas-session --port 0
```

Keep the terminal running and give the exact printed URL to your desktop agent to open in its built-in preview. You can also paste it into that pane yourself. A new session starts with the fictional sales example. To run the development checks, use `python3 -m unittest discover -s tests -v` and `python3 scripts/build_demo.py --check` from the repository folder.

## Codex

In a terminal on the machine where Codex runs:

```sh
mkdir -p ~/.agents/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.agents/skills/strategy-canvas
```

Start a new task. In Codex CLI or the IDE extension, type `$strategy-canvas` or select it through `/skills`. In the ChatGPT desktop skill selector, use `@` and choose the skill. You can always give the agent the absolute path to `SKILL.md` explicitly. Restart if a newly installed skill does not appear.

An existing installation under `~/.codex/skills` may already be available through your installer. Use that copy if it appears; avoid installing two copies with the same name. [Official skill locations and invocation](https://learn.chatgpt.com/docs/build-skills).

In the desktop app, ask for **Browser** beside the conversation. If the pane is hidden, use the toolbar or **Cmd/Ctrl+Shift+B**. The built-in browser is not supplied by Codex CLI or the IDE extension. [Official browser guide](https://learn.chatgpt.com/docs/browser).

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

## Claude desktop Code and Claude Code CLI

```sh
mkdir -p ~/.claude/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.claude/skills/strategy-canvas
```

Start Claude Code in a working folder and enter `/strategy-canvas`, followed by your question. Allow the requested file and Python operations for this session. If the skills directory is newly created, restart Claude Code if needed. You can instead install into `.claude/skills/strategy-canvas` inside one project. [Official Claude Code skill documentation](https://code.claude.com/docs/en/skills).

For an in-app canvas, use Claude desktop's **Code** tab with a **local** session and ask for its embedded preview. The agent can attach preview to the running canvas; it should preserve the exact numeric URL. A standalone HTML file can also open in the preview pane. The terminal-only CLI does not itself reveal this pane. [Desktop preview](https://code.claude.com/docs/en/desktop#preview-your-app), [agent setup details](../references/host-preview.md#claude-desktop-code).

## Claude desktop Cowork and Chat

Use the complete skill ZIP through Claude's skill upload flow with code execution enabled; this is separate from the local `~/.claude/skills` installation. This upload route has not been tested with Strategy Canvas. [Official upload instructions](https://support.claude.com/en/articles/12512180-use-skills-in-claude).

In Cowork, ask for the **built-in browser**. If available, choose it under **Settings → Cowork → Preferred browser**. A cloud-run canvas needs a reachable host preview or a native HTML artifact: its local address will not reach the desktop browser. [Cowork browser](https://support.claude.com/en/articles/16607400-use-the-built-in-browser-in-claude-cowork).

In Chat, ask for the exported canvas in the native HTML artifact/file preview, with the complete JSON attached. This is a snapshot; changes in it do not automatically update another live session. [HTML artifacts and file creation](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude).

## Cursor

```sh
mkdir -p ~/.cursor/skills
git clone https://github.com/jctkerr/strategy-canvas.git ~/.cursor/skills/strategy-canvas
```

Open a working folder in Cursor. In Agent chat, type `/`, select `strategy-canvas`, and add your question. Ask it to run the bundled server and open the canvas in Cursor's built-in **Browser**, using the inline pane. A project-only installation can live at `.cursor/skills/strategy-canvas`. [Browser tools](https://cursor.com/docs/agent/tools/browser).

If the pane does not appear, use **Command Palette → Open Browser Tab**, enter the exact printed `http://127.0.0.1:…` URL, and press **Return**. This desktop fallback was verified with the bookshop canvas and Analysis dialog. The agent should inspect the rendered pane before saying it is open.

Installing on your computer does not automatically make the folder available to a Cursor Cloud Agent. Give a cloud agent the repository link and use its supported remote preview or native artifact/file delivery. A `cursor-agent` CLI test establishes only the tested command-line workflow, not the desktop's embedded browser. [Official Cursor skill documentation](https://cursor.com/docs/skills).

## Gemini CLI

With Gemini CLI installed and signed in:

```sh
gemini skills install https://github.com/jctkerr/strategy-canvas
```

The default scope is your user account. Add `--scope workspace` for the current project only. In Gemini CLI, run `/skills list` and, if needed, `/skills reload`. Then ask, “Use the strategy-canvas skill to explore…” and accept the skill activation prompt. Do not expect a `/strategy-canvas` command; Gemini uses its own skill activation tool. [Installation and management](https://geminicli.com/docs/cli/using-agent-skills/), [activation](https://geminicli.com/docs/cli/tutorials/skills-getting-started/).

## Other chat or cloud agents

A model name alone does not establish compatibility. Ask whether the particular app can read the full folder, execute Python, preserve files, and show or deliver HTML. A repository attachment or pasted `SKILL.md` supplies context; it does not grant those tools.

If the host cannot keep a reachable server running, ask it to render the standalone HTML in its native artifact preview and attach the JSON. If it cannot render the export, it should deliver the files and say what remains unavailable. A file attachment alone does not establish an interactive in-app canvas.

For an ordinary web chat without file execution, use the method conversationally or move to a compatible agent environment. This also applies to a Grok web session without the required computer tools; the Grok Bot and Grok Build instructions above do not establish web-chat support.

## Your first session

The top-right **?** gives a one-line guide to the nine tree types. **Work through it with your agent** explains how to continue in conversation, including the JSON handoff for standalone canvases. Reading the guide never changes the tree.

The canvas starts with guidance collapsed. **Quick start** and **How to use** are available when needed. Keep discussing the problem with your agent; it can choose a suitable structure and update the same tree. You do not need to learn or select a framework first.

1. Type a question into [a blank canvas](https://jctkerr.github.io/strategy-canvas/new.html), or give your agent a question, relevant constraints and what remains unknown.
2. Check that the canvas contains your situation, rather than the fictional sales demo.
3. Ask it to explore one branch. Keep alternatives visible and ask what would change the choice.
4. Use **Edit** beside the heading to refine the main question. Click a thought to edit it, or hover/click its **+** to choose a suitable child. The menu opens beside that card; choose an item to begin an unsaved draft. Type the thought in the compact editor and save to return to the tree. Its suggested kind and status stay in **Details**; **Notes & sources** expands when needed. A separate chevron expands or collapses children. Nothing is added until you save. Ask the agent to continue from your edits; it should read the latest saved revision first.
5. Ask it to export the complete tree as HTML, SVG and JSON. Open the HTML before sharing it.

Focus a card to use **A** for a child, **Shift+A** for a sibling, **Enter/E** to edit or **T** for tree types. **Cmd/Ctrl+Enter** saves the current edit. Arrow keys navigate or expand/collapse; **Keyboard shortcuts** explains the controls. Letter shortcuts never run while typing in a field.

The **New** link opens a separate standalone canvas and keeps the original tab. Export its HTML before closing. To continue that new tree with an agent, attach its JSON; it is not the original live session.

**Live session:** edits are saved on the machine running the server. **Standalone HTML:** edits last until reload unless you export them again. **GitHub demo:** a fictional standalone example, not an AI conversation.

## Choose an approach when useful

Start by telling your agent what is happening and what you want to change. **Problem** keeps that brief and your constraints together. These fields are optional; you can start with an unfinished question.

The card’s **Tree type** opens nine short choices beside it, leaving the canvas available. Choose once to save it to that branch; **Undo** reverses the change. Click away or press Escape to dismiss without changing anything. Cards with their own type keep that control visible; other cards show it when selected. **Example & help** contains the selected type’s example, source and limitation. The menu marks a suitable method as **Suggested** when the card kind or a clear question provides a clue. It never applies that method automatically. Your agent can also suggest a suitable method without requiring you to know its name. An approach change guides future additions and leaves existing thoughts in place; it does not reorganise or validate them.

Different branches may use different approaches, including branches at the same depth. Choose at the point where the question changes; an entire visual layer does not need one type. For example, an issue tree about workshop viability can contain a calculation branch for break-even attendance. Select the root to set the broad approach, or a thought to change just that branch. Children follow their nearest parent approach unless they have their own; deeper overrides stay in place. Ask the agent to check the existing thoughts and connections when changing methods. **Connection to parent** inside **Details** explains how a thought relates to its parent. Expand its controls to change that relationship. A connection label records your reasoning; it does not prove the relationship or run a calculation.

Agents should read the relevant recipe in [the tree-method guide](../references/tree-methods.md) before using a method. Each recipe covers its scope, steps, worked example and checks. Keep the person's problem in view instead of requiring them to learn the method names first.

## If something does not work

| What you see | What to do |
| --- | --- |
| Skill is missing | Check the folder contains `SKILL.md` directly, refresh the agent's skills list or give it the absolute path. |
| Destination already exists when cloning | Use the existing copy; do not delete it just to retry. To update a clean Git clone, run `git pull --ff-only` inside it. Preserve any local changes first. |
| Python or `fcntl` error | Install Python 3.9+ from its official source; on Windows use WSL. |
| The agent says “opened”, but no canvas appears | Ask it to reveal and inspect the built-in preview. A queued request, attachment or separate browser screenshot is not proof. |
| Cursor has a running server but no visible canvas | Use Command Palette → **Open Browser Tab**, enter the exact numeric session URL, and press Return. |
| Local URL will not open | Keep the server running; use the exact printed numeric URL in the app's preview on the same computer. For cloud execution use a verified host preview or a native HTML artifact. |
| Claude Code preview fails despite a running server | Ask the agent to attach a URL-only preview entry to the exact printed `127.0.0.1` URL; preserve existing launch configurations. |
| Remote Bot returns an inaccessible local URL | Open its computer view or ask it to attach the standalone HTML export. |
| Agent returns only prose | Ask it to run the bundled runtime and show a populated canvas; if it lacks execution, use another environment. |
| Your direct edit disappeared | Confirm you edited the live session, not a standalone copy. Ask the agent to read the current state and reconcile before saving. |
| Port is in use | Start with `--port 0` to select an available port. |
