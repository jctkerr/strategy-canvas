"""Question-first CLI and partial edits use the same store as the live canvas."""
import copy
import http.client
import json
import selectors
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import canvas
import render_state
import state_store


def node(ident, parent="root", **fields):
    return {"id": ident, "parentId": parent, "label": ident, "kind": "question", **fields}


class CanvasCLITests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name).resolve()
        self.session = self.folder / "session"

    def command(self, *args):
        return [sys.executable, str(ROOT / "scripts" / "canvas.py"), "--session", str(self.session), *args]

    def run_cli(self, *args, data=None):
        return subprocess.run(self.command(*args), input=data, capture_output=True, text=True, timeout=10)

    def initialise(self):
        return canvas.create_session(self.session, canvas.question_state("Could a workshop be viable?"))

    def test_question_init_and_show_need_no_demo_or_boilerplate(self):
        created = self.run_cli("init", "--question", "What should I explore?")
        self.assertEqual(created.returncode, 0, created.stderr)
        self.assertEqual(json.loads(created.stdout), {"session": str(self.session), "revision": 1, "nodes": 1})
        shown = self.run_cli("show")
        self.assertEqual(shown.returncode, 0, shown.stderr)
        state = json.loads(shown.stdout)
        self.assertEqual(state, canvas.question_state("What should I explore?"))
        self.assertNotIn("method", state["nodes"][0])
        self.assertEqual(state["decision"]["recommendation"], "")

    def test_import_retains_manual_ids_revision_and_metadata(self):
        state = json.loads((ROOT / "examples" / "workshop-analysis.json").read_text())
        exported = self.folder / "manual export.json"
        exported.write_text(json.dumps(state))
        result = self.run_cli("init", "--from", str(exported))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state_store.read_state(self.session), state)
        self.assertEqual(json.loads(result.stdout)["revision"], state["revision"])

    def test_import_can_read_stdin(self):
        state = canvas.question_state("A manually edited question")
        result = self.run_cli("init", "--from", "-", data=json.dumps(state))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(state_store.read_state(self.session), state)

    def test_existing_session_is_never_reset_even_when_invalid(self):
        self.initialise()
        before = (self.session / "state.json").read_bytes()
        retry = self.run_cli("init", "--question", "Different question")
        self.assertEqual(retry.returncode, 2)
        self.assertIn("already exists", retry.stderr)
        self.assertEqual((self.session / "state.json").read_bytes(), before)
        (self.session / "state.json").write_text("invalid saved file")
        retry = self.run_cli("init", "--question", "Different question")
        self.assertEqual(retry.returncode, 2)
        self.assertEqual((self.session / "state.json").read_text(), "invalid saved file")

    def test_concurrent_initialisation_has_one_winner(self):
        processes = [subprocess.Popen(self.command("init", "--question", question), stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE, text=True) for question in ("First?", "Second?")]
        results = [(process, process.communicate(timeout=10)) for process in processes]
        self.assertEqual(sorted(process.returncode for process, _ in results), [0, 2])
        state = state_store.read_state(self.session)
        self.assertIn(state["question"], {"First?", "Second?"})
        self.assertEqual(state["revision"], 1)

    def test_invalid_or_oversized_init_does_not_create_state(self):
        for question in ("", " " * 10, "x" * 241):
            with self.subTest(question=question):
                result = self.run_cli("init", "--question", question)
                self.assertEqual(result.returncode, 2)
                self.assertFalse((self.session / "state.json").exists())
        result = self.run_cli("init", "--from", "-", data=" " * (state_store.MAX_BYTES + 1))
        self.assertEqual(result.returncode, 2)
        self.assertFalse((self.session / "state.json").exists())

    def test_batch_adds_nested_methods_in_one_revision(self):
        self.initialise()
        changes = {"editNodes": [{"id": "root", "method": "issue"}], "addNodes": [
            node("economics", method="driver", relation={"type": "part-of"}),
            node("cost", "economics", kind="metric", relation={"type": "calculated-from"}),
            node("demand", method="hypothesis", status="uncertain", relation={"type": "part-of"}),
            node("bookings", "demand", relation={"type": "tests"}),
        ]}
        result = self.run_cli("apply", "--expected-revision", "1", "--changes", "-", data=json.dumps(changes))
        self.assertEqual(result.returncode, 0, result.stderr)
        state = state_store.read_state(self.session)
        self.assertEqual((state["revision"], len(state["nodes"])), (2, 5))
        self.assertEqual(render_state.effective_methods(state), {
            "root": "issue", "economics": "driver", "cost": "driver", "demand": "hypothesis", "bookings": "hypothesis"})
        self.assertEqual(state["nodes"][1]["relation"], {"type": "part-of"})
        self.assertEqual(state["nodes"][2]["status"], "open")
        self.assertNotIn("method", state["nodes"][2])
        self.assertNotIn("provenance", state["nodes"][2])
        self.assertEqual(state["nodes"][3]["status"], "uncertain")
        self.assertEqual(state["decision"]["recommendation"], "")
        saved = canvas.apply_changes(self.session, {"editNodes": [{"id": "root", "method": "exploration"}]}, 2)
        self.assertEqual(render_state.effective_methods(saved)["cost"], "driver")
        self.assertEqual(render_state.effective_methods(saved)["bookings"], "hypothesis")

    def test_unmentioned_manual_evidence_analysis_and_uncertainty_are_preserved(self):
        original = json.loads((ROOT / "examples" / "workshop-analysis.json").read_text())
        original["sources"] = [{"id": "ref", "provider": "web", "url": "https://example.org/",
                                "title": "Illustrative source", "checkedAt": "2026-09-10",
                                "summary": "Fictional test reference only."}]
        original["nodes"][0]["sourceIds"] = ["ref"]
        original["analysis"]["models"][0]["variables"][0]["values"] = {"low": None, "base": None, "high": None}
        canvas.create_session(self.session, original)
        changes = {"editNodes": [{"id": "workshop_question", "label": "Could a paid workshop work?"}]}
        source = self.folder / "changes.json"
        source.write_text(json.dumps(changes))
        result = self.run_cli("apply", "--expected-revision", "2", "--changes", str(source))
        self.assertEqual(result.returncode, 0, result.stderr)
        expected = copy.deepcopy(original)
        expected["revision"] = 3
        expected["nodes"][0]["label"] = "Could a paid workshop work?"
        self.assertEqual(state_store.read_state(self.session), expected)

    def test_question_change_is_explicit_and_preserves_custom_root_label(self):
        original = self.initialise()
        changes = {"set": {"question": "What demand would make it viable?", "nextQuestion": ""}}
        result = canvas.apply_changes(self.session, changes, 1)
        self.assertEqual(result["question"], changes["set"]["question"])
        self.assertEqual(result["nodes"], original["nodes"])
        self.assertEqual(result["title"], original["title"])

    def test_invalid_patch_does_not_partially_write(self):
        self.initialise()
        before = (self.session / "state.json").read_bytes()
        invalid = [
            [], {}, {"removeNodes": ["root"]}, {"set": {"revision": 4}}, {"set": {"nodes": []}},
            {"set": {"question": ""}}, {"set": None}, {"editNodes": {}}, {"addNodes": None},
            {"editNodes": [{"id": "missing", "label": "No"}]},
            {"editNodes": [{"id": "root"}]},
            {"editNodes": [{"id": "root", "label": "First"}, {"id": "root", "label": "Second"}]},
            {"editNodes": [{"id": "root", "method": "magic"}]},
            {"addNodes": [node("root")]}, {"addNodes": [node("new", "missing")]},
            {"addNodes": [node("new"), node("new")]},
            {"addNodes": [{"id": "new", "parentId": "root", "label": "Missing kind"}]},
            {"addNodes": [node("new", relation={"type": "proven"})]},
            {"addNodes": [node("first"), node("second", "missing")]},
            {"editNodes": [{"id": "root", "parentId": "new"}], "addNodes": [node("new")]},
            {"set": {"sources": []}, "editNodes": [{"id": "root", "sourceIds": ["missing"]}]},
        ]
        for changes in invalid:
            with self.subTest(changes=changes), self.assertRaises(state_store.InvalidState):
                canvas.apply_changes(self.session, changes, 1)
            self.assertEqual((self.session / "state.json").read_bytes(), before)

    def test_noop_is_rejected_without_revision_churn(self):
        state = self.initialise()
        for changes in ({"set": {}}, {"addNodes": []}, {"editNodes": [{"id": "root", "label": state["question"]}]}):
            with self.subTest(changes=changes), self.assertRaises(state_store.InvalidState):
                canvas.apply_changes(self.session, changes, 1)
        self.assertEqual(state_store.read_state(self.session), state)

    def test_race_after_read_is_caught_by_the_shared_update_lock(self):
        self.initialise()
        real_update = state_store.update

        def manual_edit_before_save(session, proposed, expected):
            manual = state_store.read_state(session)
            manual["nodes"][0]["notes"] = "A human added this while the agent prepared its edit."
            real_update(session, manual, expected)
            return real_update(session, proposed, expected)

        with patch.object(canvas, "update", side_effect=manual_edit_before_save), self.assertRaises(state_store.Conflict):
            canvas.apply_changes(self.session, {"addNodes": [node("new")]}, 1)
        saved = state_store.read_state(self.session)
        self.assertEqual((saved["revision"], len(saved["nodes"])), (2, 1))
        self.assertIn("A human added", saved["nodes"][0]["notes"])

    def test_competing_cli_patches_have_one_winner(self):
        self.initialise()
        processes = []
        for ident in ("first", "second"):
            changes = self.folder / (ident + ".json")
            changes.write_text(json.dumps({"addNodes": [node(ident)]}))
            processes.append(subprocess.Popen(self.command("apply", "--expected-revision", "1", "--changes", str(changes)),
                                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True))
        results = [(process, process.communicate(timeout=10)) for process in processes]
        self.assertEqual(sorted(process.returncode for process, _ in results), [0, 3])
        saved = state_store.read_state(self.session)
        self.assertEqual((saved["revision"], len(saved["nodes"])), (2, 2))
        loser = next(stderr for process, (_, stderr) in results if process.returncode == 3)
        self.assertEqual(json.loads(loser)["currentRevision"], 2)

    def test_http_and_cli_share_the_same_state_and_conflict_contract(self):
        self.initialise()
        process = subprocess.Popen([sys.executable, str(ROOT / "scripts" / "serve.py"), "--session", str(self.session), "--port", "0"],
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                self.assertTrue(selector.select(5), "Server did not print its URL")
                url = process.stdout.readline().strip().split()[-1]
            connection = http.client.HTTPConnection("127.0.0.1", urlsplit(url).port, timeout=5)
            try:
                manual = state_store.read_state(self.session)
                manual["nodes"][0]["notes"] = "A manual browser edit."
                connection.request("PUT", "/api/state", body=json.dumps({"expectedRevision": 1, "state": manual}),
                                   headers={"Content-Type": "application/json"})
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                self.assertEqual(json.loads(response.read())["revision"], 2)
                stale = self.run_cli("apply", "--expected-revision", "1", "--changes", "-", data=json.dumps({"addNodes": [node("new")]}))
                self.assertEqual(stale.returncode, 3)
                saved = self.run_cli("apply", "--expected-revision", "2", "--changes", "-", data=json.dumps({"addNodes": [node("new")]}))
                self.assertEqual(saved.returncode, 0, saved.stderr)
                connection.request("GET", "/api/state")
                response = connection.getresponse()
                self.assertEqual(response.status, 200)
                state = json.loads(response.read())
                self.assertEqual((state["revision"], len(state["nodes"])), (3, 2))
                self.assertEqual(state["nodes"][0]["notes"], "A manual browser edit.")
            finally:
                connection.close()
        finally:
            process.terminate()
            process.communicate(timeout=5)


if __name__ == "__main__":
    unittest.main()
