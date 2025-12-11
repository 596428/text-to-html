"""
Chat-related Pydantic models
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PatchAction(str, Enum):
    """Patch 작업 유형"""
    ADD_CLASS = "addClass"
    REMOVE_CLASS = "removeClass"
    REPLACE_CLASS = "replaceClass"
    SET_TEXT = "setText"
    SET_HTML = "setHtml"
    SET_ATTRIBUTE = "setAttribute"
    REMOVE_ATTRIBUTE = "removeAttribute"
    SET_STYLE = "setStyle"
    REMOVE_ELEMENT = "removeElement"
    APPEND_CHILD = "appendChild"
    PREPEND_CHILD = "prependChild"


class Patch(BaseModel):
    """단일 HTML 수정 패치"""
    selector: str = Field(..., description="CSS 선택자")
    action: PatchAction
    old_value: Optional[str] = Field(default=None, description="기존 값")
    new_value: Optional[str] = Field(default=None, description="새 값")
    value: Optional[str] = Field(default=None, description="적용할 값 (단일)")

    class Config:
        use_enum_values = True


class SearchResult(BaseModel):
    """벡터 검색 결과"""
    node_id: Optional[str] = None
    section_id: Optional[str] = None
    selector: Optional[str] = None
    type: str = Field(default="text", description="text|structure|section")
    content: str = Field(default="", description="매칭된 내용")
    score: float = Field(default=0.0, description="유사도 점수")


class DebugInfo(BaseModel):
    """디버그 정보"""
    search_results: List[SearchResult] = Field(default_factory=list)
    target_sections: List[str] = Field(default_factory=list)
    context_size: str = Field(default="0KB")
    intent: str = Field(default="unclear")
    confidence: float = Field(default=0.0)
    fallback_reason: Optional[str] = None
    reasoning: Optional[str] = Field(default=None, description="LLM의 분석 근거")


class ChatResponseType(str, Enum):
    """응답 유형"""
    PATCH = "patch"     # 부분 수정 (Patch 배열)
    FULL = "full"       # 전체 HTML 반환
    MESSAGE = "message" # 메시지 응답 (HTML 변경 없음)
    ERROR = "error"     # 에러


class ChatRequest(BaseModel):
    """채팅 요청"""
    session_id: str = Field(..., description="세션 ID")
    message: str = Field(..., min_length=1, description="사용자 메시지")


class ChatResponse(BaseModel):
    """채팅 응답"""
    type: ChatResponseType
    patches: Optional[List[Patch]] = None
    html: Optional[str] = None
    message: str = Field(default="", description="응답 메시지")
    processing_time: Optional[float] = Field(default=None, description="처리 시간 (초)")
    debug: Optional[DebugInfo] = None
    metadata: Dict[str, Any] = Field(
        default_factory=lambda: {
            "tokens_used": 0,
            "processing_time": 0.0,
        }
    )

    class Config:
        use_enum_values = True


class ChatMessageRole(str, Enum):
    """채팅 메시지 역할"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """채팅 메시지"""
    message_id: str
    role: ChatMessageRole
    content: str
    timestamp: datetime
    analysis: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class ChatHistory(BaseModel):
    """채팅 히스토리 문서"""
    session_id: str
    messages: List[ChatMessage] = Field(default_factory=list)
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
