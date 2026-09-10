"""Regression tests for the portable runtime; no third-party dependencies."""
import copy
import http.client
import json
import selectors
import subprocess
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import export_state
import render_state
import state_store


def example():
    return json.loads((ROOT / "examples" / "demo.json").read_text(encoding="utf-8"))


def sourced_example():
    state = example()
    state["sources"] = [{
        "id": "research", "provider": "web", "url": "https://example.org/research",
        "title": "Fictional research", "checkedAt": "2026-09-10T10:00:00Z",
        "summary": "Demonstration only; no commercial evidence.",
        "limitations": "An illustrative source record.",
    }]
    state["nodes"][-1]["sourceIds"] = ["research"]
    state["nodes"][-1]["provenance"] = "proposed"
    return state


class BootstrapParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_boot = False
        self.boot = ""
        self.tags = []

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
        if tag == "script" and dict(attrs).get("id") == "boot-data":
            self.in_boot = True

    def handle_data(self, data):
        if self.in_boot:
            self.boot += data

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_boot = False


class ValidationTests(unittest.TestCase):
    def test_demo_and_structured_sources_validate_without_changes(self):
        for state in (example(), sourced_example()):
            before = copy.deepcopy(state)
            self.assertEqual(state_store.validate(state), before)
            self.assertEqual(state, before)

    def test_schema_and_revision_are_strict(self):
        for field, value in (("schemaVersion", True), ("schemaVersion", 2),
                             ("revision", True), ("revision", 0),
                             ("question", "  "), ("nodes", [])):
            with self.subTest(field=field, value=value):
                state = example()
                state[field] = value
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)
        state = example()
        state["reviewed"] = True
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state)

    def test_invalid_tree_connections_are_rejected(self):
        for problem in ("duplicate", "missing-parent", "two-roots", "no-root", "cycle"):
            with self.subTest(problem=problem):
                state = example()
                nodes = state["nodes"]
                if problem == "duplicate":
                    nodes[1]["id"] = nodes[0]["id"]
                elif problem == "missing-parent":
                    nodes[1]["parentId"] = "absent"
                elif problem == "two-roots":
                    nodes[1]["parentId"] = None
                elif problem == "no-root":
                    nodes[0]["parentId"] = nodes[1]["id"]
                else:
                    nodes[1]["parentId"] = nodes[2]["id"]
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_node_and_payload_limits_are_enforced(self):
        for field, value in (("label", "x" * 241), ("notes", "x" * 20001),
                             ("kind", "unsupported"), ("status", []),
                             ("provenance", "verified")):
            with self.subTest(field=field):
                state = example()
                state["nodes"][0][field] = value
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)
        state = example()
        state["decision"]["uncertainties"] = ["€" * 10000] * 100
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state)

    def test_source_references_must_exist_and_be_distinct(self):
        for refs in (["missing"], ["research", "research"], [False]):
            with self.subTest(refs=refs):
                state = sourced_example()
                state["nodes"][-1]["sourceIds"] = refs
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_unsafe_or_invalid_source_urls_are_rejected(self):
        for url in ("javascript:alert(1)", "file:///tmp/a", "https://user:secret@example.org",
                    "https://example.org/with space", "https://example.org\\@evil.org",
                    "https://example.org:invalid", "https://example.org/\n"):
            with self.subTest(url=url):
                state = sourced_example()
                state["sources"][0]["url"] = url
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_linkedin_embeds_accept_only_documented_native_urls(self):
        state = sourced_example()
        source = state["sources"][0]
        source.update(provider="linkedin", url="https://www.linkedin.com/posts/example")
        source["embedUrl"] = "https://www.linkedin.com/embed/feed/update/urn:li:share:123?collapsed=1"
        state_store.validate(state)
        for url in ("https://linkedin.com.evil.org/embed/feed/update/urn:li:share:123",
                    "https://www.linkedin.com/embed/feed/update/urn:li:share:123?other=1",
                    "https://www.linkedin.com/embed/feed/update/urn:li:share:123#fragment",
                    "http://www.linkedin.com/embed/feed/update/urn:li:share:123"):
            with self.subTest(url=url):
                source["embedUrl"] = url
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_invalid_source_dates_are_rejected(self):
        for value in ("2026-02-30", "yesterday", None):
            with self.subTest(value=value):
                state = sourced_example()
                state["sources"][0]["checkedAt"] = value
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)


class SessionFixture(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.session = self.folder / "session"
        self.original = state_store.initialise(self.session, ROOT / "examples" / "demo.json")


class SessionTests(SessionFixture):
    def test_initialisation_preserves_existing_session(self):
        proposed = copy.deepcopy(self.original)
        proposed["title"] = "Saved conversation"
        saved = state_store.update(self.session, proposed, 1)
        self.assertEqual(state_store.initialise(self.session, self.folder / "missing.json"), saved)

    def test_save_assigns_revision_without_mutating_callers_state(self):
        proposed = sourced_example()
        proposed["revision"] = 700
        before = copy.deepcopy(proposed)
        saved = state_store.update(self.session, proposed, 1)
        self.assertEqual(saved["revision"], 2)
        self.assertEqual(proposed, before)
        self.assertEqual(state_store.read_state(self.session), saved)

    def test_stale_save_returns_latest_state_and_preserves_disk(self):
        winner = copy.deepcopy(self.original)
        winner["title"] = "Human edit"
        saved = state_store.update(self.session, winner, 1)
        before = (self.session / "state.json").read_bytes()
        with self.assertRaises(state_store.Conflict) as caught:
            state_store.update(self.session, self.original, 1)
        self.assertEqual(caught.exception.current, saved)
        self.assertEqual((self.session / "state.json").read_bytes(), before)

    def test_invalid_save_leaves_original_unchanged(self):
        proposed = copy.deepcopy(self.original)
        proposed["nodes"][1]["parentId"] = "missing"
        with self.assertRaises(state_store.InvalidState):
            state_store.update(self.session, proposed, 1)
        for expected in (True, 0, "1"):
            with self.subTest(expected=expected), self.assertRaises(state_store.InvalidState):
                state_store.update(self.session, self.original, expected)
        self.assertEqual(state_store.read_state(self.session), self.original)

    def test_failed_atomic_replace_preserves_previous_bytes_and_cleans_temporary_file(self):
        before = (self.session / "state.json").read_bytes()
        with patch.object(state_store.os, "replace", side_effect=OSError("simulated disk failure")):
            with self.assertRaises(OSError):
                state_store.update(self.session, self.original, 1)
        self.assertEqual((self.session / "state.json").read_bytes(), before)
        self.assertEqual(list(self.session.glob(".state-*.json")), [])
        self.assertEqual(state_store.update(self.session, self.original, 1)["revision"], 2)

    def test_competing_cli_writers_have_one_winner(self):
        processes = []
        for title in ("First writer", "Second writer"):
            proposed = copy.deepcopy(self.original)
            proposed["title"] = title
            path = self.folder / (title + ".json")
            path.write_text(json.dumps(proposed), encoding="utf-8")
            process = subprocess.Popen(
                [sys.executable, str(ROOT / "scripts" / "update_state.py"),
                 "--session", str(self.session), "--state", str(path), "--expected-revision", "1"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            )
            processes.append((title, process))
            self.addCleanup(stop_process, process)
        results = [(title, process, process.communicate(timeout=10)) for title, process in processes]
        self.assertEqual(sorted(process.returncode for _, process, _ in results), [0, 3])
        winner = next(title for title, process, _ in results if process.returncode == 0)
        saved = state_store.read_state(self.session)
        self.assertEqual((saved["revision"], saved["title"]), (2, winner))


class ExportTests(SessionFixture):
    def setUp(self):
        super().setUp()
        self.state = sourced_example()
        self.payload = '</script><img src=x onerror="alert(1)"><script>& café'
        self.state["nodes"][-1]["notes"] = self.payload
        self.state["nodes"][-1]["label"] = "Last branch with a complete label " * 5
        self.state = state_store.update(self.session, self.state, 1)

    def test_all_export_formats_preserve_complete_state_and_revision(self):
        before = (self.session / "state.json").read_bytes()
        saved, files = export_state.export_session(self.session, self.folder / "exports" / "decision")
        self.assertEqual(saved, self.state)
        self.assertEqual(json.loads(files["json"].read_text(encoding="utf-8")), self.state)
        parser = BootstrapParser()
        parser.feed(files["html"].read_text(encoding="utf-8"))
        self.assertEqual(json.loads(parser.boot), {"state": self.state, "offline": True})
        self.assertFalse(any(tag == "img" and attrs.get("onerror") for tag, attrs in parser.tags))
        svg = ET.fromstring(files["svg"].read_text(encoding="utf-8"))
        ns = {"svg": render_state.NS}
        self.assertEqual(json.loads(svg.find("svg:metadata", ns).text), self.state)
        cards = svg.findall(".//svg:g[@class='tree-node']", ns)
        self.assertEqual({card.attrib["data-id"] for card in cards}, {n["id"] for n in self.state["nodes"]})
        last = next(card for card in cards if card.attrib["data-id"] == self.state["nodes"][-1]["id"])
        self.assertIn(self.payload, last.find("svg:title", ns).text)
        label = last.find("svg:text[@class='node-label']", ns)
        self.assertEqual(" ".join(label.itertext()), self.state["nodes"][-1]["label"].strip())
        self.assertFalse(svg.findall(".//svg:script", ns))
        self.assertEqual((self.session / "state.json").read_bytes(), before)

    def test_live_html_embeds_same_state_with_live_mode(self):
        parser = BootstrapParser()
        parser.feed(render_state.html_document(self.state, offline=False))
        self.assertEqual(json.loads(parser.boot), {"state": self.state, "offline": False})

    def test_export_refuses_to_overwrite_canonical_session(self):
        before = (self.session / "state.json").read_bytes()
        with self.assertRaises(state_store.InvalidState):
            export_state.export_session(self.session, self.session / "state")
        self.assertEqual((self.session / "state.json").read_bytes(), before)
        self.assertFalse((self.session / "state.html").exists())


def stop_process(process):
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    for stream in (process.stdout, process.stderr):
        if stream is not None:
            stream.close()


class HTTPTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.session = Path(temporary.name) / "session"
        log = tempfile.TemporaryFile()
        self.addCleanup(log.close)
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "scripts" / "serve.py"),
             "--session", str(self.session), "--port", "0"],
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=log, text=True,
        )
        self.addCleanup(stop_process, process)
        with selectors.DefaultSelector() as selector:
            selector.register(process.stdout, selectors.EVENT_READ)
            self.assertTrue(selector.select(timeout=10), "Server did not announce its loopback address")
            banner = process.stdout.readline().strip()
        self.assertTrue(banner.startswith("Strategy Canvas ready: http://127.0.0.1:"), banner)
        self.port = int(banner.rsplit(":", 1)[1])
        self.origin = "http://127.0.0.1:" + str(self.port)

    def request(self, method="GET", path="/api/state", body=None, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=5)
        try:
            connection.request(method, path, body=body, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_local_read_save_and_stale_conflict(self):
        status, headers, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        state = json.loads(body)
        state["title"] = "Browser edit"
        payload = json.dumps({"expectedRevision": 1, "state": state})
        headers = {"Content-Type": "application/json", "Origin": self.origin}
        status, _, body = self.request("PUT", body=payload, headers=headers)
        self.assertEqual(status, 200)
        saved = json.loads(body)
        self.assertEqual(saved["revision"], 2)
        status, _, body = self.request("PUT", body=payload, headers=headers)
        self.assertEqual(status, 409)
        self.assertEqual(json.loads(body)["current"], saved)
        self.assertEqual(state_store.read_state(self.session), saved)

    def test_untrusted_host_and_origin_cannot_read_or_write(self):
        for method in ("GET", "PUT"):
            for headers in ({"Host": "attacker.example"}, {"Origin": "https://attacker.example"},
                            {"Origin": "null"}):
                with self.subTest(method=method, headers=headers):
                    status, _, _ = self.request(method, body="{}" if method == "PUT" else None, headers=headers)
                    self.assertEqual(status, 403)
        self.assertEqual(state_store.read_state(self.session)["revision"], 1)

    def test_malformed_or_unsupported_requests_do_not_change_state(self):
        cases = [
            ("{}", {"Content-Type": "text/plain"}, 415),
            ("not json", {"Content-Type": "application/json"}, 400),
            ("[]", {"Content-Type": "application/json"}, 400),
            ("{}", {"Content-Type": "application/json"}, 400),
            ("", {"Content-Type": "application/json"}, 413),
            ("", {"Content-Type": "application/json", "Content-Length": str(state_store.MAX_BYTES + 1)}, 413),
        ]
        for body, headers, expected in cases:
            with self.subTest(body=body, headers=headers):
                status, _, _ = self.request("PUT", body=body, headers=headers)
                self.assertEqual(status, expected)
        self.assertEqual(self.request(path="/state.json")[0], 404)
        self.assertEqual(self.request(path="/../state.json")[0], 404)
        self.assertEqual(state_store.read_state(self.session)["revision"], 1)


if __name__ == "__main__":
    unittest.main()
