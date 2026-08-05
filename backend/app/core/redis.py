import redis.asyncio as redis
from app.core.config import settings

# Create a Redis connection pool
redis_client = redis.Redis(
    host='localhost', # Since we are running docker on localhost for dev
    port=6379,
    db=0,
    decode_responses=True
)

async def add_token_to_blacklist(token: str, expires_in: int):
    """Add a token to the Redis blacklist with an expiration"""
    await redis_client.setex(f"bl_{token}", expires_in, "true")

async def is_token_blacklisted(token: str) -> bool:
    """Check if a token exists in the Redis blacklist"""
    result = await redis_client.get(f"bl_{token}")
    return result is not None
