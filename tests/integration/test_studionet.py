"""Deploy, ownership and the live evaluation, on Studionet.

Run with:
    gltest --network studionet tests/integration -v
"""

import json

from gltest.assertions import tx_execution_failed

from helpers import TRAILING_BANGS, cases_json, create_spec


def test_deploy_create_and_read(registry):
    assert int(registry.spec_count().call()) >= 0

    spec_id = create_spec(registry, title="Integration trim")
    spec = json.loads(registry.get_spec(args=[spec_id]).call())

    assert spec["id"] == spec_id
    assert spec["title"] == "Integration trim"
    assert spec["evaluated"] is False
    assert spec["creator"].startswith("0x")
    assert len(spec["cases"]) == 3
    assert spec["cases"][2]["public"] is False

    summaries = json.loads(registry.list_specs().call())
    assert any(item["id"] == spec_id for item in summaries)

    # No rule exists yet, so there is nothing to apply.
    assert registry.get_result(args=[spec_id]).call() == ""


def test_outsider_cannot_evaluate(registry, outsider_account):
    spec_id = create_spec(registry, title="Outsider guard")

    outsider = registry.connect(outsider_account)
    receipt = outsider.evaluate(args=[spec_id]).transact()
    assert tx_execution_failed(receipt)

    spec = json.loads(registry.get_spec(args=[spec_id]).call())
    assert spec["evaluated"] is False


def test_invalid_create_reverts_without_storing(registry):
    before = int(registry.spec_count().call())

    too_few = TRAILING_BANGS[:2]
    receipt = registry.create_spec(
        args=["Too few examples", "only two examples", cases_json(too_few)]
    ).transact()
    assert tx_execution_failed(receipt)
    assert int(registry.spec_count().call()) == before

    duplicate = [
        {"input": "same!", "output": "same", "public": True},
        {"input": "same!", "output": "other", "public": True},
        {"input": "third!", "output": "third", "public": False},
    ]
    receipt = registry.create_spec(
        args=["Duplicate inputs", "repeated input", cases_json(duplicate)]
    ).transact()
    assert tx_execution_failed(receipt)
    assert int(registry.spec_count().call()) == before


def test_live_evaluation_end_to_end(registry, evaluated_spec):
    result = json.loads(registry.get_result(args=[evaluated_spec]).call())

    assert isinstance(result["pattern"], str) and len(result["pattern"]) > 0
    assert isinstance(result["replacement"], str)
    assert result["flags"] in ("", "i", "m", "s", "im", "is", "ms", "ims")
    assert result["passed"] == [True, True, True]

    spec = json.loads(registry.get_spec(args=[evaluated_spec]).call())
    assert spec["evaluated"] is True

    # apply() is a free view and replays the accepted rule.
    assert registry.apply(args=[evaluated_spec, "Ship it!!!"]).call() == "Ship it"

    # A spec is evaluated once.
    receipt = registry.evaluate(args=[evaluated_spec]).transact(
        wait_interval=5000,
        wait_retries=60,
    )
    assert tx_execution_failed(receipt)
