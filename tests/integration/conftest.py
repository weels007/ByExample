"""Session fixtures for the Studionet integration suite.

The registry is deployed once per session and its address is printed as
``[integration] registry 0x...`` so it can be copied into src/lib/genlayer.ts.
"""

import os
from pathlib import Path

import pytest
from gltest import create_accounts, get_contract_factory

from keystore import load_account

CONTRACT_FILE = str(Path(__file__).resolve().parents[2] / "contracts" / "by_example.py")
ADDRESS_FILE = Path(__file__).resolve().parents[2] / "integration-registry.txt"


@pytest.fixture(scope="session")
def owner_account():
    return load_account("KEYSTORE_1", "KEYSTORE_PASSWORD_1")


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
