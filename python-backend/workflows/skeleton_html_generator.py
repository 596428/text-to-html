"""
Skeleton HTML Generator - JSON 구조를 시각화 HTML로 변환

Phase 1b: JSON structure → Skeleton HTML

주요 수정사항:
1. Absolute layout 높이를 동적으로 계산 (min-height: 800px)
2. Absolute layout 컨테이너에 그리드 배경 추가
3. COLUMN width_percent를 flex-basis로 정확히 적용
4. Absolute box 스타일 개선 (파란색 테두리, 반투명 배경)
"""

import logging

logger = logging.getLogger(__name__)


async def generate_skeleton_html(structure_json: dict) -> tuple:
    """
    Phase 1b: Generate skeleton HTML from layout structure

    Args:
        structure_json: Layout structure JSON from Gemini API

    Returns:
        tuple: (html_string, success_boolean, error_message)
    """
    logger.info("[Skeleton HTML Generator] Generating skeleton HTML from structure")

    try:
        # HTML 헤더 with improved styles
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        /* Absolute layout container styles */
        .absolute-container {
            position: relative;
            min-height: 800px;
            border: 2px dashed #3182ce;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 99px,
                rgba(203, 213, 224, 0.2) 99px,
                rgba(203, 213, 224, 0.2) 100px
            );
        }
        .absolute-box {
            position: absolute;
            border: 2px solid #4299e1;
            background-color: rgba(66, 153, 225, 0.05);
            padding: 0.5rem;
            overflow: hidden;
        }
        .absolute-box .box-label {
            font-size: 0.65rem;
            line-height: 1.2;
            margin-bottom: 0.25rem;
        }
    </style>
</head>
<body class="bg-gray-50 p-4">
    <div class="container mx-auto">
"""

        # Recursive box builder with FIXED column width application
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
                style_attr = f" style=\"position: absolute; left: {x}%; top: {y}%; width: {w}%; height: {h}%;\""

            # Build box HTML
            if position:
                # For absolute positioned boxes, use absolute-box class
                box_html = f"{indent}<div class=\"absolute-box\"{style_attr} data-box-id=\"{box_id}\" data-box-type=\"{box_type}\">\n"
            else:
                box_html = f"{indent}<div class=\"box-outline p-4 mb-4\"{style_attr} data-box-id=\"{box_id}\" data-box-type=\"{box_type}\">\n"

            box_html += f"{indent}    <div class=\"box-label mb-2\">\n"

            # Show box information based on what's available
            if position and crop_region:
                desc_lines = description.split('\n')[0] if description else box_id  # First line only
                box_html += f"{indent}        [{box_type.upper()}] {box_id}<br>\n"
                box_html += f"{indent}        {desc_lines}<br>\n"
                box_html += f"{indent}        Pos: ({position.get('x_percent', 0)}%, {position.get('y_percent', 0)}%, {position.get('width_percent', 100)}%, {position.get('height_percent', 100)}%)\n"
            elif position:
                desc_lines = description.split('\n')[0] if description else box_id
                box_html += f"{indent}        [{box_type.upper()}] {box_id}<br>\n"
                box_html += f"{indent}        {desc_lines}<br>\n"
                box_html += f"{indent}        Pos: ({position.get('x_percent', 0)}%, {position.get('y_percent', 0)}%, {position.get('width_percent', 100)}%, {position.get('height_percent', 100)}%)\n"
            elif crop_region:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"
                box_html += f"{indent}        Crop: ({crop_region.get('x_percent', 0)}%, {crop_region.get('y_percent', 0)}%, {crop_region.get('width_percent', 100)}%, {crop_region.get('height_percent', 100)}%)\n"
            else:
                box_html += f"{indent}        [{box_type.upper()}] {box_id} - {description}\n"

            box_html += f"{indent}    </div>\n"

            # Handle absolute_layout (boxes with positions)
            if box_type == 'absolute_layout' and boxes:
                box_count = len(boxes)
                box_html += f"{indent}    <div class=\"box-label mb-2\">\n"
                box_html += f"{indent}        (Contains {box_count} absolute positioned elements)\n"
                box_html += f"{indent}    </div>\n"
                box_html += f"{indent}    <div class=\"absolute-container\">\n"
                for abs_box in boxes:
                    box_html += build_box(abs_box, depth + 1)
                box_html += f"{indent}    </div>\n"

            # Handle columns (row structure) - FIXED: Use flex-basis for accurate width
            elif columns:
                box_html += f"{indent}    <div class=\"flex gap-4\">\n"
                for col in columns:
                    col_id = col.get('id', 'unknown')
                    col_type = col.get('type', 'column')
                    col_width = col.get('width_percent', 100)
                    col_desc = col.get('description', '')
                    col_nested = col.get('nested_boxes', [])

                    # FIXED: Use flex-basis to apply exact width_percent
                    box_html += f"{indent}        <div class=\"box-outline p-3\" style=\"flex: 0 0 {col_width}%;\" data-box-id=\"{col_id}\" data-box-type=\"{col_type}\">\n"
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
        # Handle multiple JSON formats
        if 'layout' in structure_json:
            # Format: {layout: {boxes: [...]}}
            layout = structure_json['layout']
            if 'boxes' in layout:
                for box in layout['boxes']:
                    html += build_box(box)
            else:
                html += build_box(layout)
        elif 'nested_boxes' in structure_json:
            # Format: {nested_boxes: [...]}
            for box in structure_json['nested_boxes']:
                html += build_box(box)
        elif 'columns' in structure_json or 'boxes' in structure_json:
            # Format: Single root object
            html += build_box(structure_json)
        elif isinstance(structure_json, list):
            # Format: Top-level array
            for box in structure_json:
                html += build_box(box)
        else:
            # Fallback: treat entire JSON as a box
            html += build_box(structure_json)

        # Close HTML
        html += """
    </div>
</body>
</html>
"""

        logger.info("[Skeleton HTML Generator] Skeleton HTML generated successfully")
        return (html, True, "")

    except Exception as e:
        logger.error(f"[Skeleton HTML Generator] Error: {str(e)}")
        return ("", False, str(e))
