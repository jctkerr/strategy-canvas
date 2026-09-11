"""Selection hints identify the branch without becoming strategy state."""
import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import canvas
import render_state
import state_store
import view_store


class ViewTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.session = Path(folder.name) / "session"
        state = canvas.question_state("How could a fictional shop improve?")
        state["nodes"][0]["method"] = "issue"
        state["nodes"] += [
            {"id": "wait", "parentId": "root", "kind": "question", "label": "Why do people wait?", "status": "open", "notes": "Human observation."},
            {"id": "timing", "parentId": "wait", "kind": "metric", "label": "Wait time", "status": "uncertain", "notes": "Unknown."},
        ]
        self.state = canvas.create_session(self.session, state)
        self.payload = {"clientId": "browser-one", "sequence": 1, "selectedNodeId": "wait",
                        "focusedNodeId": None, "editingNodeId": "wait", "hasUnsavedDraft": False, "revision": 1}

    def test_focus_reads_canonical_branch_without_mutating_tree(self):
        original = (self.session / "state.json").read_bytes()
        self.assertEqual(view_store.read_focus(self.session)["status"], "missing")
        view_store.save_view(self.session, self.payload)
        focus = view_store.read_focus(self.session)
        self.assertEqual(focus["status"], "current")
        selected = focus["selection"]
        self.assertEqual(selected["node"]["notes"], "Human observation.")
        self.assertEqual(selected["effectiveMethod"], "issue")
        self.assertEqual(selected["descendantNodeIds"], ["timing"])
        self.assertEqual([n["id"] for n in selected["ancestors"]], ["root"])
        self.assertEqual((self.session / "state.json").read_bytes(), original)
        run = subprocess.run([sys.executable, str(ROOT / "scripts/canvas.py"), "--session", str(self.session), "focus"],
                             capture_output=True, text=True, timeout=10)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(json.loads(run.stdout)["selection"]["selectedNodeId"], "wait")

    def test_stale_inactive_ambiguous_and_removed_selections_are_not_guessed(self):
        with patch("view_store.time.time", return_value=1000):
            view_store.save_view(self.session, self.payload)
        with patch("view_store.time.time", return_value=1000 + view_store.VIEW_TTL + 1):
            self.assertEqual(view_store.read_focus(self.session)["status"], "stale")
        view_store.save_view(self.session, {**self.payload, "sequence": 2, "active": False})
        self.assertEqual(view_store.read_focus(self.session)["status"], "stale")
        view_store.save_view(self.session, {**self.payload, "sequence": 3})
        view_store.save_view(self.session, {**self.payload, "clientId": "browser-two", "selectedNodeId": "root"})
        ambiguous = view_store.read_focus(self.session)
        self.assertEqual(ambiguous["status"], "ambiguous")
        self.assertIsNone(ambiguous["selection"])
        view_store.save_view(self.session, {**self.payload, "clientId": "browser-two", "sequence": 2, "active": False})
        reduced = copy.deepcopy(self.state)
        reduced["nodes"] = reduced["nodes"][:1]
        state_store.update(self.session, reduced, 1)
        self.assertEqual(view_store.read_focus(self.session)["status"], "stale")

    def test_late_packets_cannot_revert_selection_or_pending_draft(self):
        view_store.save_view(self.session, {**self.payload, "sequence": 2, "hasUnsavedDraft": True})
        view_store.save_view(self.session, {**self.payload, "selectedNodeId": "root"})
        selected = view_store.read_focus(self.session)["selection"]
        self.assertEqual(selected["selectedNodeId"], "wait")
        self.assertTrue(selected["hasUnsavedDraft"])

    def test_agent_receives_latest_notes_even_if_view_observed_older_revision(self):
        view_store.save_view(self.session, self.payload)
        changed = copy.deepcopy(self.state)
        changed["nodes"][1]["notes"] = "New human finding."
        state_store.update(self.session, changed, 1)
        focus = view_store.read_focus(self.session)
        self.assertEqual(focus["stateRevision"], 2)
        self.assertEqual(focus["selection"]["observedRevision"], 1)
        self.assertEqual(focus["selection"]["node"]["notes"], "New human finding.")

    def test_invalid_context_cannot_write_unrelated_data(self):
        for change in ({"selectedNodeId": "absent"}, {"sequence": True}, {"hasUnsavedDraft": "false"},
                       {"revision": 2}, {"clientId": "../state"}, {"notes": "overwrite"}):
            with self.subTest(change=change), self.assertRaises(state_store.InvalidState):
                view_store.save_view(self.session, {**self.payload, **change})
        self.assertEqual(state_store.read_state(self.session), self.state)
        self.assertFalse((self.session / "view.json").exists())

    def test_recovery_ids_are_stable_and_sessions_are_isolated(self):
        first = view_store.session_canvas_id(self.session)
        self.assertEqual(first, view_store.session_canvas_id(self.session))
        self.assertNotEqual(first, view_store.session_canvas_id(self.session / "other"))
        self.assertNotIn(str(self.session), first)
        html = render_state.html_document(self.state, canvas_id="demo-stable")
        self.assertIn('"canvasId": "demo-stable"', html)
        altered = copy.deepcopy(self.state)
        altered["nodes"][0]["notes"] = "A different exported snapshot."
        self.assertNotEqual(render_state.html_document(self.state), render_state.html_document(altered))


if __name__ == "__main__":
    unittest.main()
