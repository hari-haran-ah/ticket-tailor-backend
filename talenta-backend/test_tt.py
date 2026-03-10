import asyncio
import sys
import pprint

sys.path.append(".")
from api.tickettailor import _tt_get
from db.session import get_db
from models.client import Client

async def test():
    db = next(get_db())
    client = db.query(Client).filter(Client.is_active == True).first()
    if not client:
        print("No active client found")
        return
    
    print(f"Client: {client.name}")
    print(f"API Key start: {client.tt_api_key[:5]}...")
    
    endpoints_to_try = [
        "/account",
        "/credits",
        "/balance",
        "/billing",
        "/organizations",
        "/users/me"
    ]
    
    for endpoint in endpoints_to_try:
        try:
            print(f"\\nTrying {endpoint}...")
            res = await _tt_get(client.tt_api_key, endpoint)
            print(f"Success!")
            pprint.pprint(res)
        except Exception as e:
            print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test())
