"""Analytical draft validation, safe calculations and brief revision regression tests."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import analysis
import state_store


def fixture():
    return json.loads((ROOT / "examples" / "workshop-analysis.json").read_text(encoding="utf-8"))


def input_variable(ident, value):
    return {"id": ident, "label": ident, "unit": "illustrative units", "basis": "Invented test input.",
            "values": value if isinstance(value, dict) else {scenario: value for scenario in analysis.SCENARIOS}}


def formula_variable(ident, formula):
    return {"id": ident, "label": ident, "unit": "illustrative units", "basis": "Test calculation.", "formula": formula}


def model(variables, output="result"):
    return {"id": "test_model", "title": "Fictional calculation test", "variables": variables, "outputId": output}


def state_with_model(value):
    state = fixture()
    state["analysis"] = {"models": [value]}
    return state


class CalculationTests(unittest.TestCase):
    def test_workshop_fixture_results_are_checked_and_inputs_unchanged(self):
        state = state_store.validate(fixture())
        original = copy.deepcopy(state)
        result = analysis.evaluate_model(state["analysis"]["models"][0])
        self.assertEqual(result["modelId"], "workshop")
        self.assertEqual(result["outputId"], "net")
        self.assertEqual(result["scenarios"], ["low", "base", "high"])
        self.assertEqual(result["values"]["net"], {"low": -20, "base": 30, "high": 80})
        self.assertEqual(result["values"]["break_even"], {"low": 12, "base": 8, "high": 6})
        self.assertEqual(result["values"]["contribution"], {"low": 10, "base": 15, "high": 20})
        self.assertTrue(all(error is None for row in result["errors"].values() for error in row.values()))
        self.assertEqual(set(result["values"]), {variable["id"] for variable in state["analysis"]["models"][0]["variables"]})
        self.assertEqual(state, original)

    def test_nested_formulas_resolve_without_requiring_array_order(self):
        value = model([
            formula_variable("result", "ceil((subtotal + floor(x)) / 2)"),
            formula_variable("subtotal", "x * +2 - (-1)"),
            input_variable("x", {"low": -.5, "base": 2.5, "high": 5}),
            formula_variable("decimal", "1e2 + .5 - 2."),
        ])
        state_store.validate(state_with_model(value))
        result = analysis.evaluate_model(value)
        self.assertEqual(result["values"]["result"], {"low": 0, "base": 4, "high": 8})
        self.assertEqual(result["values"]["decimal"]["base"], 98.5)

    def test_missing_input_propagates_only_to_affected_cells(self):
        value = model([
            input_variable("attendance", {"low": 0, "base": None, "high": 10}),
            formula_variable("result", "attendance * 15 - 120"),
            formula_variable("unrelated", "2 + 3"),
        ])
        result = analysis.evaluate_model(value)
        self.assertEqual(result["values"]["result"], {"low": -120, "base": None, "high": 30})
        self.assertIn("Missing input: attendance", result["errors"]["result"]["base"])
        self.assertEqual(result["values"]["unrelated"], {"low": 5, "base": 5, "high": 5})

    def test_missing_names_cycles_and_division_by_zero_are_saveable_errors(self):
        cases = [
            (model([formula_variable("result", "missing + 1")]), "Unknown variable"),
            (model([formula_variable("result", "result + 1")]), "Circular reference"),
            (model([formula_variable("result", "other + 1"), formula_variable("other", "result - 1")]), "Circular reference"),
            (model([formula_variable("result", "10 / 0")]), "Division by zero"),
        ]
        for value, message in cases:
            with self.subTest(message=message, value=value):
                state_store.validate(state_with_model(value))
                result = analysis.evaluate_model(value)
                for scenario in analysis.SCENARIOS:
                    self.assertIsNone(result["values"]["result"][scenario])
                    self.assertIn(message, result["errors"]["result"][scenario])

    def test_zero_denominator_is_local_to_its_scenario(self):
        value = model([input_variable("denominator", {"low": 0, "base": 2, "high": -4}), formula_variable("result", "8 / denominator")])
        result = analysis.evaluate_model(value)
        self.assertEqual(result["values"]["result"], {"low": None, "base": 4, "high": -2})
        self.assertEqual(result["errors"]["result"]["low"], "Division by zero.")
        self.assertIsNone(result["errors"]["result"]["base"])

    def test_arithmetic_overflow_and_nonfinite_literals_are_visible_errors(self):
        for formula in ("1e308 * 1e308", "1e309", "ceil(1e308 * 1e308)"):
            with self.subTest(formula=formula):
                value = model([formula_variable("result", formula)])
                state_store.validate(state_with_model(value))
                result = analysis.evaluate_model(value)
                self.assertIsNone(result["values"]["result"]["base"])
                self.assertIn("finite", result["errors"]["result"]["base"])

    def test_unsupported_and_injection_formulas_never_execute(self):
        formulas = [
            "__import__('os').system('echo unwanted')", "open('/tmp/unwanted','w')", "x.__class__",
            "[x for x in (1,2)]", "lambda: 1", "1 if True else 2", "x[0]", "True", "'text'", "",
            "2 ** 100", "8 // 2", "8 % 3", "abs(-2)", "ceil(1, 2)", "ceil(1,)", "floor(x=2)",
            "0x10", "1_000", "1 # comment", "(1 + 2", "result = 1",
        ]
        with patch("builtins.eval", side_effect=AssertionError("eval must never run")):
            for formula in formulas:
                with self.subTest(formula=formula):
                    value = model([formula_variable("result", formula)])
                    state_store.validate(state_with_model(value))
                    result = analysis.evaluate_model(value)
                    self.assertIsNone(result["values"]["result"]["base"])
                    self.assertTrue(result["errors"]["result"]["base"])

    def test_expression_depth_and_node_bounds_are_enforced(self):
        def balanced(leaves):
            if leaves == 1:
                return "1"
            return "(" + balanced(leaves // 2) + "+" + balanced(leaves - leaves // 2) + ")"
        good = model([formula_variable("result", balanced(100))])  # 199 expression nodes.
        self.assertEqual(analysis.evaluate_model(good)["values"]["result"]["base"], 100)
        good_depth = model([formula_variable("result", "+" * 29 + "1")])
        self.assertEqual(analysis.evaluate_model(good_depth)["values"]["result"]["base"], 1)
        for formula in (balanced(101), "+" * 30 + "1"):
            value = model([formula_variable("result", formula)])
            state_store.validate(state_with_model(value))
            result = analysis.evaluate_model(value)
            self.assertIsNone(result["values"]["result"]["base"])
            self.assertIn("complexity", result["errors"]["result"]["base"])

    def test_maximum_variable_dependency_chain_is_bounded_and_resolvable(self):
        variables = [input_variable("v0", 0)]
        variables.extend(formula_variable("v" + str(index), "v" + str(index - 1) + " + 1") for index in range(1, 100))
        value = model(list(reversed(variables)), "v99")
        state_store.validate(state_with_model(value))
        self.assertEqual(analysis.evaluate_model(value)["values"]["v99"]["base"], 99)
        value["variables"].append(input_variable("excess", 1))
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state_with_model(value))


class AnalysisValidationTests(unittest.TestCase):
    def test_legacy_and_empty_analysis_validate_without_mutation(self):
        state = json.loads((ROOT / "examples" / "demo.json").read_text())
        original = copy.deepcopy(state)
        self.assertEqual(state_store.validate(state), original)
        self.assertNotIn("analysis", state)
        state["analysis"] = {}
        self.assertEqual(state_store.validate(state)["analysis"], {})

    def test_unknown_fields_and_wrong_shapes_are_rejected(self):
        mutations = [
            lambda state: state.update(analysis=None),
            lambda state: state["analysis"].update(reviewed=True),
            lambda state: state["analysis"].update(models={}),
            lambda state: state["analysis"]["models"][0].update(evaluated=True),
            lambda state: state["analysis"]["models"][0]["variables"][0].update(confidence=1),
            lambda state: state["analysis"]["models"][0]["variables"][0]["values"].update(expected=10),
            lambda state: state["analysis"]["workplan"][0].update(approved=True),
            lambda state: state["analysis"]["brief"].update(reviewed=True),
            lambda state: state["analysis"]["brief"]["sections"][0].update(approved=True),
            lambda state: state["analysis"]["brief"]["sections"][0]["modelRefs"][0].update(value=4),
        ]
        for index, mutate in enumerate(mutations):
            with self.subTest(index=index):
                state = fixture()
                mutate(state)
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_inputs_require_exactly_one_mode_and_three_finite_scenario_values(self):
        for bad in (True, "10", float("nan"), float("inf"), -float("inf"), [], 10 ** 400):
            with self.subTest(bad=str(bad)[:40]):
                state = fixture()
                state["analysis"]["models"][0]["variables"][0]["values"]["base"] = bad
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)
        for mode in ("both", "neither", "missing-scenario", "wrong-values"):
            state = fixture()
            variable = state["analysis"]["models"][0]["variables"][0]
            if mode == "both":
                variable["formula"] = "10"
            elif mode == "neither":
                del variable["values"]
            elif mode == "missing-scenario":
                del variable["values"]["base"]
            else:
                variable["values"] = []
            with self.subTest(mode=mode), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)

    def test_identifier_duplicates_and_reserved_variable_names_are_rejected(self):
        for ident in ("has-hyphen", "1first", "x" * 65, "é", "ceil", "floor", "True", "class", "for"):
            state = fixture()
            state["analysis"]["models"][0]["variables"][0]["id"] = ident
            with self.subTest(ident=ident), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)
        for location in ("model", "variable", "workplan", "section", "modelRef"):
            state = fixture()
            container = {"model": state["analysis"]["models"], "variable": state["analysis"]["models"][0]["variables"],
                         "workplan": state["analysis"]["workplan"], "section": state["analysis"]["brief"]["sections"],
                         "modelRef": state["analysis"]["brief"]["sections"][0]["modelRefs"]}[location]
            container.append(copy.deepcopy(container[0]))
            with self.subTest(location=location), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)

    def test_model_and_brief_references_must_name_existing_records(self):
        mutations = [
            lambda state: state["analysis"]["models"][0].update(nodeId="absent"),
            lambda state: state["analysis"]["models"][0].update(outputId="absent"),
            lambda state: state["analysis"]["models"][0]["variables"][0].update(sourceIds=["absent"]),
            lambda state: state["analysis"]["workplan"][0].update(nodeId="absent"),
            lambda state: state["analysis"]["brief"]["sections"][0].update(nodeIds=["absent"]),
            lambda state: state["analysis"]["brief"]["sections"][0].update(sourceIds=["absent"]),
            lambda state: state["analysis"]["brief"]["sections"][0]["modelRefs"][0].update(modelId="absent"),
            lambda state: state["analysis"]["brief"]["sections"][0]["modelRefs"][0].update(variableId="absent"),
            lambda state: state["analysis"]["brief"]["sections"][0]["modelRefs"][0].update(scenario="expected"),
            lambda state: state["analysis"].update(models=[]),
            lambda state: state.update(nodes=[node for node in state["nodes"] if node["id"] != "bookings"]),
        ]
        for index, mutate in enumerate(mutations):
            with self.subTest(index=index):
                state = fixture()
                mutate(state)
                with self.assertRaises(state_store.InvalidState):
                    state_store.validate(state)

    def test_real_source_registry_references_are_preserved(self):
        state = fixture()
        state["sources"] = [{"id": "example_basis", "provider": "web", "url": "https://example.org/fictional",
                             "title": "Illustrative source record", "checkedAt": "2026-09-10", "summary": "A test-only fictional source record, not commercial evidence."}]
        state["analysis"]["models"][0]["variables"][0]["sourceIds"] = ["example_basis"]
        state["analysis"]["brief"]["sections"][0]["sourceIds"] = ["example_basis"]
        original = copy.deepcopy(state)
        self.assertEqual(state_store.validate(state), original)
        state["sources"] = []
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state)

    def test_workplan_blank_owner_date_and_done_do_not_change_tree_status(self):
        state = fixture()
        original_nodes = copy.deepcopy(state["nodes"])
        item = state["analysis"]["workplan"][1]
        item.update(owner="", dueDate="", status="done", finding="No demand evidence was available.")
        state_store.validate(state)
        self.assertEqual(state["nodes"], original_nodes)
        self.assertEqual(next(node for node in state["nodes"] if node["id"] == "demand")["status"], "uncertain")
        for due in ("tomorrow", "2026-02-30", "2026-9-1", None):
            item["dueDate"] = due
            with self.subTest(due=due), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)
        item["dueDate"] = "2026-09-10"
        state_store.validate(state)
        item["status"] = "supported"
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state)

    def test_draft_brief_and_erroring_model_references_are_valid(self):
        state = fixture()
        state["analysis"]["models"][0]["variables"][-2]["formula"] = "unknown_attendance * price"
        state["analysis"]["brief"].update(situation="", complication="", answer="")
        state["analysis"]["brief"]["sections"][0].update(claim="", body="")
        state_store.validate(state)
        result = analysis.evaluate_model(state["analysis"]["models"][0])
        self.assertIsNone(result["values"]["net"]["base"])

    def test_record_counts_and_text_limits(self):
        for field, count in (("models", 21), ("workplan", 101)):
            state = fixture()
            state["analysis"][field] = [dict(copy.deepcopy(state["analysis"][field][0]), id="item_" + str(index)) for index in range(count)]
            with self.subTest(field=field), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)
        state = fixture()
        section = state["analysis"]["brief"]["sections"][0]
        state["analysis"]["brief"]["sections"] = [dict(copy.deepcopy(section), id="section_" + str(index)) for index in range(51)]
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state)
        value = model([formula_variable("result", "1" + " " * 1999)])
        state_store.validate(state_with_model(value))
        self.assertEqual(analysis.evaluate_model(value)["values"]["result"]["base"], 1)
        value["variables"][0]["formula"] += " "
        with self.assertRaises(state_store.InvalidState):
            state_store.validate(state_with_model(value))
        mutations = [
            lambda state: state["analysis"]["models"][0].update(title="x" * 241),
            lambda state: state["analysis"]["models"][0].update(description="x" * 10001),
            lambda state: state["analysis"]["models"][0]["variables"][0].update(unit="x" * 81),
            lambda state: state["analysis"]["models"][0]["variables"][0].update(basis="x" * 10001),
            lambda state: state["analysis"]["workplan"][0].update(owner="x" * 201),
            lambda state: state["analysis"]["workplan"][0].update(finding="x" * 10001),
            lambda state: state["analysis"]["brief"].update(answer="x" * 20001),
            lambda state: state["analysis"]["brief"]["sections"][0].update(claim="x" * 1001),
            lambda state: state["analysis"]["brief"]["sections"][0].update(body="x" * 20001),
        ]
        for index, mutate in enumerate(mutations):
            state = fixture()
            mutate(state)
            with self.subTest(index=index), self.assertRaises(state_store.InvalidState):
                state_store.validate(state)


class BriefFreshnessTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.session = Path(temporary.name) / "session"
        self.initial = state_store.initialise(self.session, ROOT / "examples" / "workshop-analysis.json")

    def test_model_and_workplan_edits_preserve_brief_stamp_and_make_it_stale(self):
        self.assertFalse(analysis.brief_is_stale(self.initial))
        changed = copy.deepcopy(self.initial)
        changed["analysis"]["models"][0]["variables"][0]["values"]["base"] = 11
        after_model = state_store.update(self.session, changed, self.initial["revision"])
        self.assertEqual(after_model["analysis"]["brief"]["basedOnRevision"], 1)
        self.assertTrue(analysis.brief_is_stale(after_model))
        changed = copy.deepcopy(after_model)
        changed["analysis"]["workplan"][1]["status"] = "in-progress"
        after_workplan = state_store.update(self.session, changed, after_model["revision"])
        self.assertEqual(after_workplan["analysis"]["brief"]["basedOnRevision"], 1)
        self.assertTrue(analysis.brief_is_stale(after_workplan))
        self.assertEqual(after_workplan["nodes"], self.initial["nodes"])
        changed = copy.deepcopy(after_workplan)
        changed["analysis"]["brief"]["answer"] = "Explicitly updated draft; demand remains unknown."
        changed["analysis"]["brief"]["basedOnRevision"] = after_workplan["revision"]
        after_brief = state_store.update(self.session, changed, after_workplan["revision"])
        self.assertFalse(analysis.brief_is_stale(after_brief))
        self.assertEqual(after_brief["analysis"]["brief"]["basedOnRevision"] + 1, after_brief["revision"])
        self.assertEqual(state_store.read_state(self.session), after_brief)

    def test_future_or_invalid_brief_stamp_is_rejected_without_changing_disk(self):
        before = (self.session / "state.json").read_bytes()
        for stamp in (0, -1, True, "2", 3):
            proposed = copy.deepcopy(self.initial)
            proposed["analysis"]["brief"]["basedOnRevision"] = stamp
            with self.subTest(stamp=stamp), self.assertRaises(state_store.InvalidState):
                state_store.update(self.session, proposed, self.initial["revision"])
        proposed = copy.deepcopy(self.initial)
        proposed["revision"] = 700
        proposed["analysis"]["brief"]["basedOnRevision"] = 600
        state_store.validate(proposed)  # It still cannot bypass the actual session revision.
        with self.assertRaisesRegex(state_store.InvalidState, "already read"):
            state_store.update(self.session, proposed, self.initial["revision"])
        self.assertEqual((self.session / "state.json").read_bytes(), before)

    def test_no_brief_is_not_reported_as_stale(self):
        state = copy.deepcopy(self.initial)
        state["analysis"].pop("brief")
        self.assertFalse(analysis.brief_is_stale(state))
        state.pop("analysis")
        self.assertFalse(analysis.brief_is_stale(state))


if __name__ == "__main__":
    unittest.main()
