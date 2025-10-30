import { NextRequest, NextResponse } from 'next/server';
import { modifyHTML } from '@/lib/gemini';

export const maxDuration = 300; // 5분 (Gemini API 복잡한 HTML 수정 대기)

export async function POST(request: NextRequest) {
  try {
    // 요청 IP 추출
    const requestIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const { currentHTML, userRequest }: { currentHTML: string; userRequest: string } = await request.json();

    // 입력 검증
    if (!currentHTML) {
      return NextResponse.json(
        { error: '먼저 HTML을 생성해주세요!' },
        { status: 400 }
      );
    }

    if (!userRequest || !userRequest.trim()) {
      return NextResponse.json(
        { error: '수정 요청을 입력해주세요!' },
        { status: 400 }
      );
    }

    // Gemini API로 HTML 수정 (IP 전달)
    const modifiedHTML = await modifyHTML(currentHTML, userRequest.trim(), requestIp);

    return NextResponse.json({ html: modifiedHTML });
  } catch (error) {
    console.error('[/api/modify] Error:', error);

    const errorMessage = error instanceof Error ? error.message : '수정에 실패했습니다.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
