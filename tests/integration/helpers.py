"""Shared data and helpers for the Studionet integration suite."""

import json

from gltest.assertions import tx_execution_succeeded
from gltest.clients import get_gl_client

# Studionet refuses a write that arrives without a fee distribution, so every
# deploy and transact carries one quoted from the live policy. These are the
# documented starting allocations; the SDK prices them against the network and
# returns the distribution plus the deposit.
FEE_ESTIMATE_OPTIONS = {
    "leaderTimeunitsAllocation": 100,
    "validatorTimeunitsAllocation": 200,
}

# Two public examples that end with a different number of marks, so a rule
# fitted to them cannot be "one trailing mark" — it has to strip them all.
TRAILING_BANGS = [
    {"input": "Hello world!!", "output": "Hello world", "public": True},
    {"input": "Ship it!", "output": "Ship it", "public": True},
    {"input": "Done!!!", "output": "Done", "public": False},
]


def fee_preset():
    """A fee distribution and deposit for one transaction, priced right now."""
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


def fee_kwargs():
    """`fees=` when this SDK can quote one, and nothing at all when it cannot."""
    preset = fee_preset()
    return {} if preset is None else {"fees": preset}


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
    receipt = registry.create_spec(args=[title, description, payload]).transact(
        **fee_kwargs(),
    )
    assert tx_execution_succeeded(receipt), describe_failure(receipt)
    number = int(registry.spec_count().call())
    return "spec-" + str(number).zfill(6)
