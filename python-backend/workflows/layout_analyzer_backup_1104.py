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

            # Layout analysis prompt - v7: add non-uniform layout handling
            analysis_prompt = """이미지를 분석하여 레이아웃 구조를 JSON으로 추출하세요.

목표: 이미지를 의미있는 그룹 단위로 분해하여 행/열 구조 파악

분석 원칙:
1. **전체 구조 파악**: 이미지 전체를 분석 (헤더, 메인, 푸터 등)
2. **좌우 분할 인식**: 세로 경계선이나 명확한 공백으로 좌우가 나뉘면 columns 사용
   - 우측이 작아도 상관없음 (예: 좌 80% + 우 20%)
   - 시각적 공간 기준으로 판단, 컨텐츠 연관성 무시
3. **비정형 레이아웃 감지 및 처리**:
   - 각 행을 개별적으로 관찰하여 좌우 분할 여부 확인
   - 1행은 좌우로 나뉘고, 2행은 나뉘지 않거나, 비율이 다르면 → 비정형!
   - 비정형이면 type을 "absolute_layout"으로 설정
   - 모든 정보 단위(섹션)의 절대 위치를 position으로 표현
   - position: {x_percent, y_percent, width_percent, height_percent}
   - 정보 단위: 제목으로 구분된 각 섹션
4. **세로 배치**: 박스들이 위아래로 순서대로 있으면 row들을 세로로 쌓기
5. **병합된 셀**: 한 요소가 여러 행/열을 차지하면 rowspan/colspan 추가
6. **의미있는 그룹**: 함께 동작하는 컴포넌트들을 하나의 박스로
7. **과도한 분해 금지**: 개별 버튼/입력필드까지 쪼개지 말고 그룹 단위로

박스 타입:
- row: 수평으로 배치된 여러 컬럼 포함
- column: row 안의 세로 영역 (width_percent 필수)
- absolute_layout: 비정형 레이아웃 (boxes 배열, 각 박스에 position 속성)
- nav_tabs: 탭 네비게이션
- form_section: 폼 영역
- table: 테이블
- button_group: 버튼 그룹
- input_group: 라벨+입력필드 세트

JSON 구조 예시:

기본 구조:
{
  "id": "unique_id",
  "type": "row",
  "description": "설명",
  "columns": [
    {
      "id": "col_1",
      "type": "column",
      "width_percent": 50,
      "description": "좌측 영역",
      "nested_boxes": [...]
    },
    {
      "id": "col_2",
      "type": "column",
      "width_percent": 50,
      "description": "우측 영역",
      "nested_boxes": [...]
    }
  ]
}

병합된 셀:
{
  "id": "row_merged",
  "type": "row",
  "description": "병합 셀이 있는 행",
  "columns": [
    {
      "id": "col_a",
      "type": "input_group",
      "width_percent": 20,
      "description": "일반 셀",
      "rowspan": 1
    },
    {
      "id": "col_b",
      "type": "input_group",
      "width_percent": 60,
      "description": "병합 셀 (2행 차지)",
      "rowspan": 2
    },
    {
      "id": "col_c",
      "type": "button_group",
      "width_percent": 20,
      "description": "일반 셀",
      "rowspan": 1
    }
  ]
}

핵심 규칙:
1. **전체 이미지 분석**: 헤더부터 푸터까지 모든 영역 포함
2. **좌우 분할**: 세로 경계선/공백으로 나뉘면 columns 사용 (우측이 작아도 OK)
3. **비정형 감지**: 행마다 좌우 비율이 다르면 absolute_layout + position 사용
4. **rowspan 신중히**: 진짜 병합된 셀에만 사용 (일반 그리드 레이아웃만)
5. **Table 간단하게**: description만, 내부 구조 생략 가능
6. **width_percent 정확**: 각 column 비율 합계 100
7. **JSON만 반환**: 마크다운 코드블록 없이 순수 JSON

이미지를 분석하여 행/열 기반 레이아웃 구조 JSON을 생성하세요."""

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

            # Show position info if exists
            if position:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description} @ ({position.get('x_percent', 0)}%, {position.get('y_percent', 0)}%, {position.get('width_percent', 100)}%, {position.get('height_percent', 100)}%)\n"
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
