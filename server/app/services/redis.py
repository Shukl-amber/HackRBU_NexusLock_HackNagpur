"""Redis blacklist service for proof revocation."""

from redis.asyncio import Redis

from app.core.config import settings


class RedisBlacklist:
    """Redis-based blacklist for ZKP proof revocation.

    Implements fail-closed behavior: if Redis is unavailable,
    all proofs are considered blacklisted (deny access).
    """

    def __init__(self):
        """Initialize blacklist service."""
        self.redis: Redis | None = None

    async def connect(self):
        """Initialize Redis connection.

        Attempts to connect to Redis. If connection fails,
        redis remains None and all operations fail closed.
        """
        try:
            self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
            await self.redis.ping()
        except Exception:
            self.redis = None  # Fail closed

    async def add_to_blacklist(self, proof_id: str, ttl_days: int = 7) -> bool:
        """Add proof to blacklist with TTL.

        Args:
            proof_id: Unique proof identifier to blacklist
            ttl_days: Time-to-live in days (default: 7)

        Returns:
            True if successfully added, False if Redis unavailable
        """
        if not self.redis:
            return False  # Fail closed

        try:
            key = f"blacklist:{proof_id}"
            await self.redis.setex(key, ttl_days * 86400, "revoked")
            return True
        except Exception:
            return False  # Fail closed

    async def is_blacklisted(self, proof_id: str) -> bool:
        """Check if proof is blacklisted.

        Args:
            proof_id: Unique proof identifier to check

        Returns:
            True if blacklisted OR Redis unavailable (fail closed),
            False if not blacklisted
        """
        if not self.redis:
            return True  # Fail closed - deny access if Redis down

        try:
            key = f"blacklist:{proof_id}"
            result = await self.redis.get(key)
            return result is not None
        except Exception:
            return True  # Fail closed

    async def remove_from_blacklist(self, proof_id: str) -> bool:
        """Remove from blacklist (for testing).

        Args:
            proof_id: Unique proof identifier to remove

        Returns:
            True if successfully removed, False if Redis unavailable
        """
        if not self.redis:
            return False

        try:
            key = f"blacklist:{proof_id}"
            await self.redis.delete(key)
            return True
        except Exception:
            return False

    async def close(self):
        """Close Redis connection."""
        if self.redis:
            await self.redis.close()


# Global instance
blacklist = RedisBlacklist()
