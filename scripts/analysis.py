"""Bounded analytical records and an arithmetic interpreter; no eval or network."""
import ast
import keyword
import math
import re
from datetime import date

SCENARIOS = ("low", "base", "high")
MAX_MODELS = 20
MAX_VARIABLES = 100
MAX_FORMULA_LENGTH = 2000
MAX_EXPRESSION_NODES = 200
MAX_EXPRESSION_DEPTH = 30
IDENTIFIER = re.compile(r"[A-Za-z_][A-Za-z0-9_]{0,63}")
FORMULA_TOKEN = re.compile(r"\s+|(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?|[A-Za-z_][A-Za-z0-9_]*|[+*/()-]")
DECIMAL_LITERAL = re.compile(r"(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?")


class InvalidAnalysis(ValueError):
    """The stored structure or its metadata references are invalid."""


class CalculationError(ValueError):
    """A draft formula cannot currently produce a finite result."""


def fields(value, required, optional, label):
    if not isinstance(value, dict) or not required <= set(value) or set(value) - required - optional:
        raise InvalidAnalysis(f"{label} fields do not match the schema.")


def text(value, limit, label, nonblank=False):
    if not isinstance(value, str) or len(value) > limit or (nonblank and not value.strip()):
        raise InvalidAnalysis(f"{label} must be {'non-blank ' if nonblank else ''}text of at most {limit} characters.")


def identifier(value, label, variable=False):
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value) or (variable and (value in {"ceil", "floor"} or keyword.iskeyword(value))):
        raise InvalidAnalysis(f"{label} must be an identifier of 1–64 ASCII letters, digits or underscores, starting with a letter or underscore; variable names ceil, floor and Python keywords are reserved.")


def number(value):
    if type(value) not in {int, float}:
        return False
    try:
        return math.isfinite(float(value))
    except (OverflowError, ValueError):
        return False


def references(value, available, limit, label):
    if (not isinstance(value, list) or len(value) > limit or
            any(not isinstance(ref, str) or ref not in available for ref in value) or len(set(value)) != len(value)):
        raise InvalidAnalysis(f"{label} must contain at most {limit} distinct, existing IDs.")


def validate_models(models, node_ids, source_ids):
    if not isinstance(models, list) or len(models) > MAX_MODELS:
        raise InvalidAnalysis(f"analysis.models must be an array of at most {MAX_MODELS} models.")
    by_id = {}
    for model in models:
        fields(model, {"id", "title", "variables", "outputId"}, {"nodeId", "description"}, "Model")
        identifier(model["id"], "Model id")
        if model["id"] in by_id:
            raise InvalidAnalysis("Model IDs must be unique.")
        text(model["title"], 240, "Model title", True)
        if "description" in model:
            text(model["description"], 10000, "Model description")
        if "nodeId" in model and (not isinstance(model["nodeId"], str) or model["nodeId"] not in node_ids):
            raise InvalidAnalysis("Model nodeId must name an existing tree node.")
        variables = model["variables"]
        if not isinstance(variables, list) or not 1 <= len(variables) <= MAX_VARIABLES:
            raise InvalidAnalysis(f"Each model requires 1–{MAX_VARIABLES} variables.")
        variable_ids = set()
        for variable in variables:
            fields(variable, {"id", "label", "unit", "basis"}, {"sourceIds", "values", "formula"}, "Variable")
            identifier(variable["id"], "Variable id", variable=True)
            if variable["id"] in variable_ids:
                raise InvalidAnalysis("Variable IDs must be unique within their model.")
            variable_ids.add(variable["id"])
            text(variable["label"], 240, "Variable label", True)
            text(variable["unit"], 80, "Variable unit")
            text(variable["basis"], 10000, "Variable basis")
            if "sourceIds" in variable:
                references(variable["sourceIds"], source_ids, 20, "Variable sourceIds")
            if ("values" in variable) == ("formula" in variable):
                raise InvalidAnalysis("A variable requires exactly one of values or formula.")
            if "values" in variable:
                fields(variable["values"], set(SCENARIOS), set(), "Variable values")
                if any(value is not None and not number(value) for value in variable["values"].values()):
                    raise InvalidAnalysis("Scenario inputs must be finite numbers or null; booleans are not numbers.")
            else:
                text(variable["formula"], MAX_FORMULA_LENGTH, "Variable formula")
        if not isinstance(model["outputId"], str) or model["outputId"] not in variable_ids:
            raise InvalidAnalysis("Model outputId must name one of its variables.")
        by_id[model["id"]] = {variable["id"] for variable in variables}
    return by_id


def validate_workplan(workplan, node_ids):
    if not isinstance(workplan, list) or len(workplan) > 100:
        raise InvalidAnalysis("analysis.workplan must be an array of at most 100 items.")
    ids = set()
    required = {"id", "nodeId", "title", "analysis", "evidenceNeeded", "source", "priorityReason", "owner", "dueDate", "status", "finding", "limitations"}
    for item in workplan:
        fields(item, required, set(), "Workplan item")
        identifier(item["id"], "Workplan id")
        if item["id"] in ids:
            raise InvalidAnalysis("Workplan IDs must be unique.")
        ids.add(item["id"])
        if not isinstance(item["nodeId"], str) or item["nodeId"] not in node_ids:
            raise InvalidAnalysis("Workplan nodeId must name an existing tree node.")
        text(item["title"], 240, "Workplan title", True)
        for field in ("analysis", "evidenceNeeded", "source", "priorityReason", "finding", "limitations"):
            text(item[field], 10000, "Workplan " + field)
        text(item["owner"], 200, "Workplan owner")
        text(item["dueDate"], 10, "Workplan dueDate")
        if item["dueDate"]:
            try:
                if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", item["dueDate"]):
                    raise ValueError()
                date.fromisoformat(item["dueDate"])
            except ValueError:
                raise InvalidAnalysis("Workplan dueDate must be empty or a valid YYYY-MM-DD date.") from None
        if item["status"] not in ("open", "in-progress", "done"):
            raise InvalidAnalysis("Workplan status must be open, in-progress or done.")


def validate_brief(brief, node_ids, source_ids, models):
    fields(brief, {"situation", "complication", "answer", "sections", "basedOnRevision"}, set(), "Brief")
    for field in ("situation", "complication", "answer"):
        text(brief[field], 20000, "Brief " + field)
    if type(brief["basedOnRevision"]) is not int or brief["basedOnRevision"] < 1:
        raise InvalidAnalysis("Brief basedOnRevision must be a positive integer.")
    if not isinstance(brief["sections"], list) or len(brief["sections"]) > 50:
        raise InvalidAnalysis("Brief sections must be an array of at most 50 sections.")
    ids = set()
    for section in brief["sections"]:
        fields(section, {"id", "claim", "body", "nodeIds", "sourceIds", "modelRefs"}, set(), "Brief section")
        identifier(section["id"], "Brief section id")
        if section["id"] in ids:
            raise InvalidAnalysis("Brief section IDs must be unique.")
        ids.add(section["id"])
        text(section["claim"], 1000, "Brief section claim")
        text(section["body"], 20000, "Brief section body")
        references(section["nodeIds"], node_ids, 50, "Brief section nodeIds")
        references(section["sourceIds"], source_ids, 20, "Brief section sourceIds")
        if not isinstance(section["modelRefs"], list) or len(section["modelRefs"]) > 50:
            raise InvalidAnalysis("Brief modelRefs must be an array of at most 50 references.")
        seen = set()
        for ref in section["modelRefs"]:
            fields(ref, {"modelId", "variableId", "scenario"}, set(), "Brief model reference")
            model_id, variable_id, scenario = ref["modelId"], ref["variableId"], ref["scenario"]
            if (not isinstance(model_id, str) or model_id not in models or
                    not isinstance(variable_id, str) or variable_id not in models[model_id] or scenario not in SCENARIOS):
                raise InvalidAnalysis("Brief model reference must name an existing model, variable and low/base/high scenario.")
            key = (model_id, variable_id, scenario)
            if key in seen:
                raise InvalidAnalysis("Brief model references must be distinct within each section.")
            seen.add(key)


def validate_analysis(analysis, node_ids, source_ids):
    """Validate storage and metadata references without certifying calculations."""
    fields(analysis, set(), {"models", "workplan", "brief"}, "Analysis")
    models = validate_models(analysis.get("models", []), node_ids, source_ids)
    if "workplan" in analysis:
        validate_workplan(analysis["workplan"], node_ids)
    if "brief" in analysis:
        validate_brief(analysis["brief"], node_ids, source_ids, models)
    return analysis


def parse_formula(formula):
    """Allow only arithmetic expression nodes, with bounded size and depth."""
    if not isinstance(formula, str) or len(formula) > MAX_FORMULA_LENGTH:
        raise CalculationError("Formula exceeds the 2000-character limit.")
    cursor = 0
    tokens = []
    while cursor < len(formula):
        token = FORMULA_TOKEN.match(formula, cursor)
        if token is None:
            raise CalculationError("Unsupported formula; use arithmetic, names, ceil or floor only.")
        tokens.append(" " if token.group().isspace() else token.group())
        cursor = token.end()
    normalized = "".join(tokens).strip()
    try:
        tree = ast.parse(normalized, mode="eval").body
    except (SyntaxError, ValueError, RecursionError):
        raise CalculationError("Invalid formula syntax.") from None
    stack, dependencies, count = [(tree, 1)], [], 0
    while stack:
        node, depth = stack.pop()
        count += 1
        if count > MAX_EXPRESSION_NODES or depth > MAX_EXPRESSION_DEPTH:
            raise CalculationError("Formula exceeds the calculation complexity limit.")
        if isinstance(node, ast.Constant) and type(node.value) in {int, float}:
            if not DECIMAL_LITERAL.fullmatch(ast.get_source_segment(normalized, node) or ""):
                raise CalculationError("Use decimal numeric literals without separators.")
            if not number(node.value):
                raise CalculationError("Non-finite numeric literal.")
            children = []
        elif isinstance(node, ast.Name):
            if not IDENTIFIER.fullmatch(node.id):
                raise CalculationError("Unsupported variable name.")
            if node.id not in dependencies:
                dependencies.append(node.id)
            children = []
        elif isinstance(node, ast.BinOp) and type(node.op) in {ast.Add, ast.Sub, ast.Mult, ast.Div}:
            children = [node.left, node.right]
        elif isinstance(node, ast.UnaryOp) and type(node.op) in {ast.UAdd, ast.USub}:
            children = [node.operand]
        elif (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"ceil", "floor"}
              and len(node.args) == 1 and not node.keywords):
            children = node.args
        else:
            raise CalculationError("Unsupported formula; use arithmetic, names, ceil or floor only.")
        stack.extend((child, depth + 1) for child in reversed(children))
    return tree, dependencies


def expression_value(node, values):
    if isinstance(node, ast.Constant):
        value = float(node.value)
    elif isinstance(node, ast.Name):
        value = values[node.id]
    elif isinstance(node, ast.UnaryOp):
        operand = expression_value(node.operand, values)
        value = -operand if isinstance(node.op, ast.USub) else operand
    elif isinstance(node, ast.Call):
        operand = expression_value(node.args[0], values)
        value = float(math.ceil(operand) if node.func.id == "ceil" else math.floor(operand))
    else:
        left, right = expression_value(node.left, values), expression_value(node.right, values)
        if isinstance(node.op, ast.Add):
            value = left + right
        elif isinstance(node.op, ast.Sub):
            value = left - right
        elif isinstance(node.op, ast.Mult):
            value = left * right
        else:
            if right == 0:
                raise CalculationError("Division by zero.")
            value = left / right
    if not math.isfinite(value):
        raise CalculationError("Non-finite calculation result.")
    return value


def evaluate_model(model):
    """Evaluate a schema-valid model without mutating it.

    Return {modelId, outputId, scenarios, values, errors}. values and errors map
    every variable ID to {low, base, high}; each cell has a finite number with a
    null error, or a null value with a visible error string. No missing input is
    treated as zero. Formula errors remain saveable analytical drafts.
    """
    variables = model["variables"]
    if not isinstance(variables, list) or not 1 <= len(variables) <= MAX_VARIABLES:
        raise InvalidAnalysis("Evaluate a validated model with 1–100 variables.")
    by_id = {variable["id"]: variable for variable in variables}
    prepared = {}
    for variable in variables:
        if "formula" in variable:
            try:
                prepared[variable["id"]] = parse_formula(variable["formula"])
            except CalculationError as error:
                prepared[variable["id"]] = str(error)
    values = {ident: dict.fromkeys(SCENARIOS) for ident in by_id}
    errors = {ident: dict.fromkeys(SCENARIOS) for ident in by_id}
    for scenario in SCENARIOS:
        progress = {}

        def resolve(ident):
            if ident not in by_id:
                raise CalculationError("Unknown variable: " + ident + ".")
            if progress.get(ident) == "visiting":
                raise CalculationError("Circular reference involving: " + ident + ".")
            if progress.get(ident) == "done":
                if errors[ident][scenario]:
                    raise CalculationError(errors[ident][scenario])
                return values[ident][scenario]
            progress[ident] = "visiting"
            try:
                variable = by_id[ident]
                if "values" in variable:
                    value = variable["values"][scenario]
                    if value is None:
                        raise CalculationError("Missing input: " + ident + " (" + scenario + ").")
                    if not number(value):
                        raise CalculationError("Input is not a finite number: " + ident + ".")
                    value = float(value)
                else:
                    expression = prepared[ident]
                    if isinstance(expression, str):
                        raise CalculationError(expression)
                    tree, dependencies = expression
                    resolved = {dependency: resolve(dependency) for dependency in dependencies}
                    value = expression_value(tree, resolved)
                values[ident][scenario] = value
            except (CalculationError, OverflowError, RecursionError) as error:
                errors[ident][scenario] = str(error) if isinstance(error, CalculationError) else "Calculation exceeds numeric or depth limits."
            progress[ident] = "done"
            if errors[ident][scenario]:
                raise CalculationError(errors[ident][scenario])
            return values[ident][scenario]

        for ident in by_id:
            try:
                resolve(ident)
            except CalculationError:
                pass
    return {"modelId": model["id"], "outputId": model["outputId"], "scenarios": list(SCENARIOS),
            "values": values, "errors": errors}


def brief_is_stale(state):
    """Revision freshness only; this does not certify the brief's reasoning."""
    brief = state.get("analysis", {}).get("brief")
    return brief is not None and state["revision"] > brief["basedOnRevision"] + 1
