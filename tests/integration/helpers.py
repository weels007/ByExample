"""Shared data and helpers for the Studionet integration suite."""

import json

from gltest.assertions import tx_execution_succeeded
from gltest.clients import get_gl_client

# Studionet rejects a write that arrives without a fee distribution, so every
# deploy and every transact here carries one quoted from the live policy. The
# allocations are the documented starting point; the SDK prices them against
# the network and returns the distribution plus the deposit.
FEE_ESTIMATE_OPTIONS = {
    "leaderTimeunitsAllocation": 100,
    "validatorTimeunitsAllocation": 200,
    "totalMessageFees": 0,
    "rotations": [1],
}

# Two public examples that end with a different number of marks, so a rule
# fitted to them cannot be "one trailing mark" — it has to strip them all.
TRAILING_BANGS = [
    {"input": "Hello world!!", "output": "Hello world", "public": True},
    {"input": "Ship it!", "output": "Ship it", "public": True},
    {"input": "Done!!!", "output": "Done", "public": False},
]


def fee_preset():
    """A fee distribution for one transaction, or None if the SDK cannot quote one.

    genlayer-py 0.16 — the version genlayer-test pins — has no fee estimator,
    while current Studionet refuses a write that carries no distribution. The
    call is skipped rather than raised, so a run still reaches the network and
    reports what the network actually says.
    """
    client = get_gl_client()
    estimate_fees = getattr(client, "estimate_transaction_fees", None)
    if estimate_fees is None:
        return None
    estimate = estimate_fees(FEE_ESTIMATE_OPTIONS)
    if not estimate:
        return None
    return {
        "distribution": estimate["distribution"],
        "feeValue": estimate["feeValue"],
    }


def cases_json(cases):
    return json.dumps(cases)


def describe_failure(receipt):
    """Best effort: put a failed transaction's execution output in the log."""
    try:
        payload = json.dumps(receipt, default=str)
    except Exception:
        payload = str(receipt)
    return payload[:2000]


def create_spec(registry, title, cases=None, description="an integration spec"):
    """Create a spec that must succeed, and return the id the registry gave it."""
    payload = cases_json(TRAILING_BANGS if cases is None else cases)
    receipt = registry.create_spec(
        args=[title, description, payload],
        fees=fee_preset(),
    ).transact()
    assert tx_execution_succeeded(receipt), describe_failure(receipt)
    number = int(registry.spec_count().call())
    return "spec-" + str(number).zfill(6)
