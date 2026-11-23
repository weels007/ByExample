"""Studionet integration tests for the ByExample registry.

Run with:
    gltest --network studionet tests/integration -v

The live evaluation test costs a real LLM round trip and is opt-in:
    BYEXAMPLE_LIVE_EVALUATION=1 gltest --network studionet tests/integration -v
"""

import json
import os

import pytest
from gltest.assertions import tx_execution_failed, tx_execution_succeeded

TRAILING_BANGS = [
    {"input": "Hello world!!", "output": "Hello world", "public": True},
    {"input": "Ship it!", "output": "Ship it", "public": True},
    {"input": "Done!!!", "output": "Done", "public": False},
]


def describe_failure(receipt):
    """Best effort: put a failed transaction's execution output in the log."""
    try:
        payload = json.dumps(receipt, default=str)
    except Exception:
        payload = str(receipt)
    return payload[:2000]


def cases_json(cases):
    return json.dumps(cases)


def create_spec(registry, title="Trim bangs"):
    receipt = registry.create_spec(
        args=[title, "drop trailing exclamation marks", cases_json(TRAILING_BANGS)]
    ).transact()
    assert tx_execution_succeeded(receipt)
    number = int(registry.spec_count().call())
    return "spec-" + str(number).zfill(6)


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

    # Nothing to apply yet: the rule only exists after evaluate().
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


@pytest.mark.skipif(
    os.environ.get("BYEXAMPLE_LIVE_EVALUATION", "") != "1",
    reason="set BYEXAMPLE_LIVE_EVALUATION=1 to run a real LLM evaluation",
)
def test_live_evaluation_end_to_end(registry):
    spec_id = create_spec(registry, title="Live evaluation")

    receipt = registry.evaluate(args=[spec_id]).transact(
        wait_interval=5000,
        wait_retries=120,
    )
    assert tx_execution_succeeded(receipt), describe_failure(receipt)

    result = json.loads(registry.get_result(args=[spec_id]).call())
    assert isinstance(result["pattern"], str) and len(result["pattern"]) > 0
    assert isinstance(result["replacement"], str)
    assert result["flags"] in ("", "i", "m", "s", "im", "is", "ms", "ims")
    assert result["passed"] == [True, True, True]

    spec = json.loads(registry.get_spec(args=[spec_id]).call())
    assert spec["evaluated"] is True

    # apply() is a free view and replays the accepted rule.
    applied = registry.apply(args=[spec_id, "Ship it!!!"]).call()
    assert applied == "Ship it"

    # A spec is evaluated once.
    receipt = registry.evaluate(args=[spec_id]).transact(
        wait_interval=5000,
        wait_retries=60,
    )
    assert tx_execution_failed(receipt), describe_failure(receipt)
