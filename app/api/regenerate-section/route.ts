import { NextRequest, NextResponse } from 'next/server';
import { scaleSectionInHTML } from '@/lib/htmlScaler';
import { Box } from '@/types';

export const maxDuration = 60; // 1분 (빠른 처리)

export async function POST(request: NextRequest) {
  try {
    const {
      boxId,
      scalePercentage,
      boxes,
      currentHTML
    }: {
      boxId: string;
      scalePercentage: number;
      boxes: Box[];
      currentHTML: string;
    } = await request.json();

    // 검증
    if (!boxId || !scalePercentage || !boxes || !currentHTML) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 유효한 배율 검증 (50~200 사이의 자연수)
    if (!Number.isInteger(scalePercentage) || scalePercentage < 50 || scalePercentage > 200) {
      return NextResponse.json(
        { error: `유효하지 않은 배율입니다. 50~200 사이의 자연수를 입력하세요. (입력값: ${scalePercentage})` },
        { status: 400 }
      );
    }

    // 대상 박스 찾기
    const targetBox = boxes.find(b => b.id === boxId);
    if (!targetBox) {
      return NextResponse.json(
        { error: '해당 박스를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 직접 HTML 스케일링 (Gemini 사용 안 함)
    const startTime = Date.now();
    const scaledHTML = scaleSectionInHTML(currentHTML, targetBox.sectionId, scalePercentage);
    const processingTime = Date.now() - startTime;

    console.log(`[/api/regenerate-section] Section scaled in ${processingTime}ms`);

    return NextResponse.json({
      html: scaledHTML,
      processingTime
    });

  } catch (error) {
    console.error('[/api/regenerate-section] Error:', error);

    const errorMessage = error instanceof Error ? error.message : '섹션 재생성에 실패했습니다.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
