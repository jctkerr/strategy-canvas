#!/usr/bin/env python3
"""Serve one strategy canvas session on loopback only."""
import argparse
import errno
import json
import os
import threading
import uuid
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

from loopback_server import LoopbackHTTPServer
from render_state import html_document
from export_brief import pptx_document
from state_store import Conflict, InvalidState, MAX_BYTES, initialise, read_state, update
from view_store import MAX_VIEW_BYTES, read_focus, save_view, session_canvas_id
from session_server import claim_server, runtime_id, write_receipt

SKILL = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=Path, required=True)
    parser.add_argument("--port", type=int, default=8765, help="0 chooses an available port")
    parser.add_argument("--existing", action="store_true", help="Require saved state; never initialise a demo")
    parser.add_argument("--fallback-port", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    args.session = args.session.expanduser().resolve()
    if args.existing:
        read_state(args.session)
    else:
        initialise(args.session, SKILL / "examples" / "demo.json")
    owner = claim_server(args.session)
    identity = {"protocol": 1, "sessionId": session_canvas_id(args.session),
                "instanceId": uuid.uuid4().hex, "runtimeId": runtime_id(), "pid": os.getpid()}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *items):
            if items and str(items[1] if len(items) > 1 else "") not in {"200", "204"}:
                super().log_message(fmt, *items)

        def reply(self, code, body, mime="application/json; charset=utf-8"):
            data = body.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(data)

        def json_reply(self, code, obj):
            self.reply(code, json.dumps(obj, ensure_ascii=False))

        def local_request(self):
            expected = f"127.0.0.1:{self.server.server_port}"
            if self.headers.get("Host") != expected:
                self.json_reply(403, {"error": "Use the printed loopback URL."})
                return False
            origin = self.headers.get("Origin")
            if origin is not None and origin != "http://" + expected:
                self.json_reply(403, {"error": "Cross-origin requests are not allowed."})
                return False
            return True

        def do_GET(self):
            if not self.local_request():
                return
            path = urlparse(self.path).path
            try:
                if path == "/api/state":
                    self.json_reply(200, read_state(args.session))
                elif path == "/api/server-info":
                    self.json_reply(200, identity)
                elif path == "/api/view":
                    self.json_reply(200, read_focus(args.session))
                elif path == "/api/export/pptx":
                    try:
                        data = pptx_document(read_state(args.session))
                    except InvalidState as error:
                        self.json_reply(400, {"error": str(error)})
                        return
                    self.send_response(200)
                    self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation")
                    self.send_header("Content-Disposition", 'attachment; filename="strategy-brief.pptx"')
                    self.send_header("Content-Length", str(len(data)))
                    self.send_header("Cache-Control", "no-store")
                    self.send_header("X-Content-Type-Options", "nosniff")
                    self.end_headers()
                    self.wfile.write(data)
                elif path in {"/", "/index.html"}:
                    template = html_document(read_state(args.session), offline=False,
                                             canvas_id=session_canvas_id(args.session))
                    self.reply(200, template, "text/html; charset=utf-8")
                elif path == "/new.html":
                    # A separate portable canvas never replaces the live session.
                    self.reply(200, html_document(None, offline=True), "text/html; charset=utf-8")
                elif path == "/favicon.ico":
                    self.reply(204, "")
                else:
                    self.json_reply(404, {"error": "Not found."})
            except (InvalidState, ValueError, OSError) as error:
                self.json_reply(500, {"error": str(error)})

        def do_PUT(self):
            if not self.local_request():
                return
            if urlparse(self.path).path != "/api/state":
                self.json_reply(404, {"error": "Not found."})
                return
            if self.headers.get_content_type() != "application/json":
                self.json_reply(415, {"error": "Use application/json."})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= MAX_BYTES:
                    self.json_reply(413, {"error": "Request is empty or too large."})
                    return
                payload = json.loads(self.rfile.read(size))
                if not isinstance(payload, dict) or set(payload) != {"expectedRevision", "state"}:
                    raise InvalidState("Expected {expectedRevision, state}.")
                self.json_reply(200, update(args.session, payload["state"], payload["expectedRevision"]))
            except Conflict as error:
                self.json_reply(409, {"error": str(error), "current": error.current})
            except (InvalidState, ValueError, UnicodeError) as error:
                self.json_reply(400, {"error": str(error)})
            except OSError as error:
                self.json_reply(500, {"error": str(error)})

        def do_POST(self):
            if not self.local_request():
                return
            if urlparse(self.path).path == "/api/server/stop":
                try:
                    size = int(self.headers.get("Content-Length", "0"))
                    if self.headers.get_content_type() != "application/json" or not 0 < size <= 200:
                        raise ValueError()
                    if json.loads(self.rfile.read(size)) != {"instanceId": identity["instanceId"]}:
                        raise ValueError()
                except (ValueError, UnicodeError):
                    self.json_reply(403, {"error": "Server identity did not match."})
                    return
                self.json_reply(200, {"stopping": True})
                threading.Thread(target=self.server.shutdown, daemon=True).start()
                return
            if urlparse(self.path).path != "/api/view":
                self.json_reply(404, {"error": "Not found."})
                return
            if self.headers.get_content_type() != "application/json":
                self.json_reply(415, {"error": "Use application/json."})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= MAX_VIEW_BYTES:
                    self.json_reply(413, {"error": "View request is empty or too large."})
                    return
                self.json_reply(200, save_view(args.session, json.loads(self.rfile.read(size))))
            except (InvalidState, ValueError, UnicodeError) as error:
                self.json_reply(400, {"error": str(error)})
            except OSError as error:
                self.json_reply(500, {"error": str(error)})

    try:
        server = LoopbackHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError as error:
        if not args.fallback_port or error.errno != errno.EADDRINUSE:
            owner.close()
            raise
        server = LoopbackHTTPServer(("127.0.0.1", 0), Handler)
    write_receipt(args.session, {**identity, "url": f"http://127.0.0.1:{server.server_port}"})
    print(f"Strategy Tree ready: http://127.0.0.1:{server.server_port}", flush=True)
    print(f"Session: {args.session}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        # Keep the last address for reopening; callers must still verify identity.
        owner.close()


if __name__ == "__main__":
    main()
