"""
Layout Structure Analyzer - Phase 1

Analyzes image to extract layout structure and generate skeleton HTML
"""

import logging
import base64
import json
from utils.gemini_client import gemini_manager

logger = logging.getLogger(__name__)


async def analyze_layout_structure(image_base64: str, mime_type: str) -> tuple:
    """
    Phase 1: Analyze image and extract layout structure as JSON

    Returns:
        tuple: (structure_json, success_boolean, error_message)
    """
    logger.info("[Layout Analyzer] Starting layout structure analysis")

    try:
        model, key_number, decrement_usage = gemini_manager.get_client()

        try:
            # Decode base64 image
            image_bytes = base64.b64decode(image_base64)

            # Layout analysis prompt - v9: simplified, section-level only with crop positions
            analysis_prompt = """이미지를 분석하여 레이아웃 구조를 JSON으로 추출하세요.

**목표**: Phase 2에서 상세 분석할 수 있도록 큰 섹션 단위로만 구조 파악

**분석 수준 (중요)**:
1. **Top Level**: 전체 레이아웃 구조 (Header / Main / Sidebar / Footer 등)
2. **Section Level**: 제목이나 경계선으로 구분되는 의미있는 섹션 단위
   - 예: "질환력 폼", "흡연 관련 문항", "음주 테이블", "우울증 평가" 등
3. **생략**: 개별 입력필드, 버튼, 라벨은 분석하지 않음
   - ❌ "사업장", "대표", "주민번호" 같은 필드 분석 금지
   - ❌ "저장", "완료", "삭제" 같은 개별 버튼 분석 금지
   - ✅ "버튼 그룹", "입력 영역" 정도로만 표현

**필수: 모든 섹션에 crop_region 추가**:
- 모든 box/column에 crop_region 속성 필수
- crop_region: {x_percent, y_percent, width_percent, height_percent}
- 이 정보로 Phase 2에서 이미지 크롭하여 상세 분석 진행

**레이아웃 타입**:
1. **정형 레이아웃 (regular grid)**:
   - 좌우 비율이 일정하게 유지되는 경우
   - row → columns 구조 사용
   - 각 column에 crop_region 필수

2. **비정형 레이아웃 (absolute positioning)**:
   - 행마다 좌우 비율이 다른 경우
   - type: "absolute_layout" 사용
   - boxes 배열에 각 섹션의 position 정보 포함

**박스 타입**:
- section: 일반 섹션 (제목으로 구분된 영역)
- form_section: 폼 영역
- table_section: 테이블 영역
- nav_section: 네비게이션
- button_group: 버튼 그룹
- sidebar: 사이드바

**JSON 구조 예시**:

정형 레이아웃 (좌우 비율 일정):
{
  "id": "root",
  "type": "row",
  "description": "전체 페이지",
  "columns": [
    {
      "id": "main_content",
      "type": "column",
      "width_percent": 85,
      "description": "메인 콘텐츠 영역",
      "crop_region": {
        "x_percent": 0,
        "y_percent": 0,
        "width_percent": 85,
        "height_percent": 100
      },
      "nested_boxes": [
        {
          "id": "disease_section",
          "type": "form_section",
          "description": "질환력 관련 폼",
          "crop_region": {
            "x_percent": 0,
            "y_percent": 10,
            "width_percent": 85,
            "height_percent": 30
          }
        }
      ]
    },
    {
      "id": "sidebar",
      "type": "sidebar",
      "width_percent": 15,
      "description": "우측 사이드바",
      "crop_region": {
        "x_percent": 85,
        "y_percent": 0,
        "width_percent": 15,
        "height_percent": 100
      }
    }
  ]
}

비정형 레이아웃 (좌우 비율 불규칙):
{
  "id": "root",
  "type": "row",
  "description": "전체 페이지",
  "columns": [
    {
      "id": "main_content",
      "type": "column",
      "width_percent": 85,
      "description": "메인 콘텐츠 영역",
      "crop_region": {
        "x_percent": 0,
        "y_percent": 0,
        "width_percent": 85,
        "height_percent": 100
      },
      "nested_boxes": [
        {
          "id": "content_absolute_layout",
          "type": "absolute_layout",
          "description": "비정형 콘텐츠 배치",
          "boxes": [
            {
              "id": "disease_section",
              "type": "form_section",
              "description": "질환력 폼",
              "position": {
                "x_percent": 0,
                "y_percent": 0,
                "width_percent": 68,
                "height_percent": 25
              },
              "crop_region": {
                "x_percent": 0,
                "y_percent": 0,
                "width_percent": 68,
                "height_percent": 25
              }
            },
            {
              "id": "alcohol_table",
              "type": "table_section",
              "description": "음주량 테이블",
              "position": {
                "x_percent": 68,
                "y_percent": 0,
                "width_percent": 32,
                "height_percent": 25
              },
              "crop_region": {
                "x_percent": 68,
                "y_percent": 0,
                "width_percent": 32,
                "height_percent": 25
              }
            }
          ]
        }
      ]
    }
  ]
}

**핵심 규칙**:
1. **큰 단위만**: 제목/경계선으로 구분되는 섹션 단위로만 분할
2. **crop_region 필수**: 모든 섹션에 crop_region 포함
3. **비정형 감지**: 행마다 좌우 비율 다르면 absolute_layout
4. **세부 생략**: 개별 필드/버튼은 Phase 2에서 처리
5. **JSON만 반환**: 마크다운 코드블록 없이 순수 JSON

이미지를 큰 섹션 단위로만 분석하여 JSON을 생성하세요."""

            # Generate structure
            response = model.generate_content([
                analysis_prompt,
                {
                    'mime_type': mime_type,
                    'data': image_bytes
                }
            ])

            structure_text = response.text.strip()

            # Clean up markdown code blocks if present
            if structure_text.startswith('```json'):
                structure_text = structure_text[7:]
            if structure_text.startswith('```'):
                structure_text = structure_text[3:]
            if structure_text.endswith('```'):
                structure_text = structure_text[:-3]
            structure_text = structure_text.strip()

            # Validate JSON
            try:
                structure_json = json.loads(structure_text)
                logger.info(f"[Layout Analyzer] Structure extracted successfully (API Key #{key_number})")
                return (structure_json, True, "")
            except json.JSONDecodeError as e:
                logger.error(f"[Layout Analyzer] Invalid JSON: {e}")
                return ({}, False, f"Invalid JSON: {e}")

        finally:
            decrement_usage()

    except Exception as e:
        logger.error(f"[Layout Analyzer] Error: {str(e)}")
        return ({}, False, str(e))


async def generate_skeleton_html(structure_json: dict) -> tuple:
    """
    Phase 1b: Generate skeleton HTML from layout structure

    Returns:
        tuple: (html_string, success_boolean, error_message)
    """
    logger.info("[Layout Analyzer] Generating skeleton HTML from structure")

    try:
        html = """<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Layout Skeleton</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        .box-outline {
            border: 2px dashed #cbd5e0;
            background-color: rgba(203, 213, 224, 0.1);
            min-height: 50px;
        }
        .box-label {
            font-size: 0.75rem;
            color: #718096;
            padding: 0.25rem 0.5rem;
            background-color: rgba(203, 213, 224, 0.3);
        }
    </style>
</head>
<body class="bg-gray-50 p-4">
    <div class="container mx-auto">
"""

        # Recursive box builder supporting nested_boxes, columns, and absolute_layout
        def build_box(box, depth=0):
            box_id = box.get('id', 'unknown')
            box_type = box.get('type', 'unknown')
            description = box.get('description', '')
            nested_boxes = box.get('nested_boxes', [])
            columns = box.get('columns', [])
            boxes = box.get('boxes', [])  # For absolute_layout
            position = box.get('position', None)  # For positioned boxes
            crop_region = box.get('crop_region', None)  # For Phase 2 cropping

            indent = '    ' * (depth + 2)

            # Add position styling if exists
            style_attr = ""
            if position:
                x = position.get('x_percent', 0)
                y = position.get('y_percent', 0)
                w = position.get('width_percent', 100)
                h = position.get('height_percent', 100)
                style_attr = f" style=\"position: absolute; left: {x}%; top: {y}%; width: {w}%; height: {h};\""

            box_html = f"{indent}<div class=\"box-outline p-4 mb-4\"{style_attr} data-box-id=\"{box_id}\" data-box-type=\"{box_type}\">\n"
            box_html += f"{indent}    <div class=\"box-label mb-2\">\n"

            # Show position and crop info if exists
            if position and crop_region:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"
                box_html += f"{indent}        Position: ({position.get('x_percent', 0)}%, {position.get('y_percent', 0)}%, {position.get('width_percent', 100)}%, {position.get('height_percent', 100)}%)\n"
                box_html += f"{indent}        Crop: ({crop_region.get('x_percent', 0)}%, {crop_region.get('y_percent', 0)}%, {crop_region.get('width_percent', 100)}%, {crop_region.get('height_percent', 100)}%)\n"
            elif position:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"
                box_html += f"{indent}        Position: ({position.get('x_percent', 0)}%, {position.get('y_percent', 0)}%, {position.get('width_percent', 100)}%, {position.get('height_percent', 100)}%)\n"
            elif crop_region:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"
                box_html += f"{indent}        Crop: ({crop_region.get('x_percent', 0)}%, {crop_region.get('y_percent', 0)}%, {crop_region.get('width_percent', 100)}%, {crop_region.get('height_percent', 100)}%)\n"
            else:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"
            box_html += f"{indent}    </div>\n"

            # Handle absolute_layout (boxes with positions)
            if box_type == 'absolute_layout' and boxes:
                box_html += f"{indent}    <div class=\"relative\" style=\"position: relative; min-height: 500px; border: 2px dashed #3182ce;\">\n"
                for abs_box in boxes:
                    box_html += build_box(abs_box, depth + 1)
                box_html += f"{indent}    </div>\n"

            # Handle columns (row structure)
            elif columns:
                box_html += f"{indent}    <div class=\"flex gap-4\">\n"
                for col in columns:
                    col_id = col.get('id', 'unknown')
                    col_type = col.get('type', 'column')
                    col_width = col.get('width_percent', 100)
                    col_desc = col.get('description', '')
                    col_nested = col.get('nested_boxes', [])

                    box_html += f"{indent}        <div class=\"box-outline flex-1 p-3\" style=\"width: {col_width}%;\" data-box-id=\"{col_id}\" data-box-type=\"{col_type}\">\n"
                    box_html += f"{indent}            <div class=\"box-label mb-1 text-xs\">\n"
                    box_html += f"{indent}                [{col_type.upper()}] {col_id} ({col_width}%)\n"
                    box_html += f"{indent}            </div>\n"
                    box_html += f"{indent}            <div class=\"text-xs text-gray-600\">{col_desc}</div>\n"

                    # Handle nested boxes in column
                    if col_nested:
                        for nested in col_nested:
                            box_html += build_box(nested, depth + 3)

                    box_html += f"{indent}        </div>\n"
                box_html += f"{indent}    </div>\n"

            # Handle nested_boxes (non-row structure)
            elif nested_boxes:
                for nested in nested_boxes:
                    box_html += build_box(nested, depth + 1)

            box_html += f"{indent}</div>\n"
            return box_html

        # Build HTML from layout structure
        # Handle multiple JSON formats:
        # 1. {layout: {boxes: [...]}}
        # 2. {nested_boxes: [...]}
        # 3. Single root object {id, type, columns/nested_boxes}
        # 4. Top-level array [{}, {}, ...]
        if isinstance(structure_json, list):
            # Format 4: Top-level array
            boxes = structure_json
        elif 'layout' in structure_json:
            boxes = structure_json['layout'].get('boxes', [])
        elif 'nested_boxes' in structure_json and isinstance(structure_json['nested_boxes'], list):
            boxes = structure_json['nested_boxes']
        elif 'id' in structure_json and 'type' in structure_json:
            # Single root object - treat as single box
            boxes = [structure_json]
        else:
            boxes = []

        for box in boxes:
            html += build_box(box)

        html += """
    </div>
</body>
</html>"""

        logger.info("[Layout Analyzer] Skeleton HTML generated successfully")
        return (html, True, "")

    except Exception as e:
        logger.error(f"[Layout Analyzer] Error generating skeleton: {str(e)}")
        return ("", False, str(e))


async def analyze_and_generate_skeleton(image_base64: str, mime_type: str) -> tuple:
    """
    Complete Phase 1: Analyze layout and generate skeleton HTML

    Returns:
        tuple: (html_string, structure_json, success_boolean, error_message)
    """
    # Step 1: Analyze structure
    structure_json, success, error = await analyze_layout_structure(image_base64, mime_type)

    if not success:
        return ("", {}, False, error)

    # Step 2: Generate skeleton
    skeleton_html, success, error = await generate_skeleton_html(structure_json)

    if not success:
        return ("", structure_json, False, error)

    return (skeleton_html, structure_json, True, "")
