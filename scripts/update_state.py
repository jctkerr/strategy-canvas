#!/usr/bin/env python3
"""Validate and atomically replace a session state with revision checking."""
import argparse
import json
import sys
from pathlib import Path

from state_store import Conflict, InvalidState, update


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--session", type=Path, required=True)
    parser.add_argument("--state", type=Path, required=True, help="Proposed complete JSON state")
    parser.add_argument("--expected-revision", type=int, required=True)
    args = parser.parse_args()
    try:
        proposed = json.loads(args.state.read_text(encoding="utf-8"))
        saved = update(args.session, proposed, args.expected_revision)
        print(json.dumps({"revision": saved["revision"], "nodes": len(saved["nodes"])}))
    except Conflict as error:
        print(json.dumps({"error": str(error), "currentRevision": error.current["revision"]}), file=sys.stderr)
        sys.exit(3)
    except (InvalidState, ValueError, OSError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
