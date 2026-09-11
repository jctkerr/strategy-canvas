#!/usr/bin/env python3
"""Create, read and edit a strategy canvas using the shared local session store."""
import argparse
import copy
import json
import os
import sys
from pathlib import Path

from state_store import (MAX_BYTES, Conflict, InvalidState, atomic_write, read_state,
                         session_lock, update, validate)
from view_store import read_focus

SET_FIELDS = {"title", "question", "context", "nextQuestion", "decision", "sources", "problem", "analysis"}
NODE_FIELDS = {"parentId", "label", "kind", "status", "notes", "source", "sourceIds", "provenance", "method", "relation"}


def read_json(source):
    """Read one bounded JSON input, treating a dash as standard input."""
    if source == "-":
        raw = sys.stdin.buffer.read(MAX_BYTES + 1)
    else:
        with Path(source).expanduser().open("rb") as stream:
            raw = stream.read(MAX_BYTES + 1)
    if not raw or len(raw) > MAX_BYTES:
        raise InvalidState("JSON input is empty or too large.")
    return json.loads(raw.decode("utf-8"))


def question_state(question):
    return validate({
        "schemaVersion": 1, "revision": 1, "title": question, "question": question,
        "context": "", "nextQuestion": "",
        "nodes": [{"id": "root", "parentId": None, "label": question,
                   "kind": "question", "status": "open", "notes": ""}],
        "decision": {"recommendation": "", "rationale": "", "uncertainties": [], "nextSteps": []},
    })


def create_session(session, state):
    """Create only when no canonical state exists, under the runtime's lock."""
    state = copy.deepcopy(validate(state))
    with session_lock(session) as folder:
        if os.path.lexists(folder / "state.json"):
            raise InvalidState("This session already exists. Use show and apply, or choose a new session directory.")
        atomic_write(folder, state)
    return state


def changed_state(current, changes):
    """Apply explicit field edits to a copy, preserving everything unmentioned."""
    if not isinstance(changes, dict) or not changes or set(changes) - {"set", "editNodes", "addNodes"}:
        raise InvalidState("Changes must contain only set, editNodes and addNodes.")
    fields = changes.get("set", {})
    edits = changes.get("editNodes", [])
    additions = changes.get("addNodes", [])
    if not isinstance(fields, dict) or set(fields) - SET_FIELDS:
        raise InvalidState("set accepts editable top-level fields only; nodes, revision and schemaVersion cannot be replaced.")
    if not isinstance(edits, list) or not isinstance(additions, list):
        raise InvalidState("editNodes and addNodes must be arrays.")
    proposed = copy.deepcopy(current)
    proposed.update(copy.deepcopy(fields))
    by_id = {node["id"]: node for node in proposed["nodes"]}
    seen = set()
    for edit in edits:
        if (not isinstance(edit, dict) or "id" not in edit or len(edit) < 2
                or set(edit) - NODE_FIELDS - {"id"}):
            raise InvalidState("Each node edit needs an id and documented fields to change.")
        ident = edit["id"]
        if not isinstance(ident, str) or ident not in by_id:
            raise InvalidState("Every edited id must name an existing node.")
        if ident in seen:
            raise InvalidState("Each node may appear only once in editNodes.")
        seen.add(ident)
        by_id[ident].update(copy.deepcopy(edit))
    for addition in additions:
        if (not isinstance(addition, dict) or not {"id", "parentId", "label", "kind"} <= set(addition)
                or set(addition) - NODE_FIELDS - {"id"}):
            raise InvalidState("Each added node needs id, parentId, label and kind; other fields must match the schema.")
        ident = addition["id"]
        if not isinstance(ident, str) or ident in by_id:
            raise InvalidState("Every added id must be a new, unique node id.")
        node = {"status": "open", "notes": "", **copy.deepcopy(addition)}
        proposed["nodes"].append(node)
        by_id[ident] = node
    validate(proposed)
    if proposed == current:
        raise InvalidState("No changes to save.")
    return proposed


def apply_changes(session, changes, expected):
    if type(expected) is not int or expected < 1:
        raise InvalidState("expectedRevision must be a positive integer.")
    current = read_state(session)
    if current["revision"] != expected:
        raise Conflict(current)
    proposed = changed_state(current, changes)
    # update rereads under the shared lock, catching a browser or CLI save that
    # arrived while the patch was prepared. Never retry a conflict implicitly.
    return update(session, proposed, expected)


def receipt(session, state):
    return {"session": str(session), "revision": state["revision"], "nodes": len(state["nodes"])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=Path, required=True)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("init", help="Create a question-only session or adopt exported JSON; never replace a session")
    inputs = create.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--question", help="Starting question, up to 240 characters")
    inputs.add_argument("--from", dest="source", metavar="JSON", help="Exported state file, or - for stdin")
    commands.add_parser("show", help="Read the full current state, including its revision")
    commands.add_parser("focus", help="Read the recent browser selection and its current branch; never changes the tree")
    apply = commands.add_parser("apply", help="Save a batch of partial edits against a revision you have read")
    apply.add_argument("--expected-revision", type=int, required=True)
    apply.add_argument("--changes", required=True, metavar="JSON", help="Partial changes file, or - for stdin")
    args = parser.parse_args()
    session = args.session.expanduser().resolve()
    try:
        if args.command == "show":
            result = read_state(session)
        elif args.command == "focus":
            result = read_focus(session)
        elif args.command == "init":
            state = read_json(args.source) if args.source is not None else question_state(args.question)
            result = receipt(session, create_session(session, state))
        else:
            result = receipt(session, apply_changes(session, read_json(args.changes), args.expected_revision))
        print(json.dumps(result, ensure_ascii=False))
    except Conflict as error:
        print(json.dumps({"error": str(error), "currentRevision": error.current["revision"]}), file=sys.stderr)
        return 3
    except (InvalidState, ValueError, UnicodeError, OSError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
