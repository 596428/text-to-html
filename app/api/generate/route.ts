import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
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
    const generatedHTML = await generateHTML(boxes);

    // DOM 파싱하여 data-section-id에 UUID 삽입
    const dom = new JSDOM(generatedHTML);
    const doc = dom.window.document;

    // data-editable="true" 요소들을 찾아서 UUID 부여
    const editableElements = doc.querySelectorAll('[data-editable="true"]');
    editableElements.forEach((el, index) => {
      const box = boxes[index];
      if (box) {
        el.setAttribute('data-section-id', box.sectionId);
      }
    });

    // 최종 HTML 생성
    const finalHTML = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;

    return NextResponse.json({ html: finalHTML });
  } catch (error) {
    console.error('[/api/generate] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'HTML 생성에 실패했습니다.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
