#!/usr/bin/env python3
"""Build the public, standalone demo from the fictional example."""
import argparse
import json
from pathlib import Path

from render_state import html_document
from state_store import validate


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Check without writing")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    for source, output in (("demo.json", "index.html"), ("career.json", "career.html"),
                           ("workshop-analysis.json", "workshop.html"),
                           ("bookshop-walkthrough.json", "bookshop.html"),
                           ("bookshop-walkthrough-updated.json", "bookshop-updated.html"),
                           (None, "new.html")):
        state = validate(json.loads((root / "examples" / source).read_text(encoding="utf-8"))) if source else None
        expected = html_document(state, offline=True)
        destination = root / "docs" / output
        if args.check:
            if not destination.exists() or destination.read_text(encoding="utf-8") != expected:
                raise SystemExit("Demo is stale. Run python3 scripts/build_demo.py.")
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(expected, encoding="utf-8")
    print("Fictional demos are current." if args.check else "Built fictional demos in docs/.")


if __name__ == "__main__":
    main()
