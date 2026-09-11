"""Ephemeral browser selection, kept separate from the canonical strategy tree."""
import hashlib
import json
import os
import re
import tempfile
import time
from pathlib import Path

from render_state import effective_methods
from state_store import InvalidState, read_state, session_lock

VIEW_TTL = 90
MAX_VIEW_BYTES = 50000
FIELDS = {"clientId", "sequence", "selectedNodeId", "focusedNodeId", "editingNodeId",
          "hasUnsavedDraft", "revision"}


def session_canvas_id(session):
    return "session-" + hashlib.sha256(str(Path(session).resolve()).encode()).hexdigest()[:32]


def _read(session):
    path = Path(session) / "view.json"
    if not path.exists():
        return {}
    if path.stat().st_size > MAX_VIEW_BYTES:
        raise InvalidState("Saved view context is too large.")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(value, dict) or any(not isinstance(v, dict) for v in value.values()):
            raise ValueError()
        return value
    except (ValueError, TypeError):
        raise InvalidState("Saved view context could not be read.") from None


def save_view(session, payload):
    if not isinstance(payload, dict) or not FIELDS <= payload.keys() or payload.keys() - FIELDS - {"active"}:
        raise InvalidState("View fields do not match the documented selection context.")
    client = payload["clientId"]
    if not isinstance(client, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", client):
        raise InvalidState("Use a valid view client ID.")
    for key in ("sequence", "revision"):
        if type(payload[key]) is not int or payload[key] < 1:
            raise InvalidState(key + " must be a positive integer.")
    if type(payload["hasUnsavedDraft"]) is not bool or type(payload.get("active", True)) is not bool:
        raise InvalidState("View flags must be booleans.")
    with session_lock(session) as folder:
        state = read_state(folder)
        nodes = {n["id"] for n in state["nodes"]}
        for key in ("selectedNodeId", "focusedNodeId", "editingNodeId"):
            if payload[key] is not None and (not isinstance(payload[key], str) or payload[key] not in nodes):
                raise InvalidState("Selected view nodes must still exist in this session.")
        if payload["revision"] > state["revision"]:
            raise InvalidState("View revision cannot be newer than the session.")
        now = time.time()
        views = _read(folder)
        previous = views.get(client)
        if previous and previous.get("sequence", 0) >= payload["sequence"]:
            return {"ok": True}
        # Bound abandoned browser records; a stale selection is never a live hint.
        views = {key: value for key, value in views.items() if now - value.get("seenAt", 0) <= 3600}
        views[client] = {**payload, "active": payload.get("active", True), "seenAt": now}
        views = dict(sorted(views.items(), key=lambda item: item[1]["seenAt"], reverse=True)[:20])
        fd, name = tempfile.mkstemp(prefix=".view-", suffix=".json", dir=folder)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(views, stream, ensure_ascii=False)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(name, folder / "view.json")
        finally:
            if os.path.exists(name):
                os.unlink(name)
    return {"ok": True}


def read_focus(session):
    with session_lock(session) as folder:
        state = read_state(folder)
        views = _read(folder)
    result = {"status": "missing", "stateRevision": state["revision"], "selection": None}
    if not views:
        return result
    now = time.time()
    nodes = {node["id"]: node for node in state["nodes"]}
    fresh = [v for v in views.values() if v.get("active") and 0 <= now - v.get("seenAt", 0) <= VIEW_TTL
             and v.get("selectedNodeId") in nodes]
    if not fresh:
        return {**result, "status": "stale"}
    choices = {(v["selectedNodeId"], v.get("focusedNodeId")) for v in fresh}
    if len(choices) > 1:
        return {**result, "status": "ambiguous", "candidateNodeIds": sorted({v["selectedNodeId"] for v in fresh})}
    view = max(fresh, key=lambda v: v["seenAt"])
    node = nodes[view["selectedNodeId"]]
    ancestors = []
    parent = node["parentId"]
    while parent is not None:
        ancestors.append(nodes[parent])
        parent = nodes[parent]["parentId"]
    descendants = {node["id"]}
    for _ in range(len(nodes)):
        more = {n["id"] for n in nodes.values() if n["parentId"] in descendants}
        if more <= descendants:
            break
        descendants |= more
    source_ids = set(node.get("sourceIds", []))
    return {**result, "status": "current", "selection": {
        "selectedNodeId": node["id"], "focusedNodeId": view.get("focusedNodeId"),
        "editingNodeId": view.get("editingNodeId"),
        "hasUnsavedDraft": any(v.get("hasUnsavedDraft", False) for v in fresh),
        "observedRevision": view["revision"], "ageSeconds": round(now - view["seenAt"], 2),
        "node": node, "effectiveMethod": effective_methods(state)[node["id"]] or "exploration",
        "ancestors": list(reversed(ancestors)), "descendantNodeIds": sorted(descendants - {node["id"]}),
        "sources": [s for s in state.get("sources", []) if s["id"] in source_ids],
    }}
