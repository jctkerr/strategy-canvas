# Compatibility and test record

**Checked 10 September 2026.** Strategy Canvas needs an agent environment that can read the full skill folder, run Python and save files. The [setup guide](agent-guide.md) gives instructions for each host. A supported skill format alone does not prove the complete workflow works.

| Environment | Evidence |
| --- | --- |
| Codex desktop, local macOS | Local runtime, populated canvas, direct browser edits, agent updates and standalone exports exercised during release preparation. |
| Grok Bot desktop | Public v0.1.1 loaded in a fresh Bot. Canvas creation, browser editing through an exported copy, JSON handoff, follow-up updates and final exports exercised. Two reviewer corrections were needed to fix the option hierarchy. Details below. |
| Grok Build / CLI | Installation and invocation checked against official documentation; execution not tested. |
| Claude Code | Installation instructions checked. An execution test stopped before a model call because the test environment was signed out. |
| Cursor | Installation and invocation checked against official documentation; execution not tested. |
| Gemini CLI | Installation and activation checked against official documentation; execution not tested. |
| Claude chat / other web chat | No Strategy Canvas execution test. File execution and export capabilities depend on the host. |

These results concern the named products, not every app that uses the same model. The Grok Bot interface did not expose its model version. The test does not establish Grok Build or ordinary Grok web-chat compatibility.

## What the Grok Bot test did

The Bot received the public repository link and a fictional bookshop decision. The bookshop had a spare room, a three-month horizon, five available staff hours a week, no demand data and no confirmed budget. The supplied options were paid workshops, a quiet reading room or storage; the prompt asked it to keep the choice open.

1. The Bot read the skill and ran its bundled server on its own computer. Its live canvas was visible in the computer view. The downloaded HTML and JSON matched: revision 2, 20 nodes.
2. In the downloaded HTML, the tester opened **Details**, appended `Reader edit: workshops must finish by 18:00.`, saved and exported JSON. That browser-generated file had revision 3.
3. The tester attached the JSON and asked the Bot to deepen workshops while preserving the edit. The prompt did not repeat the finish time. Revision 4 retained the 18:00 constraint and developed options around it.
4. The first tree had mixed shared constraints with competing options. The first correction retained a parking container beside the options. A second correction produced four option children: the three supplied choices plus a clearly proposed shared timetable. The final notes explicitly avoid claiming an exhaustive partition.
5. The final downloaded HTML, SVG and JSON each contained the same validated state: revision 5, 29 nodes. The 18:00 edit remained, unrelated branches were retained and the recommendation stayed empty. Branch focus and return to the whole tree worked in the exported HTML.

The Bot reported using `update_state.py` with expected revision 3 for the first continuation and expected revision 4 for the final correction. Downloaded files independently confirmed the resulting revisions; the remote command history was not independently audited.

This verifies a working file handoff with Grok Bot. It does not verify simultaneous direct editing through Grok's remote computer view, persistence across a Bot restart, reusable skill installation, or unattended strategic correctness. Only the fictional case above was exercised. The hierarchy corrections show why reviewing the reasoning still matters.

## Inspect the evidence

The original, wholly fictional state files are retained unchanged:

- [Initial Bot output, revision 2](test-evidence/grok-bot/initial.json)
- [Browser edit, revision 3](test-evidence/grok-bot/reader-edited.json)
- [First follow-up, revision 4](test-evidence/grok-bot/first-follow-up.json)
- [Final corrected output, revision 5](test-evidence/grok-bot/final.json)

These are test records, including the observed mistakes, rather than recommended strategy examples. The tested skill was [v0.1.1, commit 779e881](https://github.com/jctkerr/strategy-canvas/tree/779e8817dcda0a8c2634cc9a348d7b6b0fde32a3). The revised setup documentation was written after this test; it is not a separate cold-install test of every documented client.

Original final export SHA-256 hashes:

```text
HTML  9cca3c8d6b9147e0d478b095455a2407ca2eacb73e81e8aa2ba567c89397a919
JSON  1fc2a4f550e53762ef000841a4ed733c5c56ca70cb5647482ac6ca37b198fd75
SVG   07578761999bc0da6c1fb1027fcdf10665119dfb053fac954eddd6e0b7fe678a
```

## Runtime checks

All 21 standard-library tests passed locally on 10 September 2026. They cover state validation, revision conflicts, competing writers, atomic saves, loopback access boundaries and complete exports. The generated demo check and skill metadata validator also passed.

The repository's [Python checks](https://github.com/jctkerr/strategy-canvas/actions/workflows/python.yml) run on Linux with Python 3.9 and 3.14, and macOS with Python 3.14. Software tests check runtime behaviour; they do not establish the quality or completeness of an agent's strategy.
