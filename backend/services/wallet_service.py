from web3 import Web3
import os

def generate_custodial_wallet() -> dict:
    """Generate a new Ethereum-compatible wallet for user.
    
    Private key is stored server-side only (ADR-002).
    User never sees wallet address or private key.
    """
    w3 = Web3()
    account = w3.eth.account.create()
    return {
        "address": account.address,
        "private_key": account.key.hex()  # Store securely in production!
    }
