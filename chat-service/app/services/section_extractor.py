"""
Section Extractor - Rule-based HTML Section Extraction

Vector DB 없이 키워드 매칭으로 관련 HTML 섹션을 추출합니다.

Features:
- HTML 파싱하여 data-editable 섹션 추출
- 키워드 기반 매칭 (버튼, 헤더, 테이블 등)
- 요소 타입 기반 매칭 (button, h1, table 등)
- CSS 클래스 기반 매칭
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from bs4 import BeautifulSoup
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ExtractedSection:
    """추출된 섹션 정보"""
    section_id: str
    html: str
    element_types: List[str]  # ['button', 'h1', 'table', ...]
    text_content: str  # 섹션 내 텍스트
    css_classes: List[str]  # 주요 CSS 클래스들
    score: float = 0.0  # 매칭 점수


# 한국어 키워드 → HTML 요소/클래스 매핑
KEYWORD_MAPPINGS = {
    # 요소 타입 매핑
    "버튼": {"elements": ["button", "btn"], "classes": ["btn", "button"]},
    "헤더": {"elements": ["header", "h1", "h2", "h3"], "classes": ["header", "heading"]},
    "제목": {"elements": ["h1", "h2", "h3", "h4", "h5", "h6"], "classes": ["title", "heading"]},
    "테이블": {"elements": ["table", "thead", "tbody", "tr", "td", "th"], "classes": ["table"]},
    "표": {"elements": ["table", "thead", "tbody", "tr", "td", "th"], "classes": ["table"]},
    "이미지": {"elements": ["img"], "classes": ["image", "img"]},
    "사진": {"elements": ["img"], "classes": ["image", "img", "photo"]},
    "링크": {"elements": ["a"], "classes": ["link"]},
    "입력": {"elements": ["input", "textarea"], "classes": ["input", "form"]},
    "폼": {"elements": ["form", "input", "textarea", "select"], "classes": ["form"]},
    "목록": {"elements": ["ul", "ol", "li"], "classes": ["list"]},
    "리스트": {"elements": ["ul", "ol", "li"], "classes": ["list"]},
    "네비게이션": {"elements": ["nav"], "classes": ["nav", "navigation", "menu"]},
    "메뉴": {"elements": ["nav", "ul"], "classes": ["nav", "menu"]},
    "푸터": {"elements": ["footer"], "classes": ["footer"]},
    "카드": {"elements": ["div"], "classes": ["card"]},
    "섹션": {"elements": ["section", "div"], "classes": ["section"]},
    "팝업": {"elements": ["div"], "classes": ["popup", "modal", "overlay"]},
    "아이콘": {"elements": ["i", "svg", "img"], "classes": ["icon", "fa", "svg"]},
    "텍스트": {"elements": ["p", "span", "div"], "classes": ["text"]},
    "문단": {"elements": ["p"], "classes": ["paragraph"]},

    # 스타일 관련 키워드 (모든 섹션에 적용 가능)
    "색": {"elements": [], "classes": ["bg-", "text-", "color"]},
    "색깔": {"elements": [], "classes": ["bg-", "text-", "color"]},
    "배경": {"elements": [], "classes": ["bg-", "background"]},
    "폰트": {"elements": [], "classes": ["font-", "text-"]},
    "글자": {"elements": [], "classes": ["font-", "text-"]},
    "크기": {"elements": [], "classes": ["text-", "w-", "h-", "size"]},
    "너비": {"elements": [], "classes": ["w-", "width"]},
    "높이": {"elements": [], "classes": ["h-", "height"]},
    "간격": {"elements": [], "classes": ["gap-", "space-", "p-", "m-"]},
    "패딩": {"elements": [], "classes": ["p-", "padding"]},
    "마진": {"elements": [], "classes": ["m-", "margin"]},
    "테두리": {"elements": [], "classes": ["border", "rounded"]},
    "둥글게": {"elements": [], "classes": ["rounded"]},
    "그림자": {"elements": [], "classes": ["shadow"]},
}

# 전역 스타일 키워드 (특정 섹션이 아닌 전체에 적용)
GLOBAL_STYLE_KEYWORDS = [
    "색", "색깔", "배경", "폰트", "글자", "전체", "모든", "다",
    "번역", "영어로", "한글로", "중국어로", "일본어로", "translate",
    "언어", "변환"
]


class SectionExtractor:
    """규칙 기반 HTML 섹션 추출기"""

    def __init__(self):
        self.keyword_mappings = KEYWORD_MAPPINGS

    def extract_sections(self, html: str) -> List[ExtractedSection]:
        """
        HTML에서 모든 편집 가능 섹션 추출

        Args:
            html: 전체 HTML 문자열

        Returns:
            ExtractedSection 리스트
        """
        soup = BeautifulSoup(html, 'html.parser')
        sections = []

        # data-editable="true" 또는 data-section-id를 가진 요소 찾기
        editable_elements = soup.find_all(
            lambda tag: tag.get('data-editable') == 'true' or tag.get('data-section-id')
        )

        for element in editable_elements:
            section_id = element.get('data-section-id', '')
            if not section_id:
                continue

            # 섹션 내 요소 타입들 수집
            element_types = self._get_element_types(element)

            # 텍스트 콘텐츠 추출
            text_content = element.get_text(separator=' ', strip=True)[:500]

            # CSS 클래스 수집
            css_classes = self._get_all_classes(element)

            sections.append(ExtractedSection(
                section_id=section_id,
                html=str(element),
                element_types=element_types,
                text_content=text_content,
                css_classes=css_classes
            ))

        logger.info(f"Extracted {len(sections)} editable sections from HTML")
        return sections

    def find_relevant_sections(
        self,
        html: str,
        user_request: str,
        max_sections: int = 5
    ) -> List[ExtractedSection]:
        """
        사용자 요청과 관련된 섹션들 찾기

        Args:
            html: 전체 HTML
            user_request: 사용자 요청 메시지
            max_sections: 최대 반환 섹션 수

        Returns:
            관련도 순으로 정렬된 섹션 리스트
        """
        all_sections = self.extract_sections(html)

        if not all_sections:
            logger.warning("No editable sections found in HTML")
            return []

        # 전역 스타일 요청인지 확인
        is_global_request = self._is_global_request(user_request)

        if is_global_request:
            # 전역 요청: 모든 섹션 반환 (또는 특정 요소 타입 필터링)
            target_elements = self._extract_target_elements(user_request)
            if target_elements:
                # "모든 버튼" 같은 요청
                scored_sections = []
                for section in all_sections:
                    score = self._calculate_element_match_score(section, target_elements)
                    if score > 0:
                        section.score = score
                        scored_sections.append(section)
                return sorted(scored_sections, key=lambda x: x.score, reverse=True)[:max_sections]
            else:
                # "전체 색깔 변경" 같은 요청 - 모든 섹션
                for section in all_sections:
                    section.score = 1.0
                return all_sections[:max_sections]

        # 특정 대상 요청: 키워드 매칭으로 점수 계산
        scored_sections = []
        for section in all_sections:
            score = self._calculate_relevance_score(section, user_request)
            if score > 0:
                section.score = score
                scored_sections.append(section)

        # 점수순 정렬
        scored_sections.sort(key=lambda x: x.score, reverse=True)

        # 매칭되는 섹션이 없으면 텍스트 매칭 시도
        if not scored_sections:
            scored_sections = self._fallback_text_matching(all_sections, user_request)

        logger.info(f"Found {len(scored_sections)} relevant sections for request: {user_request[:50]}...")
        return scored_sections[:max_sections]

    def _is_global_request(self, request: str) -> bool:
        """전역 스타일 요청인지 확인"""
        global_patterns = [
            r'전체\s*(색|배경|폰트)',
            r'모든\s*(버튼|텍스트|요소)',
            r'다\s*(바꿔|변경)',
            r'전부\s*(바꿔|변경)',
            # 번역 요청
            r'영어로\s*(번역|바꿔|변경|변환)',
            r'한글을?\s*영어로',
            r'번역해',
            r'translate',
        ]
        for pattern in global_patterns:
            if re.search(pattern, request, re.IGNORECASE):
                return True
        return False

    def _extract_target_elements(self, request: str) -> List[str]:
        """요청에서 대상 요소 타입 추출"""
        target_elements = []
        for keyword, mapping in self.keyword_mappings.items():
            if keyword in request and mapping["elements"]:
                target_elements.extend(mapping["elements"])
        return list(set(target_elements))

    def _calculate_relevance_score(self, section: ExtractedSection, request: str) -> float:
        """섹션과 요청 간의 관련도 점수 계산"""
        score = 0.0

        for keyword, mapping in self.keyword_mappings.items():
            if keyword not in request:
                continue

            # 요소 타입 매칭
            for elem_type in mapping["elements"]:
                if elem_type in section.element_types:
                    score += 2.0
                    break

            # CSS 클래스 매칭
            for class_pattern in mapping["classes"]:
                for css_class in section.css_classes:
                    if class_pattern in css_class:
                        score += 1.0
                        break

        # 텍스트 콘텐츠 매칭 (보너스 점수)
        request_words = set(request.replace('?', '').replace('.', '').split())
        section_words = set(section.text_content.lower().split())
        common_words = request_words & section_words
        if common_words:
            score += len(common_words) * 0.5

        return score

    def _calculate_element_match_score(self, section: ExtractedSection, target_elements: List[str]) -> float:
        """특정 요소 타입 매칭 점수"""
        score = 0.0
        for elem in target_elements:
            if elem in section.element_types:
                score += 1.0
        return score

    def _fallback_text_matching(
        self,
        sections: List[ExtractedSection],
        request: str
    ) -> List[ExtractedSection]:
        """키워드 매칭 실패 시 텍스트 기반 폴백"""
        scored = []
        request_lower = request.lower()

        for section in sections:
            text_lower = section.text_content.lower()
            # 단순 단어 오버랩 계산
            request_words = set(request_lower.split())
            text_words = set(text_lower.split())
            overlap = len(request_words & text_words)
            if overlap > 0:
                section.score = overlap * 0.3
                scored.append(section)

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored

    def _get_element_types(self, element) -> List[str]:
        """섹션 내 모든 요소 타입 수집"""
        types = set()
        types.add(element.name)

        for child in element.find_all(True):  # 모든 태그
            types.add(child.name)

        return list(types)

    def _get_all_classes(self, element) -> List[str]:
        """섹션 내 모든 CSS 클래스 수집"""
        classes = set()

        # 현재 요소의 클래스
        if element.get('class'):
            classes.update(element.get('class'))

        # 자식 요소들의 클래스
        for child in element.find_all(True):
            if child.get('class'):
                classes.update(child.get('class'))

        return list(classes)


def build_context_from_sections(sections: List[ExtractedSection]) -> Tuple[str, int]:
    """
    추출된 섹션들로 LLM 컨텍스트 구성

    Returns:
        (html_context, total_size_bytes)
    """
    if not sections:
        return "", 0

    html_parts = []
    for section in sections:
        html_parts.append(f"<!-- section: {section.section_id} -->\n{section.html}")

    context = "\n\n".join(html_parts)
    return context, len(context.encode('utf-8'))
