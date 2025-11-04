"""
Simple single-shot image-to-HTML generation

For simple layout with single image:
- Direct HTML generation without sectioning
- Matches TypeScript Gemini approach with full generation rules
"""

import logging
import base64
from utils.gemini_client import gemini_manager

logger = logging.getLogger(__name__)


async def generate_html_from_image(image_base64: str, mime_type: str, prompt: str = "") -> tuple:
    """
    Generate complete HTML from single image (simple approach)

    Returns:
        tuple: (html_string, success_boolean, error_message)
    """
    logger.info("[Simple Generation] Starting single-shot HTML generation")

    try:
        model, key_number, decrement_usage = gemini_manager.get_client()

        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_base64)

            # Simple prompt - original version
            generation_prompt = f"""당신은 전문 웹 개발자입니다. 제공된 이미지를 분석하여 완전한 HTML 파일을 생성하세요.

이미지의 레이아웃, 텍스트, 색상, 스타일을 최대한 정확하게 복원하세요.

요구사항:
- <!DOCTYPE html>부터 </html>까지 완전한 파일
- TailwindCSS CDN 사용: <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
- 이미지의 레이아웃 구조를 정확하게 유지
- 텍스트 내용을 최대한 정확하게 추출하여 복사
- 색상을 Tailwind 클래스 또는 커스텀 CSS로 재현
- 더미 텍스트는 한국어로
- HTML 코드만 반환 (마크다운 코드블록 없이)

{"사용자 추가 요청: " + prompt if prompt else ""}"""

            # Generate HTML
            response = model.generate_content([
                generation_prompt,
                {
                    'mime_type': mime_type,
                    'data': image_bytes
                }
            ])

            html = response.text.strip()

            # Clean up markdown code blocks if present
            if html.startswith('```html'):
                html = html[7:]
            if html.startswith('```'):
                html = html[3:]
            if html.endswith('```'):
                html = html[:-3]
            html = html.strip()

            logger.info(f"[Simple Generation] HTML generated successfully (API Key #{key_number}, {len(html)} chars)")

            return (html, True, "")

        finally:
            decrement_usage()

    except Exception as e:
        logger.error(f"[Simple Generation] Error: {str(e)}")
        return ("", False, str(e))
