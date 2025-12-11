"""
Pinecone Vector DB client
"""

from typing import List, Dict, Optional, Any
from pinecone import Pinecone, ServerlessSpec
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class PineconeClient:
    """Pinecone Vector DB client wrapper"""

    _instance: Optional["PineconeClient"] = None
    _pinecone: Optional[Pinecone] = None
    _index = None
    _disabled: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._pinecone is None:
            # Check if API key is valid (not placeholder)
            api_key = settings.PINECONE_API_KEY
            if not api_key or api_key == "your-pinecone-api-key" or len(api_key) < 10:
                logger.warning("Pinecone API key not configured - vector search disabled")
                self._disabled = True
                return

            try:
                self._pinecone = Pinecone(api_key=api_key)
                self._ensure_index()
            except Exception as e:
                logger.warning(f"Failed to initialize Pinecone: {e} - vector search disabled")
                self._disabled = True

    def _ensure_index(self):
        """Ensure the index exists, create if not"""
        index_name = settings.PINECONE_INDEX

        # Check if index exists
        existing_indexes = [idx.name for idx in self._pinecone.list_indexes()]

        if index_name not in existing_indexes:
            logger.info(f"Creating Pinecone index: {index_name}")
            self._pinecone.create_index(
                name=index_name,
                dimension=settings.EMBEDDING_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region="us-east-1"
                )
            )

        self._index = self._pinecone.Index(index_name)

    @property
    def index(self):
        """Get the Pinecone index"""
        if self._disabled:
            return None
        if self._index is None:
            self._ensure_index()
        return self._index

    @property
    def is_disabled(self) -> bool:
        """Check if Pinecone is disabled"""
        return self._disabled

    async def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: str,
        batch_size: int = 100
    ) -> int:
        """
        Upsert vectors to Pinecone

        Args:
            vectors: List of {"id": str, "values": List[float], "metadata": Dict}
            namespace: Namespace for isolation (session_id)
            batch_size: Batch size for upsert

        Returns:
            Number of vectors upserted
        """
        if self._disabled:
            logger.debug(f"Pinecone disabled - skipping upsert of {len(vectors)} vectors")
            return 0

        total_upserted = 0

        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self.index.upsert(vectors=batch, namespace=namespace)
            total_upserted += len(batch)

        return total_upserted

    async def query(
        self,
        vector: List[float],
        namespace: str,
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Query similar vectors

        Args:
            vector: Query vector
            namespace: Namespace to search in
            top_k: Number of results
            filter: Metadata filter
            include_metadata: Include metadata in results

        Returns:
            List of matched results with scores
        """
        if self._disabled:
            logger.debug("Pinecone disabled - returning empty results")
            return []

        results = self.index.query(
            vector=vector,
            namespace=namespace,
            top_k=top_k,
            filter=filter,
            include_metadata=include_metadata
        )

        return [
            {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata if include_metadata else {}
            }
            for match in results.matches
        ]

    async def delete_namespace(self, namespace: str) -> bool:
        """
        Delete all vectors in a namespace

        Args:
            namespace: Namespace to delete

        Returns:
            Success status
        """
        if self._disabled:
            logger.debug("Pinecone disabled - skipping delete")
            return True

        try:
            self.index.delete(delete_all=True, namespace=namespace)
            return True
        except Exception as e:
            logger.error(f"Failed to delete namespace {namespace}: {e}")
            return False

    async def get_namespace_stats(self, namespace: str) -> Dict[str, Any]:
        """Get statistics for a namespace"""
        if self._disabled:
            return {"vector_count": 0, "total_vector_count": 0}

        stats = self.index.describe_index_stats()
        ns_stats = stats.namespaces.get(namespace, {})

        return {
            "vector_count": ns_stats.get("vector_count", 0) if ns_stats else 0,
            "total_vector_count": stats.total_vector_count
        }


# Singleton instance getter
def get_pinecone_client() -> PineconeClient:
    """Get Pinecone client singleton"""
    return PineconeClient()
