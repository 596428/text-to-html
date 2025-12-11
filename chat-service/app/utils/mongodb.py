"""
MongoDB connection utilities using Motor (async driver)
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from functools import lru_cache

from app.config import settings


class MongoDBClient:
    """Singleton MongoDB client"""

    _client: Optional[AsyncIOMotorClient] = None
    _database: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    def get_client(cls) -> AsyncIOMotorClient:
        """Get or create MongoDB client"""
        if cls._client is None:
            cls._client = AsyncIOMotorClient(settings.MONGODB_URI)
        return cls._client

    @classmethod
    def get_database(cls, db_name: Optional[str] = None) -> AsyncIOMotorDatabase:
        """Get database instance"""
        client = cls.get_client()
        # Extract database name from URI or use provided name
        if db_name is None:
            # URI format: mongodb+srv://.../<database>?...
            db_name = settings.MONGODB_URI.split("/")[-1].split("?")[0]
        return client[db_name]

    @classmethod
    def get_collection(cls, collection_name: str, db_name: Optional[str] = None) -> AsyncIOMotorCollection:
        """Get collection instance"""
        db = cls.get_database(db_name)
        return db[collection_name]

    @classmethod
    async def close(cls):
        """Close MongoDB connection"""
        if cls._client is not None:
            cls._client.close()
            cls._client = None
            cls._database = None

    @classmethod
    async def ping(cls) -> bool:
        """Test MongoDB connection"""
        try:
            client = cls.get_client()
            await client.admin.command("ping")
            return True
        except Exception:
            return False


# Convenience functions
def get_database(db_name: Optional[str] = None) -> AsyncIOMotorDatabase:
    """Get database instance"""
    return MongoDBClient.get_database(db_name)


def get_collection(collection_name: str, db_name: Optional[str] = None) -> AsyncIOMotorCollection:
    """Get collection instance"""
    return MongoDBClient.get_collection(collection_name, db_name)


# Collection names
SESSIONS_COLLECTION = "chat_sessions"
CHAT_HISTORY_COLLECTION = "chat_history"
USAGE_LOGS_COLLECTION = "gemini_usage"
