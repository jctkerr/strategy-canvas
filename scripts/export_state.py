#!/usr/bin/env python3
"""Save a canonical session as a populated HTML tree, SVG tree and JSON."""
import argparse
import hashlib
import json
import os
import sys
import tempfile
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

from loopback_server import LoopbackHTTPServer
from render_state import html_document, svg_document
from state_store import InvalidState, read_state, session_lock


def write_output(path, data):
    fd, temporary = tempfile.mkstemp(prefix=".export-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def export_session(session, stem):
    session = Path(session).expanduser().resolve()
    stem = Path(stem).expanduser().resolve()
    files = {ext: stem.parent / (stem.name + "." + ext) for ext in ("html", "svg", "json")}
    canonical = (session / "state.json").resolve()
    if any(path.resolve() == canonical for path in files.values()):
        raise InvalidState("Export would overwrite the session state. Choose a separate output folder or stem.")
    with session_lock(session):
        state = read_state(session)
    identity = json.dumps(state, sort_keys=True, ensure_ascii=False) + "\n" + str(stem)
    canvas_id = "snapshot-" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:32]
    outputs = {"html": html_document(state, offline=True, canvas_id=canvas_id), "svg": svg_document(state),
               "json": json.dumps(state, ensure_ascii=False, indent=2) + "\n"}
    stem.parent.mkdir(parents=True, exist_ok=True)
    for ext, contents in outputs.items():
        write_output(files[ext], contents)
    return state, files


def preview(files, port):
    routes = {"/": (files["html"], "text/html; charset=utf-8"),
              "/tree.svg": (files["svg"], "image/svg+xml; charset=utf-8"),
              "/state.json": (files["json"], "application/json; charset=utf-8")}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def do_GET(self):
            expected = f"127.0.0.1:{self.server.server_port}"
            if self.headers.get("Host") != expected:
                self.send_error(403, "Use the printed loopback URL.")
                return
            path = urlparse(self.path).path
            if path == "/favicon.ico":
                self.send_response(204)
                self.end_headers()
                return
            if path not in routes:
                self.send_error(404)
                return
            file, mime = routes[path]
            try:
                data = file.read_bytes()
            except OSError:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(data)

    server = LoopbackHTTPServer(("127.0.0.1", port), Handler)
    print(f"Saved tree preview: http://127.0.0.1:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="Output stem, without an extension")
    parser.add_argument("--serve", action="store_true", help="Preview only the three exported files on loopback")
    parser.add_argument("--port", type=int, default=0, help="Preview port; 0 selects an available port")
    args = parser.parse_args()
    try:
        state, files = export_session(args.session.expanduser().resolve(), args.output)
        print(json.dumps({"revision": state["revision"], "nodes": len(state["nodes"]),
                          "files": {ext: str(path) for ext, path in files.items()}}, ensure_ascii=False), flush=True)
        if args.serve:
            preview(files, args.port)
    except (InvalidState, ValueError, OSError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
