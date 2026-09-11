"""Reopening keeps the same canonical session and verifies its local server."""
import concurrent.futures
import http.client
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import canvas
import session_server
import state_store


class SessionOpenTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.folder = Path(self.temporary.name).resolve()
        self.session = self.folder / "my session"
        self.servers = []

    def tearDown(self):
        for folder, record in reversed(self.servers):
            session_server.stop_server(folder, record)
        deadline = time.monotonic() + 5
        while any(session_server.verified_server(folder, record) for folder, record in self.servers):
            if time.monotonic() > deadline:
                self.fail("A disposable test server did not stop.")
            time.sleep(.05)
        self.temporary.cleanup()

    def run_cli(self, *args, session=None, runtime=ROOT):
        return subprocess.run([sys.executable, str(runtime / "scripts" / "canvas.py"),
                               "--session", str(session or self.session), *args],
                              capture_output=True, text=True, timeout=15)

    def initialise(self, session=None):
        return canvas.create_session(session or self.session,
                                     canvas.question_state("Could our fictional workshop cover its costs?"))

    def open_canvas(self, session=None, runtime=ROOT):
        folder = session or self.session
        result = self.run_cli("open", session=folder, runtime=runtime)
        self.assertEqual(result.returncode, 0, result.stderr)
        record = session_server.read_receipt(folder)
        self.servers.append((folder, record))
        self.assertIsNotNone(session_server.verified_server(folder, record))
        return json.loads(result.stdout), record

    def test_open_requires_existing_valid_state_without_creating_or_replacing_it(self):
        result = self.run_cli("open")
        self.assertEqual(result.returncode, 2)
        self.assertIn("No saved session", result.stderr)
        self.assertFalse(self.session.exists())
        self.session.mkdir()
        (self.session / "state.json").write_text("unreadable personal state")
        result = self.run_cli("open")
        self.assertEqual(result.returncode, 2)
        self.assertEqual((self.session / "state.json").read_text(), "unreadable personal state")
        self.assertFalse((self.session / "server.json").exists())

    def test_repeat_open_reuses_verified_server_and_latest_manual_edits(self):
        self.initialise()
        first, original_server = self.open_canvas()
        self.assertEqual(first["status"], "started")
        revised = state_store.read_state(self.session)
        revised["nodes"][0]["notes"] = "Human wording: check paid bookings before committing."
        connection = http.client.HTTPConnection("127.0.0.1", session_server.receipt_port(original_server), timeout=3)
        try:
            connection.request("PUT", "/api/state", json.dumps({"expectedRevision": revised["revision"], "state": revised}),
                               {"Content-Type": "application/json"})
            response = connection.getresponse()
            self.assertEqual(response.status, 200)
            saved = json.loads(response.read())
        finally:
            connection.close()
        before = (self.session / "state.json").read_bytes()
        reopened, server = self.open_canvas()
        self.assertEqual((reopened["status"], reopened["url"], server["instanceId"]),
                         ("reused", first["url"], original_server["instanceId"]))
        self.assertEqual((reopened["revision"], reopened["nodes"]), (saved["revision"], 1))
        self.assertEqual((self.session / "state.json").read_bytes(), before)

    def test_concurrent_open_calls_share_one_server(self):
        original = self.initialise()
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            results = list(executor.map(lambda _: self.run_cli("open"), range(3)))
        record = session_server.read_receipt(self.session)
        self.servers.append((self.session, record))
        for result in results:
            self.assertEqual(result.returncode, 0, result.stderr)
        receipts = [json.loads(result.stdout) for result in results]
        self.assertEqual(len({r["url"] for r in receipts}), 1)
        self.assertEqual(sorted(r["status"] for r in receipts), ["reused", "reused", "started"])
        self.assertEqual(state_store.read_state(self.session), original)

    def test_stopped_server_restarts_at_previous_port_with_state_unchanged(self):
        original = self.initialise()
        first, record = self.open_canvas()
        os.kill(record["pid"], signal.SIGTERM)  # Only the exact disposable process just verified above.
        deadline = time.monotonic() + 5
        while session_server.verified_server(self.session, record) and time.monotonic() < deadline:
            time.sleep(.05)
        reopened, replacement = self.open_canvas()
        self.assertEqual((reopened["status"], reopened["url"]), ("restarted", first["url"]))
        self.assertNotEqual(record["instanceId"], replacement["instanceId"])
        self.assertEqual(state_store.read_state(self.session), original)

    def test_wrong_session_at_stale_url_is_not_reused_or_stopped(self):
        original = self.initialise()
        foreign = self.folder / "other session"
        self.initialise(foreign)
        _, foreign_record = self.open_canvas(foreign)
        # Even a receipt falsely claiming this session cannot override the responding identity.
        stale = {**foreign_record, "sessionId": session_server.session_canvas_id(self.session)}
        session_server.write_receipt(self.session, stale)
        opened, _ = self.open_canvas()
        self.assertNotEqual(opened["url"], foreign_record["url"])
        self.assertIsNotNone(session_server.verified_server(foreign, foreign_record))
        self.assertEqual(state_store.read_state(self.session), original)

    def test_clean_shutdown_retains_address_for_reopening(self):
        original = self.initialise()
        first, record = self.open_canvas()
        self.assertTrue(session_server.stop_server(self.session, record))
        deadline = time.monotonic() + 5
        while session_server.verified_server(self.session, record) and time.monotonic() < deadline:
            time.sleep(.05)
        reopened, replacement = self.open_canvas()
        self.assertEqual((reopened["status"], reopened["url"]), ("restarted", first["url"]))
        self.assertNotEqual(record["instanceId"], replacement["instanceId"])
        self.assertEqual(state_store.read_state(self.session), original)

    def test_unverifiable_running_owner_is_not_killed_or_duplicated(self):
        original = self.initialise()
        _, owner = self.open_canvas()
        session_server.write_receipt(self.session, {**owner, "instanceId": "wrong-instance"})
        result = self.run_cli("open")
        self.assertEqual(result.returncode, 2)
        self.assertIn("Saved state is unchanged", result.stderr)
        self.assertIsNotNone(session_server.verified_server(self.session, owner))
        self.assertEqual(state_store.read_state(self.session), original)

    def test_outdated_runtime_restarts_verified_owner_at_same_url(self):
        original = self.initialise()
        runtime = self.folder / "installed skill"
        shutil.copytree(ROOT / "scripts", runtime / "scripts", ignore=shutil.ignore_patterns("__pycache__"))
        (runtime / "assets").mkdir()
        shutil.copyfile(ROOT / "assets" / "canvas.html", runtime / "assets" / "canvas.html")
        first, record = self.open_canvas(runtime=runtime)
        with (runtime / "scripts" / "serve.py").open("a") as stream:
            stream.write("\n# Fictional runtime update for the reopen check.\n")
        reopened, replacement = self.open_canvas(runtime=runtime)
        self.assertEqual((reopened["status"], reopened["url"]), ("restarted", first["url"]))
        self.assertNotEqual(record["runtimeId"], replacement["runtimeId"])
        self.assertNotEqual(record["instanceId"], replacement["instanceId"])
        self.assertEqual(state_store.read_state(self.session), original)

    def test_update_between_initial_check_and_startup_accepts_current_child(self):
        original = self.initialise()
        actual_runtime = session_server.runtime_id()
        children = []
        spawn = subprocess.Popen

        def capture_child(*args, **kwargs):
            child = spawn(*args, **kwargs)
            children.append(child)
            return child

        try:
            with patch.object(session_server, "runtime_id", side_effect=["before-update", actual_runtime]), \
                    patch.object(session_server.subprocess, "Popen", side_effect=capture_child):
                opened = session_server.open_session(self.session)
            record = session_server.read_receipt(self.session)
            self.servers.append((self.session, record))
            self.assertEqual(opened["status"], "started")
            self.assertEqual(record["runtimeId"], actual_runtime)
            self.assertEqual(state_store.read_state(self.session), original)
        finally:
            session_server.stop_server(self.session, session_server.read_receipt(self.session))
            for child in children:
                child.wait(timeout=5)

    def test_remote_or_malformed_receipts_never_become_network_targets(self):
        for url in ["https://127.0.0.1:8765", "http://localhost:8765", "http://example.org:80",
                    "http://127.0.0.1:8765/private", "http://user@127.0.0.1:8765",
                    "http://127.0.0.1:8765?x=1", "http://127.0.0.1:8765#x", "file:///tmp/canvas",
                    "http://127.0.0.1:8765\n", "http://127.0.0.1:65536"]:
            with self.subTest(url=url):
                self.assertIsNone(session_server.receipt_port({"url": url}))
        original = self.initialise()
        session_server.write_receipt(self.session, {"url": "http://example.invalid:80",
                                                   "sessionId": session_server.session_canvas_id(self.session)})
        opened, _ = self.open_canvas()
        self.assertTrue(opened["url"].startswith("http://127.0.0.1:"))
        self.assertEqual(state_store.read_state(self.session), original)

    def test_foreground_server_is_reused_and_stop_requires_exact_instance(self):
        self.initialise()
        process = subprocess.Popen([sys.executable, str(ROOT / "scripts" / "serve.py"),
                                    "--session", str(self.session), "--port", "0"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            deadline = time.monotonic() + 5
            while not session_server.verified_server(self.session, session_server.read_receipt(self.session)):
                self.assertLess(time.monotonic(), deadline)
                time.sleep(.05)
            opened, record = self.open_canvas()
            self.assertEqual(opened["status"], "reused")
            self.assertEqual(record["pid"], process.pid)
            self.assertIsNone(session_server.request(session_server.receipt_port(record), "/api/server/stop",
                                                    {"instanceId": "not-this-server"}))
            self.assertIsNotNone(session_server.verified_server(self.session, record))
        finally:
            process.terminate()
            process.wait(timeout=5)


if __name__ == "__main__":
    unittest.main()
