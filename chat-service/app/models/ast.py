"""
AST (Abstract Syntax Tree) related Pydantic models
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ASTNode(BaseModel):
    """HTML AST 노드"""
    node_id: str = Field(..., description="유니크 노드 ID")
    section_id: Optional[str] = Field(default=None, description="data-section-id 값")
    tag: str = Field(..., description="HTML 태그명")
    classes: List[str] = Field(default_factory=list, description="CSS 클래스 목록")
    selector: str = Field(default="", description="CSS 선택자")
    path: str = Field(default="", description="DOM 경로")
    html: str = Field(default="", description="해당 노드의 HTML")
    text_content: str = Field(default="", description="텍스트 내용 (최대 500자)")
    children: List[str] = Field(default_factory=list, description="자식 노드 ID 목록")
    parent: Optional[str] = Field(default=None, description="부모 노드 ID")
    attributes: Dict[str, str] = Field(default_factory=dict, description="속성 (class 제외)")


class TextNode(BaseModel):
    """텍스트 노드 (임베딩 대상)"""
    node_id: str = Field(..., description="유니크 노드 ID")
    selector: str = Field(default="", description="CSS 선택자")
    path: str = Field(default="", description="DOM 경로")
    text: str = Field(..., description="텍스트 내용")
    section_id: Optional[str] = Field(default=None, description="소속 섹션 ID")
    parent_node_id: str = Field(default="", description="부모 AST 노드 ID")


class SectionInfo(BaseModel):
    """섹션 정보"""
    section_id: str = Field(..., description="섹션 ID")
    description: str = Field(default="", description="섹션 설명 (임베딩용)")
    node_ids: List[str] = Field(default_factory=list, description="포함된 노드 ID 목록")
    html_size: int = Field(default=0, description="섹션 HTML 크기")
    text_preview: str = Field(default="", description="텍스트 미리보기")


class ParseResult(BaseModel):
    """HTML 파싱 결과"""
    nodes: List[ASTNode] = Field(default_factory=list)
    text_nodes: List[TextNode] = Field(default_factory=list)
    section_index: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="섹션ID -> 노드ID 목록 매핑"
    )
    sections: List[SectionInfo] = Field(default_factory=list)

    # 통계
    total_nodes: int = Field(default=0)
    total_text_nodes: int = Field(default=0)
    total_sections: int = Field(default=0)
    html_size: int = Field(default=0)


class EmbeddingItem(BaseModel):
    """임베딩 대상 아이템"""
    id: str = Field(..., description="벡터 ID")
    content: str = Field(..., description="임베딩할 텍스트")
    type: str = Field(..., description="text|structure|section")
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ContextResult(BaseModel):
    """컨텍스트 빌드 결과"""
    html_fragments: Dict[str, str] = Field(
        default_factory=dict,
        description="섹션ID -> HTML 매핑"
    )
    total_size: int = Field(default=0, description="총 크기 (bytes)")
    sections_included: List[str] = Field(default_factory=list)
    nodes_matched: List[Dict[str, Any]] = Field(default_factory=list)
