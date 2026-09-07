import os
import redis.asyncio as redis
from app.core.config import settings

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(redis_url, decode_responses=True)

async def add_token_to_blacklist(token: str, expires_in: int):
    """Add a token to the Redis blacklist with an expiration"""
    await redis_client.setex(f"bl_{token}", expires_in, "true")

async def is_token_blacklisted(token: str) -> bool:
    """Check if a token exists in the Redis blacklist"""
    result = await redis_client.get(f"bl_{token}")
    return result is not None
