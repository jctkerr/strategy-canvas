# Show the canvas inside the agent app

Agent instructions. Routes checked **10 September 2026**; the observations below distinguish rendered checks from documentation research. See the full [compatibility record](../docs/compatibility.md). Discover the tools supplied by the current host before using them. A model name, installed skill, CLI run or successful server request does not establish an embedded preview.

| Host | Observed verification on 10 September 2026 |
| --- | --- |
| Codex desktop | The existing in-app tab rendered the 15-node fictional bookshop canvas. The opener's placement request returned queued; that result alone did not prove visibility. |
| Cursor desktop | Command Palette → **Open Browser Tab**, then the exact numeric URL and Return, opened the native Browser pane. The 15-node bookshop and **Analysis** dialog rendered; this check made no strategy-state mutation. |
| Claude Code, Cowork and Chat | Official documentation checked; no Strategy Canvas execution or rendered desktop check performed. |

## Decision tree

1. **Identify the surface.** Establish the app, mode and execution location: desktop/local, desktop with a remote worker, or CLI. Inspect the host's browser, preview and artifact capabilities and their actual schemas. Prefer the built-in pane visible to the user. Do not default to `open`, `xdg-open`, an external browser or a separate automated browser.
2. **Prepare one session.** Follow `SKILL.md`, preserve its separate durable session directory and populate the person's question. Reuse a running server for that session. Otherwise start `serve.py --port 0` and retain the exact printed URL, including `127.0.0.1` and the assigned port. Keep the process alive through the host's supported process manager. The browser must be able to reach the machine running it.
3. **Open the shared view.** Use the matching host route below. Navigate or attach the built-in preview to that same URL; select/reveal the pane when supported. Reuse its tab for subsequent updates. Do not start another session merely to obtain another preview.
4. **Check what appeared.** Inspect the visible pane with the host's rendered-page/screenshot tools. Confirm the person's root question and a branch, then click a thought and confirm its editor opens. Compare with the current saved state. HTTP 200, a queued open request, a file attachment or a screenshot from a separate browser is insufficient to say it is open inside the app. If the pane cannot be inspected, report the request as unverified and provide the exact in-app opening step.
5. **If live preview cannot be reached, deliver a native artifact.** Generate the bundled standalone HTML and complete JSON. Use the host's HTML/artifact preview if available and verify it renders and responds. Keep the real canvas and complete embedded state; do not replace them with an illustration. If the host blocks its scripts, attach the files and state the limitation. Keep working on the reasoning without claiming a live view. Do not publish a public URL, tunnel the server or buy access to manufacture a preview.

## Codex desktop

Codex's desktop browser can show local web apps beside the conversation. Use the host's purpose-built opener when present. A runtime that exposes the following schema can be asked to open the exact session URL:

```js
open_in_codex({ target: { type: "browser", url: sessionUrl } })
```

This is a conditional host-tool example, not a shell command or a portable SDK. Read the available tool definition; do not call a name absent from the session. If the opener only queues navigation, inspect the resulting visible tab separately. Alternatively use the host's supported built-in browser controls, explicitly requesting a visible pane. The user can reveal Browser from the toolbar or with **Cmd/Ctrl+Shift+B**. [Official browser guide](https://learn.chatgpt.com/docs/browser).

The built-in browser is a desktop capability; Codex CLI and the IDE extension do not supply it. A CLI may prepare the files and URL, but that does not prove it can reveal the desktop pane. [Official availability](https://learn.chatgpt.com/docs/browser).

## Claude desktop: Code

Use a **local Code session** when the server should run on the user's computer. Ask Claude to preview the canvas in its embedded app preview. Discover its preview tools rather than assuming a `preview_start` function or argument format. HTML files can also open in that pane. [Desktop session guide](https://code.claude.com/docs/en/desktop-quickstart).

If preview needs configuration, merge a named entry into `.claude/launch.json` in the selected working folder, preserving existing entries. Current Claude documentation supports attaching to an already-running server using `url` without a launch command:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "strategy-canvas",
      "port": 8765,
      "url": "http://127.0.0.1:8765"
    }
  ]
}
```

Replace **both** sample ports with the actual printed port, then open that entry through the host's preview controls. This attaches to the existing process. If configuring a launch command instead, keep its `--port`, configured `port` and numeric `url` equal; use `autoPort: false`. The runtime reads `--port`, not Claude's reassigned `PORT` environment variable. [Preview configuration](https://code.claude.com/docs/en/desktop#configure-preview-servers).

Claude Code CLI is a separate surface. Running it from a terminal does not itself open the desktop preview.

## Claude desktop: Cowork

Where available, request Cowork's **built-in browser** in the task side panel. Users can select it in **Settings → Cowork → Preferred browser**. It is distinct from the Chrome extension and is rolling out gradually; detect availability in this session. [Official built-in browser guide](https://support.claude.com/en/articles/16607400-use-the-built-in-browser-in-claude-cowork).

Check execution location carefully: Cowork can execute in the cloud while its built-in browser lives on the desktop. A cloud worker's `127.0.0.1` is not the user's machine. Local file access alone does not prove local process execution or network reachability. Use a verified host preview route, or deliver the standalone artifact; do not expose the loopback server to the internet. [Cowork surfaces and execution](https://support.claude.com/en/articles/15520349-use-claude-cowork-on-web-desktop-and-mobile).

Cowork supports interactive artifacts. New artifacts use its updated account-saved system; do not instruct it to create the retired “live artifacts” format. Use the current native artifact/file preview when it can render this HTML. Its availability on desktop does not guarantee the full canvas's scripts, exports or live saves work there: verify those separately. [Cowork artifacts](https://support.claude.com/en/articles/14729249-use-artifacts-in-claude-cowork).

## Claude desktop or web: Chat

When code execution and file creation are available, provide the standalone canvas through Claude's native HTML artifact/file preview and include the JSON. This is a portable snapshot unless a reachable live server has separately been established. A chat without these capabilities can discuss the strategy but cannot execute the bundled runtime. [File creation and HTML artifacts](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude).

## Cursor desktop

In the IDE Agent panel or Agents Window, use Cursor's native **Browser**, requesting the inline pane. Its tools can navigate, inspect and take screenshots. The official docs name `browser_navigate`, but discover its actual registered name and schema: a similarly named generic Playwright tool may control a different browser. Open the exact local session URL and inspect that same visible tab. [Official Browser documentation](https://cursor.com/docs/agent/tools/browser).

The Agents Window has an integrated browser; **@Browser** attaches its context to a prompt. Neither a Cursor CLI result nor selecting a Claude model in Cursor proves that pane was opened. [Agents Window browser](https://cursor.com/docs/agent/design-mode), [browser context](https://cursor.com/docs/agent/prompting).

If the agent's direct Browser opener is unavailable, the following desktop route was verified with this canvas:

1. Open Cursor's **Command Palette** and choose **Open Browser Tab**.
2. Enter the exact printed numeric session URL and press **Return**.
3. Inspect the native Browser pane for the correct question and tree; click a card to inspect its notes, or **Conclusion** to inspect the current position without changing saved content.

Use available host UI controls for these steps, or give the user these exact steps if the agent cannot operate the desktop. Do not substitute an external browser or describe a CLI-created URL as an opened pane.

For a Cursor Cloud Agent, use its actual remote desktop/preview route or the native artifact fallback. A remote worker's loopback URL cannot be opened directly on the laptop. [Cloud capabilities](https://cursor.com/docs/cloud-agent/capabilities).

## Continue in the same view

Keep the session directory, server URL and preview tab together. Before agent edits, read the latest saved revision and preserve user changes. After saving, inspect the update in the same pane; reload only if needed, after resolving any unsaved draft. Conversation belongs in the agent chat, while the canvas displays the shared work.

For standalone HTML, browser recovery can retain saved edits in that browser when storage is available; a fresh HTML/JSON export is needed for a portable copy. A host saving an artifact version does not prove it saved the canvas's in-memory edits. Ask the user to return exported JSON when continuing from a separately edited copy, then reconcile it with the existing session.
