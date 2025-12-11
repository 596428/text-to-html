"""
Intent Analyzer

Responsibilities:
- Analyze user request intent using LLM
- Classify into LOCAL_CHANGE, GLOBAL_CHANGE, QUERY, UNCLEAR
- Determine change type (style, content, structure, etc.)
- Decide whether to use search results or full HTML

Dependencies:
- app.services.gemini_client
- app.models.common (IntentType, ChangeType, AnalysisResult)
- app.models.chat (SearchResult)

Implementation Notes:
- Use Gemini for intent classification
- Parse JSON response from LLM
- Handle parsing failures gracefully
- Return confidence scores
"""

from typing import List, Dict, Optional
import json
import re
import logging

from app.models.common import IntentType, ChangeType, AnalysisResult
from app.models.chat import SearchResult
from app.services.gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class IntentAnalyzer:
    """
    Analyze user intent from chat messages

    Usage:
        analyzer = IntentAnalyzer()
        result = await analyzer.analyze(
            message="헤더 색깔 바꿔줘",
            search_results=[...]
        )
        # result.intent - IntentType
        # result.change_type - ChangeType
        # result.use_search_results - bool
    """

    def __init__(self):
        """Initialize intent analyzer"""
        self.gemini = GeminiClient()

    async def analyze(
        self,
        message: str,
        search_results: List[SearchResult],
        context_html: Optional[str] = None
    ) -> AnalysisResult:
        """
        Analyze user message intent

        Args:
            message: User message
            search_results: Vector search results
            context_html: Optional context HTML

        Returns:
            AnalysisResult with intent classification
        """
        try:
            # Build analysis prompt
            prompt = self._build_analysis_prompt(message, search_results)

            # Call Gemini for classification
            response = await self.gemini.generate_content(
                prompt=prompt,
                temperature=0.3,  # Lower temperature for more consistent classification
                max_tokens=500    # Short response expected
            )

            # Parse JSON response
            result = self._parse_analysis_response(response["text"])

            logger.info(
                f"Intent analysis complete: intent={result.intent}, "
                f"confidence={result.confidence:.2f}"
            )

            return result

        except Exception as e:
            logger.error(f"Intent analysis failed: {e}")
            return self._get_fallback_result(len(search_results) > 0)

    def _build_analysis_prompt(
        self,
        message: str,
        search_results: List[SearchResult]
    ) -> str:
        """
        Build prompt for intent analysis

        Args:
            message: User message
            search_results: Search results

        Returns:
            Prompt string
        """
        search_summary = self._summarize_search_results(search_results)

        prompt = f"""당신은 HTML 수정 전문 어시스턴트입니다. 사용자의 요청을 분석하여 HTML 수정과 관련된 요청인지 판단하세요.

## 사용자 요청
"{message}"

## 검색된 관련 HTML 요소
{search_summary}

## 분석 지침 (중요!)

**먼저 요청이 HTML/웹페이지 수정과 관련있는지 판단하세요:**

1. intent: 요청의 의도를 분류하세요
   - "off_topic": HTML/웹페이지와 전혀 관련없는 요청 (예: 날씨, 음식 추천, 일상 대화, 코딩 외 질문 등)
   - "local": 특정 HTML 요소만 수정 (예: 헤더 색상 변경, 버튼 텍스트 변경)
   - "global": 전체 HTML 수정 필요 (예: 전체 번역, 테마 변경)
   - "query": HTML 관련 질문이지만 수정 요청 아님 (예: "이 페이지에 몇 개의 버튼이 있어?")
   - "unclear": HTML 수정 요청 같지만 불명확함 (예: "좀 바꿔줘")

   **off_topic 예시:**
   - "점심 메뉴 추천해줘" → off_topic
   - "오늘 날씨 어때?" → off_topic
   - "파이썬 코드 짜줘" → off_topic
   - "농담 해줘" → off_topic
   - "안녕하세요" → off_topic

   **local/global 예시:**
   - "헤더 배경색 파란색으로" → local
   - "버튼 텍스트를 'Submit'으로" → local
   - "전체 내용 영어로 번역해줘" → global
   - "폰트 사이즈 키워줘" → local/global

2. changeType: 변경 유형 (수정 요청인 경우만, off_topic이면 null)
   - "style": 스타일/색상 변경
   - "content": 텍스트 내용 변경
   - "structure": 구조 변경 (추가/삭제)
   - "translation": 번역
   - "deletion": 삭제

3. targetDescription: 수정 대상 설명 (짧게)
4. actionDescription: 수행할 작업 설명 (짧게)
5. confidence: 분석 확신도 (0.0-1.0)
6. useSearchResults: 검색 결과를 사용할지 여부
7. reasoning: 분석 근거 (짧게)

## JSON 응답 형식 (반드시 JSON만 출력)
{{
    "intent": "off_topic" | "local" | "global" | "query" | "unclear",
    "changeType": "style" | "content" | "structure" | "translation" | "deletion" | null,
    "targetDescription": "대상 설명",
    "actionDescription": "작업 설명",
    "confidence": 0.0-1.0,
    "useSearchResults": true | false,
    "reasoning": "분석 근거"
}}"""

        return prompt

    def _summarize_search_results(
        self,
        results: List[SearchResult]
    ) -> str:
        """
        Summarize search results for prompt

        Args:
            results: Search results

        Returns:
            Summary string
        """
        if not results:
            return "검색된 요소 없음"

        summaries = []
        for i, result in enumerate(results[:5], 1):  # Limit to top 5
            selector = result.selector or "선택자 없음"
            content = result.content[:100] if result.content else "내용 없음"
            score = result.score

            summary = f"{i}. 선택자: {selector}\n   내용: {content}\n   점수: {score:.2f}"
            summaries.append(summary)

        return "\n".join(summaries)

    def _parse_analysis_response(self, response_text: str) -> AnalysisResult:
        """
        Parse LLM response into AnalysisResult

        Args:
            response_text: Raw LLM response

        Returns:
            Parsed AnalysisResult
        """
        try:
            # Try multiple extraction strategies
            data = self._extract_json(response_text)

            if not data:
                # Fallback: try to extract intent from raw text
                return self._extract_from_raw_text(response_text)

            # Convert camelCase to snake_case for field names
            intent_str = data.get("intent", "unclear")
            change_type_str = data.get("changeType")

            # Convert to enums
            try:
                intent = IntentType(intent_str)
            except ValueError:
                logger.warning(f"Invalid intent value: {intent_str}, defaulting to UNCLEAR")
                intent = IntentType.UNCLEAR

            change_type = None
            if change_type_str:
                try:
                    change_type = ChangeType(change_type_str)
                except ValueError:
                    logger.warning(f"Invalid changeType value: {change_type_str}")

            # Create AnalysisResult (handle null values from LLM)
            return AnalysisResult(
                intent=intent,
                change_type=change_type,
                target_description=data.get("targetDescription") or "",
                action_description=data.get("actionDescription") or "",
                confidence=float(data.get("confidence") or 0.5),
                use_search_results=bool(data.get("useSearchResults", False)),
                reasoning=data.get("reasoning") or ""
            )

        except Exception as e:
            logger.error(f"Error parsing analysis response: {e}")
            return self._get_fallback_result(False)

    def _extract_json(self, text: str) -> Optional[Dict]:
        """
        Try multiple strategies to extract JSON from LLM response

        Args:
            text: Raw LLM response

        Returns:
            Parsed dict or None
        """
        # Strategy 1: Remove markdown code blocks
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        # Try parsing directly
        try:
            return json.loads(clean_text)
        except json.JSONDecodeError:
            pass

        # Strategy 2: Find JSON object in text using regex
        json_match = re.search(r'\{[^{}]*"intent"[^{}]*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Strategy 3: Find JSON with nested braces
        brace_match = re.search(r'\{(?:[^{}]|\{[^{}]*\})*\}', text, re.DOTALL)
        if brace_match:
            try:
                return json.loads(brace_match.group())
            except json.JSONDecodeError:
                pass

        # Strategy 4: Try to fix truncated JSON
        # Find the start of JSON and try to complete it
        if "{" in text:
            json_start = text.index("{")
            partial_json = text[json_start:]

            # Try to fix common issues
            # Add missing closing brace
            if partial_json.count("{") > partial_json.count("}"):
                partial_json += "}" * (partial_json.count("{") - partial_json.count("}"))

            # Fix trailing commas
            partial_json = re.sub(r',\s*}', '}', partial_json)
            partial_json = re.sub(r',\s*$', '', partial_json)

            # Fix unterminated strings by finding last complete key-value
            try:
                return json.loads(partial_json)
            except json.JSONDecodeError:
                pass

        logger.warning(f"All JSON extraction strategies failed for: {text[:200]}...")
        return None

    def _extract_from_raw_text(self, text: str) -> AnalysisResult:
        """
        Fallback: Extract intent from raw text using pattern matching

        Args:
            text: Raw LLM response

        Returns:
            AnalysisResult with extracted info
        """
        text_lower = text.lower()

        # Try to detect intent from text
        intent = IntentType.UNCLEAR
        change_type = None
        confidence = 0.4

        if '"intent": "local"' in text_lower or '"intent":"local"' in text_lower:
            intent = IntentType.LOCAL_CHANGE
            confidence = 0.7
        elif '"intent": "global"' in text_lower or '"intent":"global"' in text_lower:
            intent = IntentType.GLOBAL_CHANGE
            confidence = 0.7
        elif '"intent": "query"' in text_lower or '"intent":"query"' in text_lower:
            intent = IntentType.QUERY
            confidence = 0.7
        elif '"intent": "off_topic"' in text_lower or '"intent":"off_topic"' in text_lower:
            intent = IntentType.OFF_TOPIC
            confidence = 0.7

        # Try to detect change type
        if '"changetype": "style"' in text_lower or '"changetype":"style"' in text_lower:
            change_type = ChangeType.STYLE
        elif '"changetype": "content"' in text_lower or '"changetype":"content"' in text_lower:
            change_type = ChangeType.CONTENT

        logger.info(f"Extracted from raw text: intent={intent}, confidence={confidence}")

        return AnalysisResult(
            intent=intent,
            change_type=change_type,
            target_description="",
            action_description="",
            confidence=confidence,
            use_search_results=True,
            reasoning="Extracted from malformed JSON response"
        )

    def _get_fallback_result(self, has_search_results: bool) -> AnalysisResult:
        """
        Get fallback result when analysis fails

        Args:
            has_search_results: Whether search results exist

        Returns:
            Default AnalysisResult
        """
        return AnalysisResult(
            intent=IntentType.UNCLEAR,
            change_type=None,
            target_description="",
            action_description="",
            confidence=0.3,
            use_search_results=has_search_results,
            reasoning="Analysis failed, using fallback"
        )
