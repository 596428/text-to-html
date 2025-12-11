"""
HTML Parser & AST Builder

Responsibilities:
- Parse HTML into AST (Abstract Syntax Tree)
- Extract text nodes for embedding
- Build section index from data-section-id attributes
- Generate CSS selectors for each node

Dependencies:
- beautifulsoup4, lxml
- app.models.ast (ASTNode, TextNode, ParseResult, SectionInfo)

Implementation Notes:
- Use BeautifulSoup with lxml parser for performance
- Skip script, style, noscript tags
- Generate unique node IDs using hash
- Build CSS selector from data-section-id, id, or classes
- Limit text_content to 500 characters
"""

from typing import Dict, List, Optional
from bs4 import BeautifulSoup, NavigableString
import hashlib

from app.models.ast import ASTNode, TextNode, ParseResult, SectionInfo


class HTMLParser:
    """
    HTML Parser that builds AST and extracts text nodes

    Usage:
        parser = HTMLParser(html_string)
        result = parser.parse()
        # result.nodes - list of ASTNode
        # result.text_nodes - list of TextNode
        # result.section_index - dict of section_id -> node_ids
    """

    def __init__(self, html: str):
        """
        Initialize parser with HTML string

        Args:
            html: Raw HTML string to parse
        """
        self.html = html
        self.soup: Optional[BeautifulSoup] = None
        self.nodes: Dict[str, ASTNode] = {}
        self.text_nodes: List[TextNode] = []
        self.section_index: Dict[str, List[str]] = {}
        self._node_counter = 0

    def parse(self) -> ParseResult:
        """
        Parse HTML and return structured result

        Returns:
            ParseResult containing nodes, text_nodes, section_index
        """
        # Parse HTML with BeautifulSoup
        self.soup = BeautifulSoup(self.html, 'lxml')

        # Find body element (or use entire document if no body)
        body = self.soup.find('body')
        if body is None:
            body = self.soup

        # Build AST recursively from body
        self._build_ast(body, parent_id=None, path="")

        # Build section information for all sections
        sections = []
        for section_id in self.section_index.keys():
            section_info = self._build_section_info(section_id)
            sections.append(section_info)

        # Calculate statistics
        total_nodes = len(self.nodes)
        total_text_nodes = len(self.text_nodes)
        total_sections = len(sections)
        html_size = len(self.html)

        # Return ParseResult
        return ParseResult(
            nodes=list(self.nodes.values()),
            text_nodes=self.text_nodes,
            section_index=self.section_index,
            sections=sections,
            total_nodes=total_nodes,
            total_text_nodes=total_text_nodes,
            total_sections=total_sections,
            html_size=html_size
        )

    def _build_ast(
        self,
        element,
        parent_id: Optional[str],
        path: str
    ) -> Optional[str]:
        """
        Recursively build AST from DOM element

        Args:
            element: BeautifulSoup element
            parent_id: Parent node ID
            path: Current DOM path

        Returns:
            Node ID of created node, or None
        """
        # Handle NavigableString (text nodes)
        if isinstance(element, NavigableString):
            if parent_id:
                self._add_text_node(element, parent_id, path)
            return None

        # Skip script, style, noscript tags
        if element.name in ['script', 'style', 'noscript']:
            return None

        # Generate node ID
        node_id = self._generate_node_id(element)

        # Find section_id
        section_id = self._find_section_id(element)

        # Build selector
        selector = self._build_selector(element)

        # Update path
        current_path = f"{path}/{element.name}" if path else element.name

        # Extract attributes (excluding class)
        attributes = {}
        for key, value in element.attrs.items():
            if key != 'class':
                if isinstance(value, list):
                    attributes[key] = ' '.join(value)
                else:
                    attributes[key] = str(value)

        # Get classes
        classes = element.get('class', [])

        # Get HTML (limited)
        html_str = str(element)

        # Get text content (limited to 500 chars)
        text_content = element.get_text(strip=True)[:500]

        # Create ASTNode
        node = ASTNode(
            node_id=node_id,
            section_id=section_id,
            tag=element.name,
            classes=classes,
            selector=selector,
            path=current_path,
            html=html_str,
            text_content=text_content,
            children=[],
            parent=parent_id,
            attributes=attributes
        )

        # Store node
        self.nodes[node_id] = node

        # Add to parent's children
        if parent_id and parent_id in self.nodes:
            self.nodes[parent_id].children.append(node_id)

        # Add to section_index
        if section_id:
            if section_id not in self.section_index:
                self.section_index[section_id] = []
            self.section_index[section_id].append(node_id)

        # Recursively process children
        for child in element.children:
            self._build_ast(child, node_id, current_path)

        return node_id

    def _add_text_node(
        self,
        text_element: NavigableString,
        parent_id: str,
        path: str
    ):
        """
        Add a text node to the collection

        Args:
            text_element: NavigableString containing text
            parent_id: Parent AST node ID
            path: DOM path
        """
        text = str(text_element).strip()

        # Ignore short text (less than 2 characters)
        if len(text) < 2:
            return

        # Find section_id and selector from parent
        parent_node = self.nodes.get(parent_id)
        section_id = parent_node.section_id if parent_node else None
        selector = parent_node.selector if parent_node else ""

        # Generate node ID
        self._node_counter += 1
        hash_input = f"text_{self._node_counter}_{parent_id}"
        hash_digest = hashlib.md5(hash_input.encode()).hexdigest()
        node_id = f"node_{hash_digest[:8]}"

        # Create TextNode
        text_node = TextNode(
            node_id=node_id,
            selector=selector,
            path=path,
            text=text,
            section_id=section_id,
            parent_node_id=parent_id
        )

        self.text_nodes.append(text_node)

    def _generate_node_id(self, element) -> str:
        """
        Generate unique node ID using hash

        Args:
            element: BeautifulSoup element

        Returns:
            Unique node ID string
        """
        self._node_counter += 1
        tag = element.name if hasattr(element, 'name') else 'text'
        section_id = self._find_section_id(element) or 'root'

        # Create unique hash
        hash_input = f"{tag}_{self._node_counter}_{section_id}"
        hash_digest = hashlib.md5(hash_input.encode()).hexdigest()

        return f"node_{hash_digest[:8]}"

    def _build_selector(self, element) -> str:
        """
        Build CSS selector for element

        Priority:
        1. [data-section-id='...']
        2. #id
        3. tag.class1.class2.class3

        Args:
            element: BeautifulSoup element

        Returns:
            CSS selector string
        """
        # Priority 1: data-section-id
        if element.has_attr('data-section-id'):
            section_id = element.get('data-section-id')
            return f"[data-section-id='{section_id}']"

        # Priority 2: id
        if element.has_attr('id'):
            return f"#{element.get('id')}"

        # Priority 3: tag with classes (max 3)
        tag = element.name
        classes = element.get('class', [])
        if classes:
            # Limit to first 3 classes
            class_str = '.'.join(classes[:3])
            return f"{tag}.{class_str}"

        # Fallback: just tag
        return tag

    def _find_section_id(self, element) -> Optional[str]:
        """
        Find nearest ancestor's section ID

        Args:
            element: Starting element

        Returns:
            Section ID or None
        """
        current = element
        while current:
            if hasattr(current, 'has_attr') and current.has_attr('data-section-id'):
                return current.get('data-section-id')
            current = current.parent
        return None

    def get_section_html(self, section_id: str) -> Optional[str]:
        """
        Get HTML string for a specific section

        Args:
            section_id: Section ID to retrieve

        Returns:
            HTML string or None
        """
        node_ids = self.section_index.get(section_id)
        if not node_ids:
            return None

        # Find the section element in soup
        if not self.soup:
            return None

        section_element = self.soup.find(attrs={'data-section-id': section_id})
        if section_element:
            return str(section_element)

        return None

    def _build_section_info(self, section_id: str) -> SectionInfo:
        """
        Build section information for embedding

        Args:
            section_id: Section ID

        Returns:
            SectionInfo with description for embedding
        """
        node_ids = self.section_index.get(section_id, [])

        # Collect all text from section
        texts = []
        total_html_size = 0

        for node_id in node_ids:
            node = self.nodes.get(node_id)
            if node:
                if node.text_content:
                    texts.append(node.text_content)
                total_html_size += len(node.html)

        # Build description from texts
        description = ' '.join(texts)

        # Create preview (first 200 chars)
        text_preview = description[:200]

        return SectionInfo(
            section_id=section_id,
            description=description,
            node_ids=node_ids,
            html_size=total_html_size,
            text_preview=text_preview
        )
