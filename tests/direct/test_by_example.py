"""Direct-mode tests for contracts/by_example.py.

Run with: pytest tests/direct -v
"""

import json

import pytest

CONTRACT = "contracts/by_example.py"

# A rule that is easy to state: drop the trailing exclamation marks.
TRAILING_BANGS = [
    {"input": "hi!", "output": "hi", "public": True},
    {"input": "ok!", "output": "ok", "public": True},
    {"input": "wait!!", "output": "wait", "public": False},
]

# Same shape, but the rule needs the case-insensitive flag.
HELLO_PREFIX = [
    {"input": "Hello world", "output": "HI world", "public": True},
    {"input": "hello there", "output": "HI there", "public": True},
    {"input": "HeLLo you", "output": "HI you", "public": False},
]

PROMPT_MARKER = r"regular expression"


def cases_json(cases):
    return json.dumps(cases)


def make_cases(count, public_count=2):
    cases = []
    for index in range(count):
        cases.append(
            {
                "input": "line " + str(index) + "!",
                "output": "line " + str(index),
                "public": index < public_count,
            }
        )
    return cases


def deploy(direct_deploy):
    return direct_deploy(CONTRACT)


def mock_rule(direct_vm, pattern, replacement="", flags=""):
    direct_vm.mock_llm(
        PROMPT_MARKER,
        json.dumps({"pattern": pattern, "replacement": replacement, "flags": flags}),
    )


def create(direct_vm, registry, sender, cases=None, title="Trim bangs", description="drop trailing bangs"):
    direct_vm.sender = sender
    return registry.create_spec(title, description, cases_json(cases or TRAILING_BANGS))


# --------------------------------------------------------------------------
# create_spec validation
# --------------------------------------------------------------------------


def test_starts_empty(direct_deploy):
    registry = deploy(direct_deploy)
    assert int(registry.spec_count()) == 0
    assert json.loads(registry.list_specs()) == []


def test_create_spec_returns_sequential_ids(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    first = create(direct_vm, registry, direct_bob)
    second = create(direct_vm, registry, direct_bob)
    assert first == "spec-000001"
    assert second == "spec-000002"
    assert int(registry.spec_count()) == 2


def test_create_spec_stores_the_spec(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    spec = json.loads(registry.get_spec(spec_id))
    assert spec["id"] == spec_id
    assert spec["title"] == "Trim bangs"
    assert spec["description"] == "drop trailing bangs"
    assert spec["evaluated"] is False
    assert spec["creator"].startswith("0x")
    assert len(spec["creator"]) == 42
    assert len(spec["cases"]) == 3
    assert spec["cases"][0] == {"input": "hi!", "output": "hi", "public": True}
    assert spec["cases"][2] == {"input": "wait!!", "output": "wait", "public": False}


def test_create_spec_rejects_empty_title(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("title is required"):
        registry.create_spec("   ", "x", cases_json(TRAILING_BANGS))


def test_create_spec_rejects_long_title(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("at most 80 characters"):
        registry.create_spec("t" * 81, "x", cases_json(TRAILING_BANGS))


def test_create_spec_rejects_long_description(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("at most 400 characters"):
        registry.create_spec("Trim", "d" * 401, cases_json(TRAILING_BANGS))


def test_create_spec_rejects_too_few_cases(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("at least 3 examples"):
        registry.create_spec("Trim", "x", cases_json(TRAILING_BANGS[:2]))


def test_create_spec_rejects_too_many_cases(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("at most 12 examples"):
        registry.create_spec("Trim", "x", cases_json(make_cases(13)))


def test_create_spec_rejects_duplicate_inputs(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    duplicated = [
        {"input": "same!", "output": "same", "public": True},
        {"input": "same!", "output": "same again", "public": True},
        {"input": "other!", "output": "other", "public": False},
    ]
    with direct_vm.expect_revert("share the same input"):
        registry.create_spec("Trim", "x", cases_json(duplicated))


def test_create_spec_rejects_missing_public_examples(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    cases = [
        {"input": "a!", "output": "a", "public": True},
        {"input": "b!", "output": "b", "public": False},
        {"input": "c!", "output": "c", "public": False},
    ]
    with direct_vm.expect_revert("at least 2 examples must be public"):
        registry.create_spec("Trim", "x", cases_json(cases))


def test_create_spec_rejects_missing_private_examples(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    cases = [
        {"input": "a!", "output": "a", "public": True},
        {"input": "b!", "output": "b", "public": True},
        {"input": "c!", "output": "c", "public": True},
    ]
    with direct_vm.expect_revert("at least 1 example must be private"):
        registry.create_spec("Trim", "x", cases_json(cases))


def test_create_spec_rejects_long_case_text(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    cases = [
        {"input": "x" * 301, "output": "x", "public": True},
        {"input": "b!", "output": "b", "public": True},
        {"input": "c!", "output": "c", "public": False},
    ]
    with direct_vm.expect_revert("at most 300 characters"):
        registry.create_spec("Trim", "x", cases_json(cases))


def test_create_spec_rejects_oversized_examples(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    cases = []
    for index in range(7):
        cases.append(
            {
                "input": str(index) + ("a" * 299),
                "output": "b" * 300,
                "public": index < 2,
            }
        )
    with direct_vm.expect_revert("at most 4000 characters"):
        registry.create_spec("Trim", "x", cases_json(cases))


def test_create_spec_rejects_broken_json(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not valid JSON"):
        registry.create_spec("Trim", "x", "[{not json")


def test_create_spec_rejects_non_array_json(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("must be a JSON array"):
        registry.create_spec("Trim", "x", json.dumps({"input": "a", "output": "b"}))


def test_create_spec_rejects_non_bool_public_flag(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    cases = [
        {"input": "a!", "output": "a", "public": 1},
        {"input": "b!", "output": "b", "public": True},
        {"input": "c!", "output": "c", "public": False},
    ]
    with direct_vm.expect_revert("must be true or false"):
        registry.create_spec("Trim", "x", cases_json(cases))


# --------------------------------------------------------------------------
# evaluate
# --------------------------------------------------------------------------


def test_evaluate_is_owner_only(direct_vm, direct_deploy, direct_bob, direct_charlie):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    with direct_vm.prank(direct_charlie):
        with direct_vm.expect_revert("only the creator"):
            registry.evaluate(spec_id)
    assert registry.get_result(spec_id) == ""


def test_evaluate_runs_once(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)
    with direct_vm.expect_revert("already evaluated"):
        registry.evaluate(spec_id)


def test_evaluate_rejects_unknown_spec(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("spec not found"):
        registry.evaluate("spec-999999")


def test_evaluate_stores_the_accepted_rule(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)

    result = json.loads(registry.get_result(spec_id))
    assert result["pattern"] == "!+$"
    assert result["replacement"] == ""
    assert result["flags"] == ""
    assert result["passed"] == [True, True, True]
    assert result["created"] > 0

    spec = json.loads(registry.get_spec(spec_id))
    assert spec["evaluated"] is True


def test_evaluate_keeps_the_flags_of_the_accepted_rule(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob, cases=HELLO_PREFIX)
    mock_rule(direct_vm, "^hello", "HI", "i")
    registry.evaluate(spec_id)

    result = json.loads(registry.get_result(spec_id))
    assert result["pattern"] == "^hello"
    assert result["replacement"] == "HI"
    assert result["flags"] == "i"
    assert registry.apply(spec_id, "hello again") == "HI again"


def test_evaluate_rejects_a_rule_that_fails_a_private_example(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    # "!$" fixes both public examples and leaves "wait!!" as "wait!".
    mock_rule(direct_vm, "!$")
    with direct_vm.expect_revert("evaluation failed"):
        registry.evaluate(spec_id)
    assert registry.get_result(spec_id) == ""
    assert json.loads(registry.get_spec(spec_id))["evaluated"] is False


def test_evaluate_rejects_a_rule_that_does_not_compile(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "([a-z")
    with direct_vm.expect_revert("not a valid regular expression"):
        registry.evaluate(spec_id)
    assert registry.get_result(spec_id) == ""


def test_evaluate_rejects_a_nested_quantifier(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "(.+)+")
    with direct_vm.expect_revert("stacks quantifiers"):
        registry.evaluate(spec_id)
    assert registry.get_result(spec_id) == ""


def test_evaluate_rejects_an_unknown_flag(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$", "", "ix")
    with direct_vm.expect_revert("may only use i, m and s"):
        registry.evaluate(spec_id)


def test_evaluate_rejects_broken_llm_json(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    direct_vm.mock_llm(PROMPT_MARKER, "this is not json at all")
    with direct_vm.expect_revert():
        registry.evaluate(spec_id)
    assert registry.get_result(spec_id) == ""


# --------------------------------------------------------------------------
# the validator
# --------------------------------------------------------------------------


def test_validator_agrees_on_a_rule_that_matches_every_example(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)
    assert direct_vm.run_validator() is True


def test_validator_rejects_a_rule_that_only_matches_public_examples(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)

    public_only = {
        "status": "ok",
        "pattern": "!$",
        "replacement": "",
        "flags": "",
        "passed": [True, True, True],
    }
    assert direct_vm.run_validator(leader_result=public_only) is False


def test_validator_rejects_a_pattern_that_does_not_compile(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)

    broken = {"status": "ok", "pattern": "([a-z", "replacement": "", "flags": "", "passed": [True, True, True]}
    assert direct_vm.run_validator(leader_result=broken) is False


def test_validator_rejects_a_nested_quantifier(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)

    unsafe = {"status": "ok", "pattern": "(.*)*", "replacement": "", "flags": "", "passed": [True, True, True]}
    assert direct_vm.run_validator(leader_result=unsafe) is False


def test_validator_rejects_a_malformed_leader_result(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)
    assert direct_vm.run_validator(leader_result=["not", "a", "proposal"]) is False


def test_validator_agrees_when_its_own_attempt_also_fails(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!$")
    with direct_vm.expect_revert("evaluation failed"):
        registry.evaluate(spec_id)
    # Same mock, so the validator's own attempt fails as well and it agrees.
    assert direct_vm.run_validator() is True


def test_validator_disagrees_when_it_finds_a_rule_the_leader_missed(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!$")
    with direct_vm.expect_revert("evaluation failed"):
        registry.evaluate(spec_id)

    direct_vm.clear_mocks()
    mock_rule(direct_vm, "!+$")
    assert direct_vm.run_validator() is False


# --------------------------------------------------------------------------
# apply
# --------------------------------------------------------------------------


def test_apply_reverts_before_evaluation(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    with direct_vm.expect_revert("has not been evaluated"):
        registry.apply(spec_id, "hello!")


def test_apply_reverts_on_unknown_spec(direct_deploy):
    registry = deploy(direct_deploy)
    with direct_vm.expect_revert("spec not found"):
        registry.apply("spec-999999", "hello!")


def test_apply_returns_the_transformed_text(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)
    assert registry.apply(spec_id, "great!!!") == "great"
    assert registry.apply(spec_id, "no bangs here") == "no bangs here"


# --------------------------------------------------------------------------
# listing and independence
# --------------------------------------------------------------------------


def test_list_specs_returns_newest_first(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    first = create(direct_vm, registry, direct_bob, title="First")
    second = create(direct_vm, registry, direct_bob, title="Second")
    third = create(direct_vm, registry, direct_bob, title="Third")

    summaries = json.loads(registry.list_specs())
    assert [item["id"] for item in summaries] == [third, second, first]
    assert summaries[0]["title"] == "Third"
    assert summaries[0]["case_count"] == 3
    assert summaries[0]["public_count"] == 2
    assert summaries[0]["private_count"] == 1
    assert summaries[0]["evaluated"] is False


def test_list_specs_marks_evaluated_specs(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    spec_id = create(direct_vm, registry, direct_bob)
    mock_rule(direct_vm, "!+$")
    registry.evaluate(spec_id)
    summaries = json.loads(registry.list_specs())
    assert summaries[0]["id"] == spec_id
    assert summaries[0]["evaluated"] is True


def test_specs_are_independent(direct_vm, direct_deploy, direct_bob):
    registry = deploy(direct_deploy)
    first = create(direct_vm, registry, direct_bob, title="First")
    second = create(direct_vm, registry, direct_bob, cases=HELLO_PREFIX, title="Second")

    mock_rule(direct_vm, "!+$")
    registry.evaluate(first)

    assert json.loads(registry.get_result(first))["pattern"] == "!+$"
    assert registry.get_result(second) == ""
    assert json.loads(registry.get_spec(second))["evaluated"] is False
    assert json.loads(registry.get_spec(second))["title"] == "Second"

    direct_vm.clear_mocks()
    mock_rule(direct_vm, "^hello", "HI", "i")
    registry.evaluate(second)
    assert json.loads(registry.get_result(second))["pattern"] == "^hello"
    assert json.loads(registry.get_result(first))["pattern"] == "!+$"
    assert registry.apply(second, "hello again") == "HI again"
    assert registry.apply(first, "again!") == "again"
