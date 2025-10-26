import { NextRequest, NextResponse } from 'next/server';
import { generateHTML } from '@/lib/gemini';
import { Box } from '@/types';

export const maxDuration = 300; // 5분 (Gemini API 복잡한 HTML 생성 대기)

export async function POST(request: NextRequest) {
  try {
    const { boxes }: { boxes: Box[] } = await request.json();

    // 박스 검증
    if (!boxes || boxes.length === 0) {
      return NextResponse.json(
        { error: '박스를 추가해주세요!' },
        { status: 400 }
      );
    }

    // Gemini API로 HTML 생성
    const html = await generateHTML(boxes);

    return NextResponse.json({ html });
  } catch (error) {
    console.error('[/api/generate] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'HTML 생성에 실패했습니다.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
