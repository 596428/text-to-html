"""
Session-related Pydantic models
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """세션 상태"""
    INITIALIZING = "initializing"
    READY = "ready"
    ACTIVE = "active"
    EXPIRED = "expired"
    ERROR = "error"


class SessionStats(BaseModel):
    """세션 통계 정보"""
    node_count: int = Field(default=0, description="AST 노드 수")
    section_count: int = Field(default=0, description="섹션 수")
    text_node_count: int = Field(default=0, description="텍스트 노드 수")
    vector_count: int = Field(default=0, description="벡터 수")
    html_size: int = Field(default=0, description="HTML 크기 (bytes)")
    processing_time: float = Field(default=0.0, description="처리 시간 (초)")


class SessionCreate(BaseModel):
    """세션 생성 요청"""
    html: str = Field(..., min_length=1, description="파싱할 HTML")
    options: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {
            "include_structure": True,
            "include_sections": True,
        },
        description="임베딩 옵션"
    )


class SessionResponse(BaseModel):
    """세션 응답"""
    session_id: str = Field(..., description="세션 ID")
    status: SessionStatus
    stats: Optional[SessionStats] = None
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    message: Optional[str] = None

    class Config:
        use_enum_values = True


class SessionDocument(BaseModel):
    """MongoDB에 저장되는 세션 문서"""
    session_id: str
    status: SessionStatus
    created_at: datetime
    last_active_at: datetime
    expires_at: datetime

    # HTML 데이터
    original_html: str
    current_html: str

    # Pinecone 정보
    pinecone_namespace: str
    vector_count: int

    # AST 캐시
    ast_nodes: List[Dict[str, Any]] = Field(default_factory=list)
    section_index: Dict[str, List[str]] = Field(default_factory=dict)
    text_nodes: List[Dict[str, Any]] = Field(default_factory=list)

    # 메타데이터
    stats: SessionStats

    class Config:
        use_enum_values = True
