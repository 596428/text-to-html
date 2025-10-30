import { NextRequest, NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';
import { generateHTML } from '@/lib/gemini';
import { Box } from '@/types';

export const maxDuration = 300; // 5분 (Gemini API 복잡한 HTML 생성 대기)

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let boxes: Box[];
    let imageFiles: { [boxId: string]: File[] } = {};

    // Content-Type에 따라 파싱 방식 결정
    if (contentType?.includes('multipart/form-data')) {
      // FormData로 이미지 + 박스 정보 받기
      const formData = await request.formData();
      const boxesJson = formData.get('boxes') as string;
      boxes = JSON.parse(boxesJson);

      // 각 박스별 이미지 파일 추출
      boxes.forEach((box) => {
        if (box.images && box.images.length > 0) {
          const files: File[] = [];
          box.images.forEach((_, idx) => {
            const file = formData.get(`image_${box.id}_${idx}`) as File;
            if (file) {
              files.push(file);
            }
          });
          if (files.length > 0) {
            imageFiles[box.id] = files;
          }
        }
      });
    } else {
      // JSON으로 박스 정보만 받기 (이미지 없는 경우)
      const data = await request.json();
      boxes = data.boxes;
    }

    // 박스 검증
    if (!boxes || boxes.length === 0) {
      return NextResponse.json(
        { error: '박스를 추가해주세요!' },
        { status: 400 }
      );
    }

    // Gemini API로 HTML 생성 (이미지 파일 포함)
    const generatedHTML = await generateHTML(boxes, imageFiles);

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
