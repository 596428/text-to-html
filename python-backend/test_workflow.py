"""
Simple test script for image-to-HTML workflow

Creates a minimal test image and tests the workflow
"""

import base64
import requests
import json
from PIL import Image, ImageDraw, ImageFont
import io

def create_test_image():
    """Create a simple test image with text"""
    # Create a 800x600 image with white background
    img = Image.new('RGB', (800, 600), color='white')
    draw = ImageDraw.Draw(img)

    # Draw header section
    draw.rectangle([(0, 0), (800, 80)], fill='#3b82f6')  # Blue header
    draw.text((400, 40), "My Website Header", fill='white', anchor='mm')

    # Draw main content section
    draw.rectangle([(50, 120), (750, 500)], outline='#d1d5db', width=2)
    draw.text((400, 250), "Main Content Area", fill='black', anchor='mm')
    draw.text((400, 300), "This is a test website layout", fill='#6b7280', anchor='mm')

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

    return image_base64


def test_workflow():
    """Test the complete image-to-HTML workflow"""
    print("[Test] Creating test image...")
    image_base64 = create_test_image()

    print("[Test] Sending request to workflow...")
    response = requests.post(
        'http://localhost:8000/generate',
        json={
            'image_base64': image_base64,
            'mime_type': 'image/png',
            'prompt': 'Create a simple website with a blue header and main content area'
        },
        timeout=120  # 2 minutes timeout for workflow
    )

    print(f"[Test] Response status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"[Test] Success: {data['success']}")
        print(f"[Test] Message: {data['message']}")

        # Save HTML to file
        output_file = '/tmp/test_output.html'
        with open(output_file, 'w') as f:
            f.write(data['html'])

        print(f"[Test] HTML saved to: {output_file}")
        print(f"[Test] HTML length: {len(data['html'])} characters")

        # Show first 500 chars
        print("\n[Test] HTML preview (first 500 chars):")
        print(data['html'][:500])
    else:
        print(f"[Test] Error: {response.text}")


if __name__ == "__main__":
    test_workflow()
