"""
Layout Structure Analyzer - Phase 1
Combines JSON generation and HTML conversion

이 파일은 backward compatibility를 위한 wrapper입니다.
실제 로직은 다음 파일로 분리되었습니다:
- layout_structure_generator.py: JSON 생성 (Gemini API)
- skeleton_html_generator.py: JSON → HTML 변환
"""

import logging
from workflows.layout_structure_generator import analyze_layout_structure
from workflows.skeleton_html_generator import generate_skeleton_html

logger = logging.getLogger(__name__)


async def analyze_and_generate_skeleton(image_base64: str, mime_type: str) -> tuple:
    """
    Phase 1: Analyze image and generate skeleton HTML

    This is a convenience function that combines:
    1. Gemini API call to get JSON structure
    2. JSON to HTML conversion

    Args:
        image_base64: Base64 encoded image data
        mime_type: Image MIME type (e.g., 'image/png')

    Returns:
        tuple: (skeleton_html, structure_json, success_boolean, error_message)
    """
    logger.info("[Layout Analyzer] Starting layout analysis and skeleton generation")

    try:
        # Step 1: Generate JSON structure via Gemini
        structure_json, struct_success, struct_error = await analyze_layout_structure(image_base64, mime_type)

        if not struct_success:
            logger.error(f"[Layout Analyzer] Structure generation failed: {struct_error}")
            return ("", {}, False, struct_error)

        # Step 2: Convert JSON to HTML
        skeleton_html, html_success, html_error = await generate_skeleton_html(structure_json)

        if not html_success:
            logger.error(f"[Layout Analyzer] HTML generation failed: {html_error}")
            return ("", structure_json, False, html_error)

        logger.info("[Layout Analyzer] Successfully generated skeleton HTML")
        return (skeleton_html, structure_json, True, "")

    except Exception as e:
        logger.error(f"[Layout Analyzer] Unexpected error: {str(e)}")
        return ("", {}, False, str(e))
