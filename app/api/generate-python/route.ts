/**
 * Next.js API Route: Python Backend Integration
 *
 * Phase 3: Test connection to Python server
 * Phase 4+: Will forward image-to-HTML requests to LangGraph
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_base64, mime_type, prompt } = body;

    console.log('[Python API] Forwarding request to Python backend...');

    // Forward request to Python server
    const response = await fetch(`${PYTHON_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64,
        mime_type: mime_type || 'image/jpeg',
        prompt: prompt || '',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Python API] Error from Python server:', errorText);
      throw new Error(`Python server error: ${response.status}`);
    }

    const data = await response.json();

    console.log('[Python API] Response received from Python backend');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[Python API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate HTML from Python backend' },
      { status: 500 }
    );
  }
}

// Test endpoint for simple connection check
export async function GET() {
  try {
    const response = await fetch(`${PYTHON_API_URL}/status`);

    if (!response.ok) {
      throw new Error(`Python server status check failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      nextjs: 'healthy',
      python: data,
      connection: 'successful',
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        nextjs: 'healthy',
        python: 'unreachable',
        connection: 'failed',
        error: error.message
      },
      { status: 500 }
    );
  }
}
