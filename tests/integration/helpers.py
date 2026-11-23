"""Shared data and helpers for the Studionet integration suite."""

import json

from gltest.assertions import tx_execution_succeeded

# Two public examples that end with a different number of marks, so a rule
# fitted to them cannot be "one trailing mark" — it has to strip them all.
TRAILING_BANGS = [
    {"input": "Hello world!!", "output": "Hello world", "public": True},
    {"input": "Ship it!", "output": "Ship it", "public": True},
    {"input": "Done!!!", "output": "Done", "public": False},
]


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
    receipt = registry.create_spec(args=[title, description, payload]).transact()
    assert tx_execution_succeeded(receipt), describe_failure(receipt)
    number = int(registry.spec_count().call())
    return "spec-" + str(number).zfill(6)
