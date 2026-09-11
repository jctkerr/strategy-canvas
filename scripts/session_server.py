"""Start or reuse one verified loopback server for an existing session."""
import errno
import fcntl
import hashlib
import http.client
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path

from state_store import InvalidState, read_state
from view_store import session_canvas_id

ROOT = Path(__file__).resolve().parent.parent
RECEIPT = "server.json"
MAX_RECEIPT = 4096


def runtime_id():
    """Fingerprint executable sources, not personal state or generated examples."""
    digest = hashlib.sha256()
    for path in sorted((ROOT / "scripts").glob("*.py")) + [ROOT / "assets" / "canvas.html"]:
        digest.update(path.relative_to(ROOT).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return digest.hexdigest()


def read_receipt(session):
    try:
        with (Path(session) / RECEIPT).open("rb") as stream:
            raw = stream.read(MAX_RECEIPT + 1)
        value = json.loads(raw) if len(raw) <= MAX_RECEIPT else None
        return value if isinstance(value, dict) else None
    except (OSError, ValueError):
        return None


def write_receipt(session, value):
    fd, temporary = tempfile.mkstemp(prefix=".server-", suffix=".json", dir=session)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(value, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, Path(session) / RECEIPT)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def receipt_port(value):
    """Never follow redirects, proxies, remote hosts or URLs supplied by a page."""
    url = value.get("url") if isinstance(value, dict) else None
    match = re.fullmatch(r"http://127\.0\.0\.1:([1-9][0-9]{0,4})/?", url) if isinstance(url, str) else None
    return int(match[1]) if match and int(match[1]) <= 65535 else None


def request(port, path, payload=None):
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1)
    try:
        body = None if payload is None else json.dumps(payload)
        connection.request("GET" if payload is None else "POST", path, body,
                           {} if payload is None else {"Content-Type": "application/json"})
        response = connection.getresponse()
        raw = response.read(MAX_RECEIPT + 1)
        if response.status != 200 or len(raw) > MAX_RECEIPT:
            return None
        value = json.loads(raw)
        return value if isinstance(value, dict) else None
    except (OSError, ValueError, http.client.HTTPException):
        return None
    finally:
        connection.close()


def verified_server(session, record):
    port = receipt_port(record)
    if not port or record.get("sessionId") != session_canvas_id(session):
        return None
    info = request(port, "/api/server-info")
    keys = ("sessionId", "instanceId", "runtimeId", "pid")
    if (not info or info.get("protocol") != 1 or
            not all(info.get(key) == record.get(key) for key in keys) or
            not isinstance(info.get("instanceId"), str) or not info["instanceId"]):
        return None
    return info


def stop_server(session, record):
    """Stop only the responding instance that proves this session's identity."""
    if not verified_server(session, record):
        return False
    return request(receipt_port(record), "/api/server/stop",
                   {"instanceId": record["instanceId"]}) == {"stopping": True}


@contextmanager
def open_lock(session):
    with (Path(session) / ".open.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        yield


def claim_server(session):
    """A lifetime lock also prevents duplicate foreground servers."""
    lock = (Path(session) / ".server.lock").open("a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as error:
        lock.close()
        if error.errno in {errno.EACCES, errno.EAGAIN}:
            raise InvalidState("A server already owns this session. Use canvas.py --session DIR open.") from None
        raise
    return lock


def open_session(session):
    session = Path(session).expanduser().resolve()
    # Reopening must never initialise a demo, create a directory, or replace state.
    if not (session / "state.json").is_file():
        raise InvalidState("No saved session here. Use the session directory from this conversation; initialise only for a new canvas.")
    read_state(session)
    with open_lock(session):
        expected_runtime = runtime_id()
        record = read_receipt(session)
        info = verified_server(session, record)
        if info and info["runtimeId"] == expected_runtime:
            return open_receipt(session, record, "reused")
        if info:
            if not stop_server(session, record):
                raise InvalidState("The previous canvas could not be restarted safely. Its saved state is unchanged.")
            deadline = time.monotonic() + 4
            while verified_server(session, record) and time.monotonic() < deadline:
                time.sleep(.05)
        port = receipt_port(record) if record and record.get("sessionId") == session_canvas_id(session) else None
        command = [sys.executable, str(ROOT / "scripts" / "serve.py"), "--session", str(session),
                   "--existing", "--port", str(port or 0), "--fallback-port"]
        with (session / "server.log").open("ab") as log:
            child = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
                                     close_fds=True, start_new_session=True)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            current = read_receipt(session)
            info = verified_server(session, current)
            # An update may finish between the launcher's first check and the
            # child's startup. Verify against the sources that exist now.
            if info and info["runtimeId"] == runtime_id():
                return open_receipt(session, current, "restarted" if record else "started")
            if child.poll() is not None:
                raise InvalidState("Canvas did not start. Saved state is unchanged; inspect " + str(session / "server.log"))
            time.sleep(.05)
        child.terminate()
        child.wait(timeout=3)
        raise InvalidState("Canvas did not become ready. Saved state is unchanged; inspect " + str(session / "server.log"))


def open_receipt(session, record, status):
    state = read_state(session)
    return {"session": str(session), "url": record["url"], "status": status,
            "revision": state["revision"], "nodes": len(state["nodes"])}
