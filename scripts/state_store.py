"""Validated, atomic strategy session storage; Python standard library only."""
import copy
import fcntl
import json
import os
import re
import tempfile
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlsplit
from analysis import InvalidAnalysis, validate_analysis

KINDS = {"question", "option", "criterion", "evidence", "assumption", "action",
         "hypothesis", "metric", "objective", "solution", "outcome", "test", "chance", "claim"}
METHODS = {"exploration", "issue", "hypothesis", "driver", "solution", "objectives",
           "decision", "opportunity", "argument"}
RELATIONS = {"part-of", "possible-cause", "calculated-from", "could-achieve", "refines",
             "supports", "challenges", "choice", "outcome", "tests", "idea"}
STATUSES = {"open", "supported", "uncertain", "ruled-out"}
PROVENANCE = {"observed", "proposed", "catalogue", "context"}
MAX_BYTES = 2_000_000


class InvalidState(ValueError):
    pass


class Conflict(ValueError):
    def __init__(self, current):
        self.current = current
        super().__init__("The session changed. Read the latest revision before saving.")


def source_url(value, *, linkedin=False, embed=False):
    if not isinstance(value, str) or not value or len(value) > 2048 or re.search(r"[\s\x00-\x1f\x7f\\]", value):
        raise InvalidState("Source URLs must be HTTP(S) URLs of at most 2048 characters.")
    try:
        url = urlsplit(value)
        port = url.port
        if url.scheme not in {"http", "https"} or not url.hostname or url.username or url.password:
            raise ValueError()
        if linkedin and (url.scheme != "https" or not (url.hostname == "linkedin.com" or url.hostname.endswith(".linkedin.com")) or port is not None):
            raise ValueError()
        if embed and (url.hostname != "www.linkedin.com" or url.fragment or
                      not re.fullmatch(r"/embed/feed/update/urn:li:(share|ugcPost|activity):[0-9]{1,30}", url.path) or
                      (url.query and url.query not in {"collapsed=0", "collapsed=1"})):
            raise ValueError()
    except ValueError:
        raise InvalidState("Invalid source URL or unsupported LinkedIn embed URL.") from None


def source_date(value):
    if not isinstance(value, str) or len(value) > 40:
        raise InvalidState("Source dates must be ISO dates or timestamps.")
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            date.fromisoformat(value)
        elif re.match(r"^\d{4}-\d{2}-\d{2}T", value):
            datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            raise ValueError()
    except ValueError:
        raise InvalidState("Source dates must be ISO dates or timestamps.") from None


def validate_sources(sources):
    if not isinstance(sources, list) or len(sources) > 150:
        raise InvalidState("sources must be an array of at most 150 records.")
    by_id = {}
    required = {"id", "provider", "url", "title", "checkedAt", "summary"}
    optional = {"author", "publishedAt", "limitations", "embedUrl"}
    for source in sources:
        if not isinstance(source, dict) or not required <= set(source) or set(source) - required - optional:
            raise InvalidState("Source fields do not match the schema.")
        ident = source["id"]
        if not isinstance(ident, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", ident) or ident in by_id:
            raise InvalidState("Source IDs must be unique IDs of 1–80 letters, digits, underscores or hyphens.")
        if source["provider"] not in ("linkedin", "web"):
            raise InvalidState("Source provider must be linkedin or web.")
        for field, limit in (("title", 500), ("author", 200), ("summary", 10000), ("limitations", 10000)):
            if field in source and (not isinstance(source[field], str) or len(source[field]) > limit or (field in {"title", "summary"} and not source[field].strip())):
                raise InvalidState(f"Source {field} must be text of at most {limit} characters.")
        source_url(source["url"], linkedin=source["provider"] == "linkedin")
        source_date(source["checkedAt"])
        if "publishedAt" in source:
            source_date(source["publishedAt"])
        if "embedUrl" in source:
            if source["provider"] != "linkedin":
                raise InvalidState("Only LinkedIn sources can have a native embed URL.")
            source_url(source["embedUrl"], linkedin=True, embed=True)
        by_id[ident] = source
    return by_id


def validate(state):
    if not isinstance(state, dict):
        raise InvalidState("State must be an object.")
    required = {"schemaVersion", "revision", "title", "question", "context", "nextQuestion", "nodes", "decision"}
    if not required <= set(state) or set(state) - required - {"sources", "problem", "analysis"}:
        raise InvalidState("State must contain only the documented top-level fields.")
    if type(state["schemaVersion"]) is not int or state["schemaVersion"] != 1:
        raise InvalidState("Unsupported schemaVersion; expected 1.")
    if type(state["revision"]) is not int or state["revision"] < 1:
        raise InvalidState("revision must be a positive integer.")
    for field in ("title", "question", "context", "nextQuestion"):
        if not isinstance(state[field], str) or len(state[field]) > 10000:
            raise InvalidState(f"{field} must be text of at most 10000 characters.")
    if not state["question"].strip():
        raise InvalidState("A strategic question is required.")
    if "problem" in state:
        problem = state["problem"]
        if not isinstance(problem, dict) or set(problem) - {"situation", "desiredChange", "constraints"}:
            raise InvalidState("Problem fields do not match the schema.")
        for field, value in problem.items():
            if not isinstance(value, str) or len(value) > 10000:
                raise InvalidState(f"Problem {field} must be text of at most 10000 characters.")
    sources = validate_sources(state.get("sources", []))
    nodes = state["nodes"]
    if not isinstance(nodes, list) or not 1 <= len(nodes) <= 300:
        raise InvalidState("The tree needs between 1 and 300 nodes.")
    by_id = {}
    roots = []
    for node in nodes:
        if not isinstance(node, dict):
            raise InvalidState("Each node must be an object.")
        fields = {"id", "parentId", "label", "kind", "status", "notes"}
        if not fields <= set(node) or set(node) - fields - {"source", "sourceIds", "provenance", "method", "relation"}:
            raise InvalidState("Node fields do not match the schema.")
        ident = node["id"]
        if not isinstance(ident, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", ident):
            raise InvalidState("Node IDs must be 1–80 letters, numbers, underscores or hyphens.")
        if ident in by_id:
            raise InvalidState("Node IDs must be unique.")
        by_id[ident] = node
        if node["parentId"] is None:
            roots.append(ident)
        elif not isinstance(node["parentId"], str):
            raise InvalidState("parentId must be a node ID or null.")
        if not isinstance(node["label"], str) or not node["label"].strip() or len(node["label"]) > 240:
            raise InvalidState("Node labels need 1–240 characters.")
        if not isinstance(node["kind"], str) or node["kind"] not in KINDS:
            raise InvalidState("Unknown node kind.")
        if not isinstance(node["status"], str) or node["status"] not in STATUSES:
            raise InvalidState("Unknown node status.")
        if "method" in node and (not isinstance(node["method"], str) or node["method"] not in METHODS):
            raise InvalidState("Unknown node method.")
        if "relation" in node:
            relation = node["relation"]
            if node["parentId"] is None:
                raise InvalidState("The root cannot have an incoming relation.")
            if not isinstance(relation, dict) or "type" not in relation or set(relation) - {"type", "label"}:
                raise InvalidState("Relation fields do not match the schema.")
            if not isinstance(relation["type"], str) or relation["type"] not in RELATIONS:
                raise InvalidState("Unknown relation type.")
            if "label" in relation and (not isinstance(relation["label"], str) or len(relation["label"]) > 120):
                raise InvalidState("Relation label must be text of at most 120 characters.")
        for field in ("notes", "source"):
            if field in node and (not isinstance(node[field], str) or len(node[field]) > 20000):
                raise InvalidState(f"Node {field} must be text of at most 20000 characters.")
        if "provenance" in node and (not isinstance(node["provenance"], str) or node["provenance"] not in PROVENANCE):
            raise InvalidState("Unknown node provenance.")
        if "sourceIds" in node:
            refs = node["sourceIds"]
            if not isinstance(refs, list) or len(refs) > 20 or any(not isinstance(ref, str) or ref not in sources for ref in refs) or len(set(refs)) != len(refs):
                raise InvalidState("sourceIds must contain at most 20 distinct, existing source IDs.")
    if len(roots) != 1:
        raise InvalidState("Exactly one root is required.")
    for ident, node in by_id.items():
        parent = node["parentId"]
        if parent is not None and parent not in by_id:
            raise InvalidState("Every parentId must name an existing node.")
        seen = {ident}
        while parent is not None:
            if parent in seen:
                raise InvalidState("The tree must not contain cycles.")
            seen.add(parent)
            parent_node = by_id.get(parent)
            if parent_node is None:
                raise InvalidState("Every parentId must name an existing node.")
            parent = parent_node["parentId"]
    decision = state["decision"]
    if not isinstance(decision, dict) or set(decision) != {"recommendation", "rationale", "uncertainties", "nextSteps"}:
        raise InvalidState("Decision fields do not match the schema.")
    for field in ("recommendation", "rationale"):
        if not isinstance(decision[field], str) or len(decision[field]) > 20000:
            raise InvalidState(f"Decision {field} must be text of at most 20000 characters.")
    for field in ("uncertainties", "nextSteps"):
        if not isinstance(decision[field], list) or len(decision[field]) > 100 or any(not isinstance(s, str) or len(s) > 10000 for s in decision[field]):
            raise InvalidState(f"Decision {field} must be an array of short strings.")
    if "analysis" in state:
        try:
            validate_analysis(state["analysis"], set(by_id), set(sources))
        except InvalidAnalysis as error:
            raise InvalidState(str(error)) from None
        brief = state["analysis"].get("brief")
        if brief and brief["basedOnRevision"] > state["revision"]:
            raise InvalidState("Brief basedOnRevision cannot refer to a future session revision.")
    if len(json.dumps(state, ensure_ascii=False).encode("utf-8")) > MAX_BYTES:
        raise InvalidState("The session is too large.")
    return state


@contextmanager
def session_lock(session):
    session = Path(session)
    session.mkdir(parents=True, exist_ok=True)
    with (session / ".state.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            yield session
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def read_state(session):
    return validate(json.loads((Path(session) / "state.json").read_text(encoding="utf-8")))


def atomic_write(session, state):
    fd, name = tempfile.mkstemp(prefix=".state-", suffix=".json", dir=session)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as out:
            json.dump(state, out, ensure_ascii=False, indent=2)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(name, Path(session) / "state.json")
    finally:
        if os.path.exists(name):
            os.unlink(name)


def initialise(session, example):
    with session_lock(session) as folder:
        if not (folder / "state.json").exists():
            state = validate(json.loads(Path(example).read_text(encoding="utf-8")))
            atomic_write(folder, state)
        return read_state(folder)


def update(session, proposed, expected):
    validate(proposed)
    if type(expected) is not int or expected < 1:
        raise InvalidState("expectedRevision must be a positive integer.")
    with session_lock(session) as folder:
        current = read_state(folder)
        if current["revision"] != expected:
            raise Conflict(current)
        brief = proposed.get("analysis", {}).get("brief")
        if brief and brief["basedOnRevision"] > current["revision"]:
            raise InvalidState("Brief basedOnRevision must refer to a revision already read, not a future save.")
        saved = copy.deepcopy(proposed)
        saved["revision"] = current["revision"] + 1
        atomic_write(folder, saved)
        return saved
