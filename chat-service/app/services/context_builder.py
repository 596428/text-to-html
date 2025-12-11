"""
Context Builder

Responsibilities:
- Build HTML context from vector search results
- Assemble relevant HTML fragments for LLM
- Manage context size limits
- Handle fallback to full HTML when needed

Dependencies:
- app.models.ast (ContextResult)
- app.models.chat (SearchResult)

Implementation Notes:
- Extract section IDs from search results
- Retrieve HTML fragments for each section
- Respect MAX_CONTEXT_SIZE limit
- Prioritize by search score
"""

from typing import List, Dict, Optional, Set, Any

from app.models.ast import ContextResult
from app.models.chat import SearchResult
from app.config import settings


class ContextBuilder:
    """
    Build LLM context from search results

    Usage:
        builder = ContextBuilder(session_data)
        context = builder.build_context(search_results)
        # context.html_fragments - section_id -> html mapping
        # context.total_size - total context size
    """

    def __init__(
        self,
        session_data: Dict[str, Any],
        max_context_size: Optional[int] = None
    ):
        """
        Initialize context builder

        Args:
            session_data: Session document from MongoDB
            max_context_size: Override max context size
        """
        self.session = session_data
        self.ast_nodes = session_data.get("ast_nodes", [])
        self.section_index = session_data.get("section_index", {})
        self.current_html = session_data.get("current_html", "")
        self.max_context_size = max_context_size or settings.MAX_CONTEXT_SIZE

    def build_context(
        self,
        search_results: List[SearchResult],
        include_parents: bool = True,
        include_siblings: bool = False
    ) -> ContextResult:
        """
        Build context from search results

        Args:
            search_results: Vector search results
            include_parents: Include parent sections
            include_siblings: Include sibling sections

        Returns:
            ContextResult with HTML fragments
        """
        # Step 1: Extract section IDs from search results
        section_ids = self._extract_section_ids(search_results)

        # Step 2: Optionally add parent sections
        if include_parents:
            additional_sections = set()
            for section_id in section_ids:
                parent_id = self._find_parent_section(section_id)
                if parent_id:
                    additional_sections.add(parent_id)
            section_ids.update(additional_sections)

        # Step 3: Calculate section scores and sort
        section_scores = self._calculate_section_scores(search_results)

        # For sections without scores (e.g., parent sections), assign a default score
        for section_id in section_ids:
            if section_id not in section_scores:
                section_scores[section_id] = 0.5

        # Sort sections by score (descending)
        sorted_sections = sorted(
            section_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        # Step 4: Collect HTML fragments within size limit
        html_fragments: Dict[str, str] = {}
        total_size = 0
        sections_included = []
        nodes_matched = []

        for section_id, score in sorted_sections:
            # Get HTML for this section
            section_html = self._get_section_html(section_id)
            if not section_html:
                continue

            html_size = len(section_html.encode('utf-8'))

            # Check if adding this section would exceed limit
            if total_size + html_size > self.max_context_size:
                # Try to include smaller sections if possible
                if html_size > self.max_context_size // 2:
                    continue
                else:
                    break

            # Add section
            html_fragments[section_id] = section_html
            total_size += html_size
            sections_included.append(section_id)

            # Record matched nodes
            for result in search_results:
                if result.section_id == section_id:
                    nodes_matched.append({
                        "node_id": result.node_id,
                        "section_id": result.section_id,
                        "score": result.score,
                        "type": result.type
                    })

        # Step 5: Return ContextResult
        return ContextResult(
            html_fragments=html_fragments,
            total_size=total_size,
            sections_included=sections_included,
            nodes_matched=nodes_matched
        )

    def _extract_section_ids(
        self,
        search_results: List[SearchResult]
    ) -> Set[str]:
        """
        Extract unique section IDs from search results

        Args:
            search_results: Search results

        Returns:
            Set of section IDs
        """
        section_ids = set()

        for result in search_results:
            if result.section_id:
                section_ids.add(result.section_id)

        return section_ids

    def _get_section_html(self, section_id: str) -> Optional[str]:
        """
        Get HTML for a section from cached AST

        Args:
            section_id: Section ID

        Returns:
            HTML string or None
        """
        # Get node IDs for this section from section_index
        node_ids = self.section_index.get(section_id, [])
        if not node_ids:
            return None

        # Find the section root node (should be first node with matching section_id)
        for node_data in self.ast_nodes:
            if node_data.get("section_id") == section_id and node_data.get("html"):
                return node_data.get("html")

        return None

    def _find_parent_section(self, section_id: str) -> Optional[str]:
        """
        Find parent section ID

        Args:
            section_id: Current section ID

        Returns:
            Parent section ID or None
        """
        # TODO: Implement in Phase 2 - Session B
        raise NotImplementedError()

    def _calculate_section_scores(
        self,
        search_results: List[SearchResult]
    ) -> Dict[str, float]:
        """
        Calculate aggregated scores per section

        Args:
            search_results: Search results

        Returns:
            Dict of section_id -> max score
        """
        section_scores: Dict[str, float] = {}

        for result in search_results:
            if not result.section_id:
                continue

            # Use max score for each section
            if result.section_id not in section_scores:
                section_scores[result.section_id] = result.score
            else:
                section_scores[result.section_id] = max(
                    section_scores[result.section_id],
                    result.score
                )

        return section_scores

    def build_full_context(self) -> str:
        """
        Return full HTML (fallback when search fails)

        Returns:
            Full current HTML string
        """
        return self.current_html
