"""Portable renderers for the same canonical tree used by the canvas."""
import json
import hashlib
import math
import xml.etree.ElementTree as ET
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
PROVENANCE_LABELS = {"observed": "Observed example", "proposed": "Idea", "catalogue": "Catalogue", "context": "Context"}
METHOD_LABELS = {"exploration": "Explore possibilities", "issue": "Issue tree",
                 "hypothesis": "Hypothesis tree", "driver": "Driver tree", "solution": "Solution tree",
                 "objectives": "Objectives hierarchy", "decision": "Decision tree",
                 "opportunity": "Opportunity solution tree", "argument": "Argument pyramid"}
RELATION_LABELS = {"part-of": "Part of parent", "possible-cause": "May explain parent", "calculated-from": "Input to parent",
                   "could-achieve": "Could achieve parent", "refines": "Refines parent", "supports": "Supports parent",
                   "challenges": "Challenges parent", "choice": "Choice for parent", "outcome": "Outcome of parent",
                   "tests": "Tests parent", "idea": "Idea for parent"}


def effective_methods(state):
    """Resolve a method from its nearest explicit ancestor without changing state."""
    nodes = {node["id"]: node for node in state["nodes"]}
    resolved = {}

    def resolve(node):
        ident = node["id"]
        if ident not in resolved:
            resolved[ident] = node.get("method") or (resolve(nodes[node["parentId"]]) if node["parentId"] else None)
        return resolved[ident]

    for node in state["nodes"]:
        resolve(node)
    return resolved


def relation_text(node):
    relation = node.get("relation")
    if not relation:
        return ""
    text = RELATION_LABELS[relation["type"]]
    return text + (" — " + relation["label"] if relation.get("label") else "")


def source_text(source):
    return "\n".join(part for part in (
        source["title"], "Author: " + source["author"] if source.get("author") else "",
        "Provider: " + source["provider"], "URL: " + source["url"],
        "Published: " + source["publishedAt"] if source.get("publishedAt") else "",
        "Checked: " + source["checkedAt"], "Observed: " + source["summary"],
        "Limitations: " + source["limitations"] if source.get("limitations") else "",
        "Verified embed URL: " + source["embedUrl"] if source.get("embedUrl") else "",
    ) if part)


def html_document(state, offline=True, canvas_id=None):
    """Reuse the complete canvas; its boot-data is the only injected content."""
    template = (SKILL / "assets" / "canvas.html").read_text(encoding="utf-8")
    marker = '{"state":null,"offline":true}'
    if template.count(marker) != 1:
        raise ValueError("The canvas bootstrap marker is missing or ambiguous.")
    if canvas_id is None:
        snapshot = json.dumps(state, sort_keys=True, ensure_ascii=False).encode("utf-8")
        canvas_id = "snapshot-" + hashlib.sha256(snapshot).hexdigest()[:32] if state else "blank"
    boot = json.dumps({"state": state, "offline": offline, "canvasId": canvas_id}, ensure_ascii=False).replace("<", "\\u003c")
    return template.replace(marker, boot, 1)


def wrapped(text, maximum=27, maximum_lines=3):
    """Match the canvas's concise card wrapping; full text lives in titles."""
    lines = []
    line = ""
    for word in text.split():
        if len((line + " " + word).strip()) > maximum and line:
            lines.append(line)
            line = ""
        if len(word) > maximum:
            if line:
                lines.append(line)
                line = ""
            lines.extend(word[i:i + maximum] for i in range(0, len(word), maximum))
        else:
            line += (" " if line else "") + word
    if line:
        lines.append(line)
    if len(lines) > maximum_lines:
        lines = lines[:maximum_lines]
        lines[-1] = lines[-1][:maximum - 1] + "…"
    return lines


def full_lines(text, maximum=27):
    lines = []
    for paragraph in text.splitlines() or [""]:
        lines.extend(wrapped(paragraph, maximum, max(1, len(paragraph))) or [""])
    return lines


def tree_layout(state, card_height=102):
    """The canvas layout: 220×102 cards, 280 column pitch, 125 leaf pitch."""
    children = {node["id"]: [] for node in state["nodes"]}
    root = next(node for node in state["nodes"] if node["parentId"] is None)
    for node in state["nodes"]:
        if node["parentId"] is not None:
            children[node["parentId"]].append(node)
    positions = {}
    slot = 0
    max_depth = 0

    def visit(node, depth):
        nonlocal slot, max_depth
        max_depth = max(max_depth, depth)
        kids = children[node["id"]]
        if kids:
            ys = [visit(child, depth + 1) for child in kids]
            y = (ys[0] + ys[-1]) / 2
        else:
            y = slot * (card_height + 23)
            slot += 1
        positions[node["id"]] = {"x": depth * 280, "y": y, "node": node}
        return y

    visit(root, 0)
    return positions, max_depth * 280 + 220, max(1, slot) * (card_height + 23) - 23


def svg_document(state):
    sources = {source["id"]: source for source in state.get("sources", [])}
    methods = effective_methods(state)
    labels = {node["id"]: full_lines(node["label"]) for node in state["nodes"]}
    details = {}
    for node in state["nodes"]:
        lines = []
        if methods[node["id"]]:
            lines += full_lines("Method: " + METHOD_LABELS[methods[node["id"]]], 32)
        if node.get("relation"):
            lines += full_lines("Connection: " + relation_text(node), 32)
        details[node["id"]] = lines
    card_height = max(102, max((74 if details[ident] else 45) + 17 * len(lines) + 12 * len(details[ident])
                               for ident, lines in labels.items()))
    positions, width, height = tree_layout(state, card_height)
    question_lines = full_lines(state["question"], max(1, math.floor(width / 12)))
    heading_lines = full_lines(f'{state["title"]} · revision {state["revision"]} · all branches', max(1, math.floor(width / 7)))
    problem_lines = []
    for field, label in (("situation", "Situation"), ("desiredChange", "Desired change"), ("constraints", "Constraints")):
        if state.get("problem", {}).get(field):
            problem_lines += full_lines(label + ": " + state["problem"][field], max(1, math.floor(width / 7)))
    padding = 45
    meta_y = 40 + 26 * len(question_lines)
    problem_y = meta_y + 15 * len(heading_lines) + 10
    heading = max(105, problem_y + 16 * len(problem_lines))

    def element(tag, attrs=None, text=None, parent=None):
        elem = ET.Element("{" + NS + "}" + tag, {k: str(v) for k, v in (attrs or {}).items()})
        if text is not None:
            elem.text = text
        if parent is not None:
            parent.append(elem)
        return elem

    svg = element("svg", {"width": width + padding * 2, "height": height + heading + padding * 2,
                          "viewBox": f"0 0 {width + padding * 2} {height + heading + padding * 2}",
                          "role": "img", "aria-labelledby": "tree-title tree-description"})
    element("title", {"id": "tree-title"}, state["question"], svg)
    description = state["context"] + "\n" + "\n".join(problem_lines) + "\n" + (state["decision"]["recommendation"] or "No recommendation yet.")
    element("desc", {"id": "tree-description"}, description, svg)
    element("metadata", {"id": "canonical-state"}, json.dumps(state, ensure_ascii=False), svg)
    element("style", text="""text{font-family:'Avenir Next',Avenir,'Segoe UI',sans-serif;fill:#24362f}
.card{fill:#fffefa;stroke:#ccd5c7;stroke-width:1.2}.node-kind{font-size:9px;letter-spacing:1.2px;fill:#778078}
.node-label{font-size:13px;font-weight:500}.status-dot{fill:#b7c0b4}.status-dot.supported{fill:#44836a}
.status-dot.uncertain{fill:#bc9658}.status-dot.ruled-out{fill:#a59b95}.edge{fill:none;stroke:#cbd3c4;stroke-width:1.5}
.node-semantics{font-size:10px;fill:#58685e}.problem-brief{font-size:11px;fill:#58685e}""", parent=svg)
    element("rect", {"width": "100%", "height": "100%", "fill": "#f6f5f0"}, parent=svg)
    title = element("text", {"x": padding, "y": 40, "font-size": 22, "font-family": "Georgia,serif"}, parent=svg)
    for index, line in enumerate(question_lines):
        element("tspan", {"x": padding, "dy": 26 if index else 0}, line, title)
    for index, line in enumerate(heading_lines):
        element("text", {"x": padding, "y": meta_y + index * 15, "font-size": 10}, line, svg)
    for index, line in enumerate(problem_lines):
        element("text", {"class": "problem-brief", "x": padding, "y": problem_y + index * 16}, line, svg)
    group = element("g", {"transform": f"translate({padding} {heading + padding})"}, parent=svg)
    for point in positions.values():
        node = point["node"]
        if node["parentId"] is not None:
            parent = positions[node["parentId"]]
            x1, y1, x2, y2 = parent["x"] + 220, parent["y"] + card_height / 2, point["x"], point["y"] + card_height / 2
            edge = element("path", {"class": "edge", "d": f"M{x1},{y1}C{x1 + 30},{y1} {x2 - 30},{y2} {x2},{y2}"}, parent=group)
            if node.get("relation"):
                element("title", text=relation_text(node), parent=edge)
    for point in positions.values():
        node = point["node"]
        card = element("g", {"class": "tree-node", "data-id": node["id"],
                             "transform": f'translate({point["x"]} {point["y"]})',
                             "aria-label": f'{PROVENANCE_LABELS.get(node.get("provenance"), node["kind"])}; {node["kind"]}: {node["label"]}. {node["status"]}'}, parent=group)
        full_text = node["label"] + ("\nProvenance: " + node["provenance"] if node.get("provenance") else "")
        if methods[node["id"]]:
            full_text += "\nMethod: " + METHOD_LABELS[methods[node["id"]]]
        if node.get("relation"):
            full_text += "\nConnection: " + relation_text(node)
        full_text += "\n" + node["notes"] if node["notes"] else ""
        if node.get("source"):
            full_text += "\nSource: " + node["source"]
        for ident in node.get("sourceIds", []):
            full_text += "\n\nSource [" + ident + "]\n" + source_text(sources[ident])
        element("title", text=full_text, parent=card)
        element("rect", {"class": "card", "width": 220, "height": card_height, "rx": 10}, parent=card)
        element("circle", {"class": "status-dot " + node["status"], "cx": 201, "cy": 20, "r": 3}, parent=card)
        element("text", {"class": "node-kind", "x": 16, "y": 24}, PROVENANCE_LABELS.get(node.get("provenance"), node["kind"]).upper(), card)
        label = element("text", {"class": "node-label", "x": 16, "y": 48}, parent=card)
        for index, line in enumerate(labels[node["id"]]):
            element("tspan", {"x": 16, "dy": 17 if index else 0}, line, label)
        if details[node["id"]]:
            semantics = element("text", {"class": "node-semantics", "x": 16,
                                          "y": 55 + 17 * len(labels[node["id"]])}, parent=card)
            for index, line in enumerate(details[node["id"]]):
                element("tspan", {"x": 16, "dy": 12 if index else 0}, line, semantics)
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(svg, encoding="unicode") + "\n"
