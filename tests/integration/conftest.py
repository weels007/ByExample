"""Session fixtures for the Studionet integration suite.

The registry is deployed once per session and its address is printed as
``[integration] registry 0x...`` so it can be copied into src/lib/genlayer.ts.
"""

import os
from pathlib import Path

import pytest
from gltest import create_accounts, get_contract_factory, get_default_account
from gltest.assertions import tx_execution_succeeded

from helpers import create_spec, describe_failure
from keystore import load_account

CONTRACT_FILE = str(Path(__file__).resolve().parents[2] / "contracts" / "by_example.py")
ADDRESS_FILE = Path(__file__).resolve().parents[2] / "integration-registry.txt"


@pytest.fixture(scope="session")
def owner_account():
    # A keystore secret wins; without one the suite uses the account the
    # network already configured for itself (Studionet generates one).
    if os.environ.get("KEYSTORE_1", "").strip() != "":
        return load_account("KEYSTORE_1", "KEYSTORE_PASSWORD_1")
    return get_default_account()


@pytest.fixture(scope="session")
def outsider_account(owner_account):
    if os.environ.get("KEYSTORE_2", "").strip() != "":
        return load_account("KEYSTORE_2", "KEYSTORE_PASSWORD_2")
    return create_accounts(1)[0]


@pytest.fixture(scope="session")
def registry(owner_account):
    factory = get_contract_factory(contract_file_path=CONTRACT_FILE)
    contract = factory.deploy(args=[], account=owner_account)
    address = str(contract.address)
    print(f"[integration] registry {address}")
    try:
        ADDRESS_FILE.write_text(address + "\n")
    except OSError:
        pass
    return contract


@pytest.fixture(scope="session")
def evaluated_spec(registry):
    """One spec, evaluated once by a real LLM, shared by the tests that need a rule."""
    if os.environ.get("BYEXAMPLE_LIVE_EVALUATION", "").strip() != "1":
        pytest.skip("set BYEXAMPLE_LIVE_EVALUATION=1 to run a real LLM evaluation")

    spec_id = create_spec(registry, title="Live evaluation")
    receipt = registry.evaluate(args=[spec_id]).transact(
        wait_interval=5000,
        wait_retries=120,
    )
    assert tx_execution_succeeded(receipt), describe_failure(receipt)
    return spec_id
