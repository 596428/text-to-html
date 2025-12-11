"""
Embedding Service

Responsibilities:
- Generate embeddings using Gemini text-embedding-004
- Create embeddings for text nodes, structure info, and sections
- Store embeddings in Pinecone with metadata
- Search similar vectors by query

Dependencies:
- google-generativeai
- app.utils.pinecone_client
- app.models.ast (EmbeddingItem, TextNode, ASTNode, SectionInfo)

Implementation Notes:
- Use Gemini text-embedding-004 (768 dimensions)
- Batch embedding requests for efficiency
- Store in Pinecone with session-based namespace
- Include metadata for filtering and retrieval
"""

from typing import List, Dict, Optional, Any
import logging
import google.generativeai as genai

from app.models.ast import EmbeddingItem, TextNode, ASTNode, SectionInfo, ParseResult
from app.utils.pinecone_client import PineconeClient, get_pinecone_client
from app.utils.api_key_manager import get_key_manager
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Embedding service for HTML nodes

    Usage:
        service = EmbeddingService()
        stats = await service.create_embeddings_for_session(
            session_id="sess_123",
            parse_result=parser.parse()
        )
    """

    def __init__(self):
        """Initialize embedding service"""
        self.pinecone = get_pinecone_client()
        self.model = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self.key_manager = get_key_manager()

    async def create_embeddings_for_session(
        self,
        session_id: str,
        parse_result: ParseResult,
        include_structure: bool = True,
        include_sections: bool = True
    ) -> Dict[str, int]:
        """
        Create and store embeddings for a session

        Args:
            session_id: Session ID (used as Pinecone namespace)
            parse_result: Parsed HTML result
            include_structure: Include structure embeddings
            include_sections: Include section embeddings

        Returns:
            Dict with embedding statistics
        """
        logger.info(f"Creating embeddings for session {session_id}")

        # Skip if Pinecone is disabled
        if self.pinecone.is_disabled:
            logger.warning(f"Pinecone disabled - skipping embeddings for session {session_id}")
            return {
                "total": 0,
                "text": 0,
                "structure": 0,
                "section": 0,
                "upserted": 0,
                "disabled": True
            }

        # Step 1: Collect items to embed
        all_items: List[EmbeddingItem] = []

        # Text embeddings (always included)
        text_items = await self._create_text_embeddings(
            parse_result.text_nodes,
            session_id
        )
        all_items.extend(text_items)

        # Structure embeddings (optional)
        if include_structure:
            structure_items = await self._create_structure_embeddings(
                parse_result.nodes,
                session_id
            )
            all_items.extend(structure_items)

        # Section embeddings (optional)
        if include_sections:
            section_items = await self._create_section_embeddings(
                parse_result.sections,
                session_id
            )
            all_items.extend(section_items)

        if not all_items:
            logger.warning(f"No items to embed for session {session_id}")
            return {
                "total": 0,
                "text": 0,
                "structure": 0,
                "section": 0
            }

        # Step 2: Generate embeddings
        texts = [item.content for item in all_items]
        embeddings = await self._batch_embed(texts)

        # Step 3: Store in Pinecone
        vectors = []
        for item, embedding in zip(all_items, embeddings):
            vectors.append({
                "id": item.id,
                "values": embedding,
                "metadata": {
                    **item.metadata,
                    "type": item.type
                }
            })

        # Upsert to Pinecone with session_id as namespace
        upserted_count = await self.pinecone.upsert_vectors(
            vectors=vectors,
            namespace=session_id
        )

        # Step 4: Return statistics
        stats = {
            "total": len(all_items),
            "text": len(text_items),
            "structure": len(structure_items) if include_structure else 0,
            "section": len(section_items) if include_sections else 0,
            "upserted": upserted_count
        }

        logger.info(f"Created {stats['total']} embeddings for session {session_id}: {stats}")

        return stats

    async def _create_text_embeddings(
        self,
        text_nodes: List[TextNode],
        session_id: str
    ) -> List[EmbeddingItem]:
        """
        Create embedding items for text nodes

        Args:
            text_nodes: List of text nodes
            session_id: Session ID

        Returns:
            List of EmbeddingItem
        """
        items = []

        for node in text_nodes:
            if not node.text.strip():
                continue

            item = EmbeddingItem(
                id=f"{session_id}:text:{node.node_id}",
                content=node.text,
                type="text",
                metadata={
                    "node_id": node.node_id,
                    "section_id": node.section_id or "",
                    "selector": node.selector,
                    "path": node.path
                }
            )
            items.append(item)

        return items

    async def _create_structure_embeddings(
        self,
        nodes: List[ASTNode],
        session_id: str
    ) -> List[EmbeddingItem]:
        """
        Create embedding items for structure nodes

        Args:
            nodes: List of AST nodes
            session_id: Session ID

        Returns:
            List of EmbeddingItem
        """
        items = []

        for node in nodes:
            description = self._build_structure_description(node)
            if not description:
                continue

            item = EmbeddingItem(
                id=f"{session_id}:structure:{node.node_id}",
                content=description,
                type="structure",
                metadata={
                    "node_id": node.node_id,
                    "section_id": node.section_id or "",
                    "tag": node.tag,
                    "classes": node.classes,
                    "selector": node.selector,
                    "path": node.path
                }
            )
            items.append(item)

        return items

    async def _create_section_embeddings(
        self,
        sections: List[SectionInfo],
        session_id: str
    ) -> List[EmbeddingItem]:
        """
        Create embedding items for sections

        Args:
            sections: List of section info
            session_id: Session ID

        Returns:
            List of EmbeddingItem
        """
        items = []

        for section in sections:
            # Use section description and text preview for embedding
            content_parts = []

            if section.description:
                content_parts.append(section.description)

            if section.text_preview:
                content_parts.append(section.text_preview)

            if not content_parts:
                continue

            content = " ".join(content_parts)

            item = EmbeddingItem(
                id=f"{session_id}:section:{section.section_id}",
                content=content,
                type="section",
                metadata={
                    "section_id": section.section_id,
                    "node_count": len(section.node_ids),
                    "html_size": section.html_size
                }
            )
            items.append(item)

        return items

    def _build_structure_description(self, node: ASTNode) -> Optional[str]:
        """
        Build structure description for embedding

        Args:
            node: AST node

        Returns:
            Description string or None if not meaningful
        """
        # Only process meaningful structural tags
        meaningful_tags = {
            "header", "nav", "main", "section", "article",
            "aside", "footer", "form", "table", "button", "input"
        }

        if node.tag not in meaningful_tags:
            return None

        # Build description
        parts = [f"{node.tag} element"]

        # Add class information
        if node.classes:
            classes_str = ", ".join(node.classes)
            parts.append(f"with classes: {classes_str}")

        # Infer and add role
        role = self._infer_role(node.tag, node.classes, node.section_id)
        if role:
            parts.append(f"역할: {role}")

        # Add selector if available
        if node.selector:
            parts.append(f"selector: {node.selector}")

        return " ".join(parts)

    def _infer_role(
        self,
        tag: str,
        classes: List[str],
        section_id: Optional[str]
    ) -> Optional[str]:
        """
        Infer semantic role from element properties

        Args:
            tag: HTML tag name
            classes: CSS classes
            section_id: Section ID if any

        Returns:
            Role description or None
        """
        # Tag-based role mapping
        tag_roles = {
            "header": "페이지 상단 헤더",
            "nav": "네비게이션 메뉴",
            "main": "메인 콘텐츠 영역",
            "section": "섹션 영역",
            "article": "아티클 콘텐츠",
            "aside": "사이드바 또는 보조 콘텐츠",
            "footer": "푸터",
            "form": "입력 폼",
            "table": "테이블",
            "button": "버튼",
            "input": "입력 필드"
        }

        if tag in tag_roles:
            return tag_roles[tag]

        # Class-based role inference
        classes_lower = [c.lower() for c in classes]

        # Common class patterns
        if any(cls in classes_lower for cls in ["header", "top", "masthead"]):
            return "헤더 영역"
        if any(cls in classes_lower for cls in ["nav", "navigation", "menu"]):
            return "네비게이션"
        if any(cls in classes_lower for cls in ["sidebar", "aside"]):
            return "사이드바"
        if any(cls in classes_lower for cls in ["footer", "bottom"]):
            return "푸터 영역"
        if any(cls in classes_lower for cls in ["content", "main"]):
            return "메인 콘텐츠"
        if any(cls in classes_lower for cls in ["hero", "banner"]):
            return "배너 영역"
        if any(cls in classes_lower for cls in ["card", "item"]):
            return "카드 또는 아이템"
        if any(cls in classes_lower for cls in ["modal", "dialog", "popup"]):
            return "모달 또는 팝업"

        return None

    async def _batch_embed(
        self,
        texts: List[str],
        batch_size: int = 100
    ) -> List[List[float]]:
        """
        Generate embeddings in batches using Gemini

        Args:
            texts: List of texts to embed
            batch_size: Batch size

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        all_embeddings = []

        # Process in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            # Get API key from manager
            key, key_idx = self.key_manager.get_key()

            try:
                # Configure Gemini with the selected key
                genai.configure(api_key=key)

                # Generate embeddings
                result = genai.embed_content(
                    model=f"models/{self.model}",
                    content=batch,
                    task_type="retrieval_document"
                )

                # Extract embeddings
                embeddings = result['embedding']
                all_embeddings.extend(embeddings)

                # Release key successfully
                self.key_manager.release_key(key_idx, is_error=False)

                logger.debug(f"Generated {len(embeddings)} embeddings in batch {i//batch_size + 1}")

            except Exception as e:
                # Release key with error flag
                self.key_manager.release_key(key_idx, is_error=True)
                logger.error(f"Error generating embeddings: {e}")
                raise

        return all_embeddings

    async def search(
        self,
        session_id: str,
        query: str,
        top_k: int = 10,
        filter_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors

        Args:
            session_id: Session ID (Pinecone namespace)
            query: Search query
            top_k: Number of results
            filter_type: Filter by type (text|structure|section)

        Returns:
            List of search results with scores
        """
        # Generate query embedding
        query_embeddings = await self._batch_embed([query])
        if not query_embeddings:
            return []

        query_vector = query_embeddings[0]

        # Prepare filter
        filter_dict = None
        if filter_type:
            filter_dict = {"type": filter_type}

        # Query Pinecone
        results = await self.pinecone.query(
            vector=query_vector,
            namespace=session_id,
            top_k=top_k,
            filter=filter_dict,
            include_metadata=True
        )

        logger.debug(f"Search found {len(results)} results for query: {query[:50]}")

        return results

    async def delete_session_vectors(self, session_id: str) -> bool:
        """
        Delete all vectors for a session

        Args:
            session_id: Session ID

        Returns:
            Success status
        """
        # TODO: Implement in Phase 2 - Session B
        return await self.pinecone.delete_namespace(session_id)
