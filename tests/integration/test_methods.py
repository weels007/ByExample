"""Every read and write method of the deployed registry, on Studionet."""

import json
import re

import pytest

from helpers import TRAILING_BANGS, create_spec


def test_writes_then_reads_agree(registry):
    before = int(registry.spec_count().call())
    spec_id = create_spec(registry, title="Read back", description="roundtrip")

    assert int(registry.spec_count().call()) == before + 1

    spec = json.loads(registry.get_spec(args=[spec_id]).call())
    assert spec["id"] == spec_id
    assert spec["title"] == "Read back"
    assert spec["description"] == "roundtrip"
    assert spec["cases"] == TRAILING_BANGS
    assert spec["evaluated"] is False

    # get_result stays empty until a rule exists.
    assert registry.get_result(args=[spec_id]).call() == ""

    summaries = json.loads(registry.list_specs().call())
    newest = next(item for item in summaries if item["id"] == spec_id)
    assert newest["title"] == "Read back"
    assert newest["case_count"] == 3
    assert newest["public_count"] == 2
    assert newest["private_count"] == 1
    assert newest["evaluated"] is False


def test_list_specs_is_newest_first_and_bounded(registry):
    summaries = json.loads(registry.list_specs().call())
    assert len(summaries) <= 50

    ids = [item["id"] for item in summaries]
    assert ids == sorted(ids, reverse=True)


def test_reads_revert_on_unknown_ids(registry):
    with pytest.raises(Exception):
        registry.get_spec(args=["spec-999999"]).call()

    with pytest.raises(Exception):
        registry.get_result(args=["spec-999999"]).call()

    with pytest.raises(Exception):
        registry.apply(args=["spec-999999", "hello"]).call()


def test_apply_reverts_before_evaluation(registry):
    spec_id = create_spec(registry, title="Apply before evaluation")

    with pytest.raises(Exception):
        registry.apply(args=[spec_id, "hello!"]).call()


def test_apply_reproduces_every_example(registry, evaluated_spec):
    spec = json.loads(registry.get_spec(args=[evaluated_spec]).call())

    for case in spec["cases"]:
        produced = registry.apply(args=[evaluated_spec, case["input"]]).call()
        assert produced == case["output"], case["input"]


def test_stored_rule_reproduces_every_example_off_chain(registry, evaluated_spec):
    """Anyone can re-run the stored rule and get the same verdict the validators did."""
    spec = json.loads(registry.get_spec(args=[evaluated_spec]).call())
    result = json.loads(registry.get_result(args=[evaluated_spec]).call())

    assert len(result["pattern"]) <= 200
    assert len(result["replacement"]) <= 200
    assert set(result["flags"]) <= {"i", "m", "s"}
    assert result["passed"] == [True] * len(spec["cases"])

    flags = 0
    if "i" in result["flags"]:
        flags |= re.IGNORECASE
    if "m" in result["flags"]:
        flags |= re.MULTILINE
    if "s" in result["flags"]:
        flags |= re.DOTALL

    for case in spec["cases"]:
        produced = re.sub(result["pattern"], result["replacement"], case["input"], flags=flags)
        assert produced == case["output"], case["input"]


def test_apply_refuses_oversized_text(registry, evaluated_spec):
    with pytest.raises(Exception):
        registry.apply(args=[evaluated_spec, "x" * 4001]).call()
