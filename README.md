# Strategy Canvas

**See your options clearly. Work through a decision with your AI agent.**

Explore a choice in conversation while a visual tree keeps your options, assumptions and evidence in view. Open a promising branch, challenge it, and return to the wider picture when you need to.

**[Try the interactive demo](https://jctkerr.github.io/strategy-canvas/)**

![A fictional sales decision shown in Strategy Canvas](docs/images/canvas-preview.png)

The demo is a fictional sales decision you can explore and edit. There is also a [fictional career example](https://jctkerr.github.io/strategy-canvas/career.html). Neither contains an AI conversation; export your changes before closing or reloading the tab.

**[James Kerr](https://jameskerr.me)** · Free and open source · [MIT licence](LICENSE)

## Use it for your decision

The **skill** gives your agent instructions for thinking through a decision with you. The **canvas** lets you see and edit the resulting tree.

Copy this into your agent and replace the final question with your own:

```text
Use Strategy Canvas to help me think this through:
https://github.com/jctkerr/strategy-canvas

Set up the skill, follow its instructions and show me the editable
canvas. Keep assumptions visible and leave the choice open.

My question: Where should I focus extra sales effort over the next
three months?
```

Use an agent with file access and code execution, such as Codex or Grok Bot. Your agent handles the setup; its usual access and costs apply.

For installation, agent-specific commands or troubleshooting, see the **[agent guide](docs/agent-guide.md)**. Our **[compatibility record](docs/compatibility.md)** separates tested workflows from documented but untested setups.

## Think it through together

1. **Start with your question.** Give your agent the situation, constraints and what you do not yet know. Check that the canvas reflects your case.
2. **Explore and challenge.** Ask about one branch, or select a thought and use **Details → Save** to edit it yourself. The agent should build on your latest edits.
3. **Keep what you learn.** Ask for a complete HTML export, or use **Export** in the canvas. You can pause with open alternatives or compare them when ready.

The tree makes reasoning visible. It does not establish that every option has been found or that its claims are true.

## Where your work lives

A live session saves on the computer running it: yours for a local agent, or the host's for a cloud agent. Use the preview your agent provides.

Downloaded HTML works on its own. Export before closing or reloading to keep your edits. To continue from those edits with your agent, export the JSON and attach it. Exports include the whole tree, notes and sources; review them before sharing.

The canvas has no accounts, analytics or automatic publishing. Your agent may process material through its own provider.

For the file format, API and export details, see the [runtime reference](references/schema.md).
