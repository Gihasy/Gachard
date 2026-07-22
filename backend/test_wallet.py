from services.wallet_service import generate_custodial_wallet

wallet = generate_custodial_wallet()
print(f"Address: {wallet['address']}")
print(f"Private Key: {wallet['private_key'][:10]}...")
