#!/usr/bin/env python3
"""
Layout Analyzer Test Script

Usage:
    python3 scripts/test_layout_analyzer.py --image 그림3.png --version v10
    python3 scripts/test_layout_analyzer.py --image 그림3_02.png --version v10
    python3 scripts/test_layout_analyzer.py --all  # Test all images
"""

import asyncio
import base64
import json
import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from workflows.layout_analyzer import analyze_and_generate_skeleton


async def test_image(image_name: str, version_suffix: str = ""):
    """Test layout analyzer with a specific image"""

    # Paths
    testcase_dir = Path(__file__).parent.parent.parent / "Testcase" / "1104"
    image_path = testcase_dir / image_name

    if not image_path.exists():
        print(f"❌ Image not found: {image_path}")
        return False

    # Generate output filenames
    base_name = image_path.stem
    version_tag = f"-{version_suffix}" if version_suffix else ""

    print(f"=== Testing {image_name}{f' ({version_suffix})' if version_suffix else ''} ===\n")

    try:
        # Read and encode image
        with open(image_path, 'rb') as f:
            img_data = base64.b64encode(f.read()).decode('utf-8')

        # Analyze layout
        skel, struct, success, err = await analyze_and_generate_skeleton(
            img_data,
            'image/png'
        )

        if not success:
            print(f"✗ FAILED: {err}\n")
            return False

        # Save outputs
        structure_file = testcase_dir / f"layout-structure-{base_name}{version_tag}.json"
        skeleton_file = testcase_dir / f"skeleton-{base_name}{version_tag}.html"

        with open(structure_file, 'w', encoding='utf-8') as f:
            json.dump(struct, f, ensure_ascii=False, indent=2)

        with open(skeleton_file, 'w', encoding='utf-8') as f:
            f.write(skel)

        # Analysis
        print(f"✓ SUCCESS: {len(skel)} chars skeleton")
        print(f"📁 Structure: {structure_file.name}")
        print(f"📁 Skeleton: {skeleton_file.name}\n")

        # Check for crop_region
        has_crop = 'crop_region' in json.dumps(struct)
        print(f"📦 Has crop_region: {has_crop}")

        # Count sections
        def count_sections(obj):
            if isinstance(obj, dict):
                count = 1 if obj.get('type') in [
                    'form_section', 'table', 'nav_tabs',
                    'button_group', 'input_group',
                    'header_area', 'footer_area'
                ] else 0
                for v in obj.values():
                    count += count_sections(v)
                return count
            elif isinstance(obj, list):
                return sum(count_sections(item) for item in obj)
            return 0

        section_count = count_sections(struct)
        print(f"📊 Section count: {section_count}")

        # Show top-level structure
        if isinstance(struct, dict):
            print(f"\n🔍 Root type: {struct.get('type', 'unknown')}")

            if 'columns' in struct:
                print(f"  Columns: {len(struct['columns'])}")
                for col in struct['columns']:
                    width = col.get('width_percent', 0)
                    desc = col.get('description', 'N/A')
                    print(f"    - {col.get('id')}: {width}% ({desc})")

            # Check for absolute_layout
            def find_abs_layout(obj, path=""):
                results = []
                if isinstance(obj, dict):
                    if obj.get('type') == 'absolute_layout':
                        results.append((path, obj))
                    for k, v in obj.items():
                        results.extend(find_abs_layout(v, f"{path}.{k}" if path else k))
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        results.extend(find_abs_layout(item, f"{path}[{i}]"))
                return results

            abs_layouts = find_abs_layout(struct)
            if abs_layouts:
                print(f"\n📐 Found {len(abs_layouts)} absolute_layout section(s)")
                for path, layout in abs_layouts:
                    boxes = layout.get('boxes', [])
                    print(f"  Path: {path}")
                    print(f"  Boxes: {len(boxes)}")

        print("\n" + "="*60 + "\n")
        return True

    except Exception as e:
        print(f"✗ ERROR: {str(e)}\n")
        return False


async def main():
    parser = argparse.ArgumentParser(
        description="Test Layout Analyzer with various images and versions"
    )
    parser.add_argument(
        '--image',
        type=str,
        help='Image filename (e.g., 그림3.png, 그림3_02.png)'
    )
    parser.add_argument(
        '--version',
        type=str,
        default="",
        help='Version suffix for output files (e.g., v10, v9)'
    )
    parser.add_argument(
        '--all',
        action='store_true',
        help='Test all known images'
    )

    args = parser.parse_args()

    if args.all:
        # Test all common images
        images = [
            '그림3.png',
            '그림3_02.png'
        ]

        results = []
        for img in images:
            success = await test_image(img, args.version)
            results.append((img, success))

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        for img, success in results:
            status = "✓ PASS" if success else "✗ FAIL"
            print(f"{status}: {img}")

    elif args.image:
        await test_image(args.image, args.version)

    else:
        parser.print_help()


if __name__ == '__main__':
    asyncio.run(main())
