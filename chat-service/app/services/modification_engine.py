"""
Modification Engine

Responsibilities:
- Generate HTML modifications based on user request
- Create Patch objects for local changes
- Generate full HTML for global changes
- Handle special cases like translation

Dependencies:
- app.services.gemini_client
- app.models.chat (Patch, PatchAction, ChatResponse, ChatResponseType)
- app.models.common (AnalysisResult, IntentType, ChangeType)

Implementation Notes:
- Use different strategies for local vs global changes
- Parse Patch JSON from LLM response
- Optimize translation by extracting text nodes
- Always include summary message
"""

from typing import List, Dict, Optional, Any
import json
import time
import logging

from app.models.chat import Patch, PatchAction, ChatResponse, ChatResponseType
from app.models.common import AnalysisResult, IntentType, ChangeType
from app.services.gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class ModificationEngine:
    """
    Generate HTML modifications

    Usage:
        engine = ModificationEngine()

        # For local changes
        response = await engine.process_local_change(
            message="헤더 파란색으로",
            context={"header": "<header>...</header>"},
            analysis=analysis_result
        )

        # For global changes
        response = await engine.process_global_change(
            message="모든 텍스트 영어로",
            full_html="<!DOCTYPE html>...",
            analysis=analysis_result
        )
    """

    def __init__(self):
        """Initialize modification engine"""
        self.gemini = GeminiClient()

    async def process_local_change(
        self,
        message: str,
        context: Dict[str, str],
        analysis: AnalysisResult
    ) -> ChatResponse:
        """
        Process local change request

        Args:
            message: User message
            context: Section ID -> HTML mapping
            analysis: Intent analysis result

        Returns:
            ChatResponse with patches
        """
        start_time = time.time()

        try:
            # Build prompt for patch generation
            prompt = self._build_local_change_prompt(message, context, analysis)

            # Call Gemini
            result = await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.3  # Lower temperature for more consistent JSON
            )

            # Parse patches and summary from response
            patches, summary = self._parse_patches(result["text"])

            processing_time = time.time() - start_time

            # Use summary from LLM, fallback to default message
            response_message = summary if summary else f"수정 패치 {len(patches)}개 생성됨"

            return ChatResponse(
                type=ChatResponseType.PATCH,
                patches=patches,
                message=response_message,
                metadata={
                    "tokens_used": result.get("tokens_used", 0),
                    "processing_time": processing_time
                }
            )

        except Exception as e:
            logger.error(f"Local change processing failed: {e}", exc_info=True)
            processing_time = time.time() - start_time
            return self._create_error_response(
                f"수정 처리 실패: {str(e)}",
                processing_time
            )

    async def process_global_change(
        self,
        message: str,
        full_html: str,
        analysis: AnalysisResult
    ) -> ChatResponse:
        """
        Process global change request

        Args:
            message: User message
            full_html: Full HTML document
            analysis: Intent analysis result

        Returns:
            ChatResponse with modified HTML
        """
        start_time = time.time()

        try:
            # Special handling for translation
            if analysis.change_type == ChangeType.TRANSLATION:
                return await self._process_translation(message, full_html)

            # Build prompt for global modification
            prompt = self._build_global_change_prompt(message, full_html, analysis)

            # Call Gemini
            result = await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.5
            )

            # Extract clean HTML from response
            modified_html = self._extract_html(result["text"])

            processing_time = time.time() - start_time

            return ChatResponse(
                type=ChatResponseType.FULL,
                html=modified_html,
                message="전체 HTML 수정 완료",
                metadata={
                    "tokens_used": result.get("tokens_used", 0),
                    "processing_time": processing_time
                }
            )

        except Exception as e:
            logger.error(f"Global change processing failed: {e}", exc_info=True)
            processing_time = time.time() - start_time
            return self._create_error_response(
                f"전체 수정 처리 실패: {str(e)}",
                processing_time
            )

    async def process_query(
        self,
        message: str,
        context_html: Optional[str] = None
    ) -> ChatResponse:
        """
        Process query request (HTML-related question without modification)

        Args:
            message: User question
            context_html: Optional HTML context for the question

        Returns:
            ChatResponse with answer message (MESSAGE type)
        """
        start_time = time.time()

        try:
            # Build query prompt
            if context_html:
                prompt = f"""다음 HTML에 대한 질문에 답하세요.

## HTML 컨텍스트
{context_html}

## 질문
"{message}"

## 응답
간결하고 명확하게 답변하세요. HTML을 수정하지 말고, 질문에 대한 정보만 제공하세요."""
            else:
                prompt = f"""다음 질문에 답하세요.

## 질문
"{message}"

## 응답
간결하고 명확하게 답변하세요."""

            # Call Gemini
            result = await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.7
            )

            processing_time = time.time() - start_time

            # Return as MESSAGE type (no HTML modification)
            return ChatResponse(
                type=ChatResponseType.MESSAGE,
                message=result["text"].strip(),
                metadata={
                    "tokens_used": result.get("tokens_used", 0),
                    "processing_time": processing_time
                }
            )

        except Exception as e:
            logger.error(f"Query processing failed: {e}", exc_info=True)
            processing_time = time.time() - start_time
            return self._create_error_response(
                f"질문 처리 실패: {str(e)}",
                processing_time
            )

    def process_off_topic(self) -> ChatResponse:
        """
        Process off-topic request (not related to HTML modification)

        Returns a polite decline message without calling Gemini API.

        Returns:
            ChatResponse with decline message (MESSAGE type)
        """
        return ChatResponse(
            type=ChatResponseType.MESSAGE,
            message="죄송합니다. 저는 HTML 수정 전용 어시스턴트입니다. \"헤더 배경색을 파란색으로 바꿔줘\"와 같이 HTML 수정과 관련된 요청을 해주세요.",
            metadata={
                "tokens_used": 0,
                "processing_time": 0.0
            }
        )

    def process_unclear(self) -> ChatResponse:
        """
        Process unclear request (HTML-related but needs clarification)

        Returns a message asking for more details.

        Returns:
            ChatResponse with clarification request (MESSAGE type)
        """
        return ChatResponse(
            type=ChatResponseType.MESSAGE,
            message="요청이 불명확합니다. 어떤 부분을 어떻게 수정하면 좋을지 구체적으로 알려주세요. 예: \"헤더의 배경색을 파란색으로 변경해줘\", \"메인 타이틀 텍스트를 '환영합니다'로 바꿔줘\"",
            metadata={
                "tokens_used": 0,
                "processing_time": 0.0
            }
        )

    async def _process_translation(
        self,
        message: str,
        full_html: str
    ) -> ChatResponse:
        """
        Process translation request efficiently

        Extracts text nodes and translates them separately
        for better token efficiency.

        Args:
            message: User message
            full_html: Full HTML

        Returns:
            ChatResponse with translated HTML
        """
        start_time = time.time()

        try:
            from bs4 import BeautifulSoup

            # Parse HTML
            soup = BeautifulSoup(full_html, 'html.parser')

            # Extract all text nodes (non-empty)
            text_nodes = []
            for text in soup.find_all(string=True):
                if text.strip() and text.parent.name not in ['script', 'style']:
                    text_nodes.append(text.strip())

            # Remove duplicates while preserving order
            unique_texts = list(dict.fromkeys(text_nodes))

            if not unique_texts:
                return self._create_error_response("번역할 텍스트가 없습니다")

            # Build translation prompt
            prompt = f"""다음 텍스트들을 번역하세요.

요청: "{message}"

텍스트 목록:
{chr(10).join(f"{i+1}. {text}" for i, text in enumerate(unique_texts))}

응답 형식 (JSON):
{{
    "translations": [
        "번역된 텍스트 1",
        "번역된 텍스트 2",
        ...
    ]
}}

주의: 순서를 정확히 유지하고, HTML 태그는 포함하지 마세요."""

            # Call Gemini for translation
            result = await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.3
            )

            # Parse translation results
            response_text = result["text"].strip()

            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1] if len(lines) > 2 else lines)

            # Parse JSON
            try:
                translation_data = json.loads(response_text)
                translations = translation_data.get("translations", [])
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse translation JSON: {e}")
                translations = []

            # Create text replacement mapping
            text_map = {unique_texts[i]: translations[i]
                       for i in range(min(len(unique_texts), len(translations)))}

            # Replace text nodes in HTML
            modified_html = full_html
            for original, translated in text_map.items():
                modified_html = modified_html.replace(original, translated)

            processing_time = time.time() - start_time

            return ChatResponse(
                type=ChatResponseType.FULL,
                html=modified_html,
                message=f"{len(translations)}개 텍스트 번역 완료",
                metadata={
                    "tokens_used": result.get("tokens_used", 0),
                    "processing_time": processing_time
                }
            )

        except Exception as e:
            logger.error(f"Translation processing failed: {e}", exc_info=True)
            processing_time = time.time() - start_time
            return self._create_error_response(
                f"번역 처리 실패: {str(e)}",
                processing_time
            )

    def _build_local_change_prompt(
        self,
        message: str,
        context: Dict[str, str],
        analysis: AnalysisResult
    ) -> str:
        """
        Build prompt for local change

        Args:
            message: User message
            context: Section HTML mapping
            analysis: Analysis result

        Returns:
            Prompt string
        """
        # Build HTML sections string
        html_sections = "\n\n".join(
            f"## Section: {section_id}\n{html}"
            for section_id, html in context.items()
        )

        prompt = f"""HTML 섹션을 수정하세요.

## 🎯 가장 중요한 규칙
**사용자가 지정한 값을 절대 변경하지 마세요!**
- 사용자가 "빨간색"이라고 하면 → 반드시 "red" 사용 (orange, crimson 금지)
- 사용자가 "파란색"이라고 하면 → 반드시 "blue" 사용
- 사용자가 "20px"라고 하면 → 반드시 "20px" 사용
- 사용자가 특정 텍스트를 지정하면 → 그대로 사용

## 수정 요청
"{message}"

## 대상 HTML
{html_sections}

## 분석된 작업
- 대상: {analysis.target_description}
- 작업: {analysis.action_description}

## 응답 형식 (JSON)
다음 형식의 JSON으로 응답하세요:

{{
    "patches": [
        {{
            "selector": "CSS 선택자 (예: #header, .button, div.card)",
            "action": "addClass|removeClass|replaceClass|setText|setHtml|setAttribute|removeAttribute|setStyle|removeElement|appendChild|prependChild",
            "oldValue": "기존 값 (setText, replaceClass 등에서 사용)",
            "newValue": "새 값",
            "value": "적용할 값 (단일 값인 경우)"
        }}
    ],
    "summary": "수정 내용 요약"
}}

주의사항:
1. selector는 반드시 유효한 CSS 선택자여야 함
2. setStyle: value에 "속성명: 값" 형식 (예: "background-color: red")
3. setText/setHtml: newValue에 새 내용
4. 여러 요소를 수정해야 하면 patches 배열에 여러 항목 포함"""

        return prompt

    def _build_global_change_prompt(
        self,
        message: str,
        full_html: str,
        analysis: AnalysisResult
    ) -> str:
        """
        Build prompt for global change

        Args:
            message: User message
            full_html: Full HTML
            analysis: Analysis result

        Returns:
            Prompt string
        """
        prompt = f"""전체 HTML 문서를 수정하세요.

## 현재 HTML
{full_html}

## 수정 요청
"{message}"

## 분석된 작업
- 대상: {analysis.target_description}
- 작업: {analysis.action_description}
- 변경 유형: {analysis.change_type}

## 응답 형식
수정된 완전한 HTML 문서를 반환하세요.
마크다운 코드 블록으로 감싸도 좋습니다.

주의사항:
1. HTML 구조를 유지하세요
2. DOCTYPE, html, head, body 태그는 그대로 유지
3. 기존 ID와 클래스는 가능한 유지
4. 요청된 변경사항만 적용
5. 완전히 작동하는 HTML을 반환"""

        return prompt

    def _parse_patches(self, response_text: str) -> tuple[List[Patch], str]:
        """
        Parse patches and summary from LLM response

        Args:
            response_text: Raw response

        Returns:
            Tuple of (List of Patch objects, summary string)
        """
        # Remove markdown code blocks if present
        text = response_text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json or ```) and last line (```)
            text = "\n".join(lines[1:-1] if len(lines) > 2 else lines)
            text = text.strip()

        # Parse JSON
        try:
            data = json.loads(text)
            patches_data = data.get("patches", [])
            summary = data.get("summary", "")

            # Convert to Patch objects
            patches = []
            for patch_dict in patches_data:
                # Validate required fields
                if "selector" not in patch_dict or "action" not in patch_dict:
                    logger.warning(f"Invalid patch (missing selector or action): {patch_dict}")
                    continue

                try:
                    patch = Patch(
                        selector=patch_dict["selector"],
                        action=PatchAction(patch_dict["action"]),
                        old_value=patch_dict.get("oldValue"),
                        new_value=patch_dict.get("newValue"),
                        value=patch_dict.get("value")
                    )
                    patches.append(patch)
                except (ValueError, KeyError) as e:
                    logger.warning(f"Failed to create patch from {patch_dict}: {e}")
                    continue

            return patches, summary

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse patches JSON: {e}")
            logger.error(f"Response text: {text[:500]}")
            return [], ""

    def _extract_html(self, response_text: str) -> str:
        """
        Extract HTML from LLM response

        Remove markdown code blocks if present.

        Args:
            response_text: Raw response

        Returns:
            Clean HTML string
        """
        text = response_text.strip()

        # Remove markdown code blocks
        # Pattern 1: ```html ... ```
        # Pattern 2: ``` ... ```
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line and last line
            if len(lines) > 2:
                text = "\n".join(lines[1:-1])
            else:
                text = "\n".join(lines)
            text = text.strip()

        return text

    def _create_error_response(
        self,
        error_message: str,
        processing_time: float = 0.0
    ) -> ChatResponse:
        """
        Create error response

        Args:
            error_message: Error description
            processing_time: Time spent

        Returns:
            ChatResponse with error
        """
        return ChatResponse(
            type=ChatResponseType.ERROR,
            message=error_message,
            metadata={
                "tokens_used": 0,
                "processing_time": processing_time
            }
        )
