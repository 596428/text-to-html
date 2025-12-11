"""
Common types and enums shared across services
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """사용자 요청 의도 분류"""
    LOCAL_CHANGE = "local"      # 특정 요소 수정
    GLOBAL_CHANGE = "global"    # 전체 수정
    QUERY = "query"             # HTML 관련 질문 (수정 아님)
    UNCLEAR = "unclear"         # 불명확한 HTML 수정 요청
    OFF_TOPIC = "off_topic"     # HTML과 무관한 요청


class ChangeType(str, Enum):
    """변경 유형"""
    STYLE = "style"             # 스타일/색상 변경
    CONTENT = "content"         # 텍스트 내용 변경
    STRUCTURE = "structure"     # 구조 변경 (추가/삭제)
    TRANSLATION = "translation" # 번역
    DELETION = "deletion"       # 삭제


class AnalysisResult(BaseModel):
    """Intent Analyzer 결과"""
    intent: IntentType
    change_type: Optional[ChangeType] = None
    target_description: str = Field(default="", description="수정 대상 설명")
    action_description: str = Field(default="", description="수행할 작업 설명")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    use_search_results: bool = Field(default=False, description="검색 결과 사용 여부")
    reasoning: str = Field(default="", description="분석 근거")

    class Config:
        use_enum_values = True
