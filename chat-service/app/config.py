"""
Application Configuration using Pydantic Settings
"""

from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # MongoDB
    MONGODB_URI: str = Field(..., description="MongoDB Atlas connection URI")

    # Pinecone
    PINECONE_API_KEY: str = Field(..., description="Pinecone API key")
    PINECONE_INDEX: str = Field(default="html-chat-vectors", description="Pinecone index name")

    # Gemini API Keys (up to 10)
    GEMINI_API_KEY_1: Optional[str] = None
    GEMINI_API_KEY_2: Optional[str] = None
    GEMINI_API_KEY_3: Optional[str] = None
    GEMINI_API_KEY_4: Optional[str] = None
    GEMINI_API_KEY_5: Optional[str] = None
    GEMINI_API_KEY_6: Optional[str] = None
    GEMINI_API_KEY_7: Optional[str] = None
    GEMINI_API_KEY_8: Optional[str] = None
    GEMINI_API_KEY_9: Optional[str] = None
    GEMINI_API_KEY_10: Optional[str] = None

    # Server
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)
    DEBUG: bool = Field(default=False)

    # Session
    SESSION_TTL_MINUTES: int = Field(default=30, description="Session expiration time in minutes")

    # Context
    MAX_CONTEXT_SIZE: int = Field(default=8000, description="Max context size in bytes")
    MAX_SEARCH_RESULTS: int = Field(default=10, description="Max vector search results")

    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Comma-separated list of allowed origins"
    )

    # Embedding
    EMBEDDING_MODEL: str = Field(
        default="text-embedding-004",
        description="Gemini embedding model"
    )
    EMBEDDING_DIMENSION: int = Field(
        default=768,
        description="Embedding vector dimension"
    )

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def gemini_keys(self) -> List[str]:
        """Get all configured Gemini API keys"""
        keys = []
        for i in range(1, 11):
            key = getattr(self, f"GEMINI_API_KEY_{i}", None)
            if key:
                keys.append(key)
        return keys

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
