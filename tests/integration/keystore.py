"""Load the Studionet wallet used by the integration suite.

The CI secrets hold either a Web3 keystore JSON (optionally base64 encoded,
the way GitHub secrets usually carry multi-line JSON) or a raw private key.
"""

import base64
import json
import os

from eth_account import Account
from gltest import create_account


def _as_private_key_hex(value) -> str:
    if isinstance(value, (bytes, bytearray)):
        return "0x" + bytes(value).hex()
    text = str(value).strip()
    if not text.startswith("0x"):
        text = "0x" + text
    return text


def _decode_base64_json(text: str) -> str:
    try:
        decoded = base64.b64decode(text, validate=False).decode("utf-8").strip()
    except Exception:
        return ""
    if decoded.startswith("{"):
        return decoded
    return ""


def load_account(keystore_env: str, password_env: str):
    """Return a LocalAccount for the keystore (or private key) in the environment."""
    raw = os.environ.get(keystore_env, "").strip()
    if raw == "":
        raise RuntimeError(f"{keystore_env} is not set")

    password = os.environ.get(password_env, "")

    text = raw
    if not text.startswith("{"):
        text = _decode_base64_json(text)

    if text.startswith("{"):
        keystore = json.loads(text)
        private_key = Account.decrypt(keystore, password)
        return create_account(_as_private_key_hex(private_key))

    # Not a keystore: treat the secret itself as a raw private key.
    return create_account(_as_private_key_hex(raw))
