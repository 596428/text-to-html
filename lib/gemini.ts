import { GoogleGenerativeAI } from '@google/generative-ai';
import { JSDOM } from 'jsdom';
import { Box } from '@/types';
import { logHTMLGeneration, logHTMLModification } from '@/lib/logger';
import { logGeminiUsage } from '@/lib/mongodb-usage-logger';

// ============ API 키 관리 (최소 연결 방식 - Least Connection) ============

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
  process.env.GEMINI_API_KEY_7,
  process.env.GEMINI_API_KEY_8,
  process.env.GEMINI_API_KEY_9,
  process.env.GEMINI_API_KEY_10
].filter(Boolean) as string[]; // undefined 자동 제거

// 각 API 키의 현재 활성 요청 수 추적 (메모리 기반)
const keyUsageCount = new Map<number, number>();

// Round Robin용 마지막 사용 인덱스
let lastUsedIndex = 0;

// 초기화: 모든 키를 0으로 설정
API_KEYS.forEach((_, index) => {
  keyUsageCount.set(index, 0);
});

function getGenAI(): { genAI: GoogleGenerativeAI; keyNumber: string; decrementUsage: () => void } {
  if (API_KEYS.length === 0) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. docs/API-KEYS-GUIDE.md를 참조하세요.');
  }

  // 가장 적게 사용중인 키들을 찾기 (Least Connection + Round Robin)
  let minUsage = Infinity;
  let candidateIndices: number[] = [];

  for (let i = 0; i < API_KEYS.length; i++) {
    const usage = keyUsageCount.get(i) || 0;
    if (usage < minUsage) {
      minUsage = usage;
      candidateIndices = [i];
    } else if (usage === minUsage) {
      candidateIndices.push(i);
    }
  }

  // 후보가 여러 개면 Round Robin으로 선택
  const selectedIndex = candidateIndices[lastUsedIndex % candidateIndices.length];
  lastUsedIndex++;

  // 선택된 키의 사용 카운트 증가
  keyUsageCount.set(selectedIndex, minUsage + 1);

  const key = API_KEYS[selectedIndex];
  const keyNumber = `${selectedIndex + 1}`;

  console.log(`[Gemini] Using API Key #${keyNumber}/${API_KEYS.length} (active: ${minUsage + 1})`);

  // 요청 완료 시 카운트 감소 함수
  const decrementUsage = () => {
    const currentCount = keyUsageCount.get(selectedIndex) || 1;
    keyUsageCount.set(selectedIndex, Math.max(0, currentCount - 1));
    console.log(`[Gemini] Released API Key #${keyNumber} (active: ${Math.max(0, currentCount - 1)})`);
  };

  return {
    genAI: new GoogleGenerativeAI(key),
    keyNumber,
    decrementUsage
  };
}

// ============ HTML 생성 ============

export async function generateHTML(boxes: Box[], imageFiles: { [boxId: string]: File[] } = {}, requestIp: string = 'unknown', signal?: AbortSignal): Promise<string> {
  // 1단계: 불러오기 박스를 분리하고 HTML 수집
  const loadedBoxes = boxes.filter(box => box.layoutType === 'loaded' && box.loadedHtml);
  const generateBoxes = boxes.filter(box => box.layoutType !== 'loaded' || !box.loadedHtml);

  // 2단계: 생성이 필요한 박스만 Gemini로 처리
  let generatedHtml = '';
  let keyNumber: string = 'unknown'; // 로깅용 API 키 번호

  if (generateBoxes.length > 0) {
    const apiInfo = getGenAI();
    keyNumber = apiInfo.keyNumber;
    const decrementUsage = apiInfo.decrementUsage;
    const model = apiInfo.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 팝업 정보 및 Flex 레이아웃 포함
    const prompt = `
당신은 전문 웹 개발자입니다. 다음 레이아웃 정보를 기반으로 **완전한 단일 HTML 파일**을 생성하세요.

# 레이아웃 정보 (24컬럼 그리드 기반)
${generateBoxes.map((box, i) => {
  let boxDescription = `
## 영역 ${i + 1}
- **위치**: ${box.x}열 (0-23), Y축 ${box.y}px
- **크기**: ${box.width}/24 컬럼
- **레이아웃 타입**: ${box.layoutType || 'simple'}`;

  // Flex 레이아웃 처리
  if (box.layoutType === 'flex' && box.children && box.children.length > 0) {
    const direction = box.flexDirection || 'row';
    const align = box.flexAlign || 'left';

    // 정렬 방식을 CSS justify-content로 변환
    const justifyContentMap = {
      'left': 'flex-start',
      'right': 'flex-end',
      'center': 'center'
    };
    const justifyContent = direction === 'row' ? justifyContentMap[align] : 'flex-start';

    boxDescription += `
- **Flex 레이아웃 설정**:
  - 방향: ${direction === 'row' ? '가로 (1×N)' : '세로 (N×1)'}
  - 정렬: ${direction === 'row' ? (align === 'left' ? '왼쪽' : align === 'right' ? '오른쪽' : '가운데') : '위쪽 (고정)'}
  - 자식 요소 간격: 균등 분배 (space-evenly)

- **자식 요소들** (${box.children.length}개):
${box.children.map((child, j) => `  ${j + 1}. ${child.content || '(설명 없음)'}
     - 공간 비율: ${child.spaceRatio}% (부모의 ${direction === 'row' ? '너비' : '높이'}의 ${child.spaceRatio}%)`).join('\n')}

- **구현 방법**:
  - 컨테이너: display: flex; flex-direction: ${direction}; justify-content: ${justifyContent}; align-items: center; gap으로 균등 간격
  - 각 자식: width(또는 height): ${direction === 'row' ? 'spaceRatio%' : 'auto'}, 또는 flex-basis 사용
  - 남은 공간: ${100 - box.children.reduce((sum, c) => sum + c.spaceRatio, 0)}%는 정렬 방식에 따라 자동 배치`;
  } else if (box.layoutType === 'table' && box.tableStructure) {
    // Table 레이아웃 처리
    const table = box.tableStructure;
    boxDescription += `
- **테이블 구조**:
  - 크기: ${table.rows}행 × ${table.cols}열
  - 헤더: ${table.hasHeader ? '첫 행이 헤더' : '헤더 없음'}

- **셀 내용**:`;

    table.cells.forEach((row, r) => {
      boxDescription += `\n  ${r + 1}행:`;
      row.forEach((cell, c) => {
        if (cell.content !== undefined) { // 병합으로 숨겨진 셀 제외
          const mergeInfo = [];
          if (cell.rowSpan && cell.rowSpan > 1) mergeInfo.push(`행병합=${cell.rowSpan}`);
          if (cell.colSpan && cell.colSpan > 1) mergeInfo.push(`열병합=${cell.colSpan}`);
          const mergeStr = mergeInfo.length > 0 ? ` [${mergeInfo.join(', ')}]` : '';
          boxDescription += `\n    - (${r + 1}, ${c + 1})${mergeStr}: ${cell.content || '(비어있음)'}`;
        }
      });
    });

    // 테이블 추가 설명이 있으면 포함
    if (box.tableDescription && box.tableDescription.trim()) {
      boxDescription += `

- **추가 요구사항**: ${box.tableDescription}`;
    }
  } else {
    // 이미지가 있는 경우 이미지 분석 지시 추가
    const hasBoxImages = imageFiles[box.id] && imageFiles[box.id].length > 0;
    if (hasBoxImages) {
      if (box.content && box.content.trim()) {
        // 이미지 + 텍스트
        boxDescription += `
- **요구사항**:
  1. **기본 구조**: 첨부된 이미지를 분석하여 그대로 재현하는 HTML을 생성하세요. 이미지의 레이아웃, 텍스트, 색상, 스타일을 최대한 정확하게 복원하세요.
  2. **추가 지시사항**: ${box.content}
  3. 이미지의 구조를 유지하면서 위 추가 지시사항을 반영하세요.`;
      } else {
        // 이미지만
        boxDescription += `
- **요구사항**: 첨부된 이미지를 분석하여 그대로 재현하는 HTML을 생성하세요. 이미지의 레이아웃, 텍스트, 색상, 스타일을 최대한 정확하게 복원하세요.`;
      }
    } else {
      // 텍스트만
      boxDescription += `
- **요구사항**: ${box.content || '(설명 없음)'}`;
    }
  }

  // 팝업 처리
  if (box.hasPopup) {
    boxDescription += `
- **팝업 기능**: 이 영역에 "${box.popupTriggerText || '상세보기'}" 버튼을 추가하고, 클릭 시 팝업이 표시되도록 구현하세요. 팝업 ID는 "popup-${i + 1}"로 설정하세요.
- **팝업 내용**:
${box.popupContent || '팝업 기본 내용'}`;
  }

  // 배율 조정 처리
  if (box.scalePercentage && box.scalePercentage !== 100) {
    boxDescription += `

- ** 중요: 배율 조정 ${box.scalePercentage}%**
  이 영역의 **모든 크기 관련 값**을 ${box.scalePercentage}%로 조정하세요:
  1. **font-size**: 16px → ${Math.round(16 * box.scalePercentage / 100)}px
  2. **padding**: p-2 → p-${Math.max(1, Math.round(2 * box.scalePercentage / 100))}
  3. **테이블**:
     - 셀 padding: p-2 → p-${Math.max(1, Math.round(2 * box.scalePercentage / 100))}
     - 폰트 크기, border-width 등 모든 크기 속성
  4. **간격**: gap-4, space-y-4 등 모든 간격 클래스
  5. **아이콘/버튼**: 크기와 패딩 모두 조정

  ⚠️ **주의**: 컨테이너 너비(col-span-X)는 변경하지 마세요. 내부 요소만 조정하세요.`;
  }

  return boxDescription;
}).join('\n')}

# 생성 규칙
1. <!DOCTYPE html>부터 </html>까지 **완전한 파일**
2. **TailwindCSS CDN 고정 버전**: 반드시 다음 CDN을 사용하세요
   <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
3. **24컬럼 그리드 시스템 (매우 중요)**:
   - 메인 컨테이너: <div class="container mx-auto max-w-screen-2xl"><div class="grid grid-cols-24 gap-4 auto-rows-min">
   - 각 영역의 바깥쪽 컨테이너에 **반드시** col-span-{width} 클래스 적용
   - 예: 너비가 12/24이면 → <div class="col-span-12 p-4 bg-white border" data-editable="true">
   - 예: 너비가 24/24이면 → <div class="col-span-24 p-4 bg-white border" data-editable="true">
   - ⚠️ 주의: 바깥쪽 컨테이너(data-editable="true"를 가진 div)에만 col-span-{width}를 적용하세요
   - w-10/12, w-11/12 같은 비율 너비 사용 금지
4. **패딩/간격 표준**:
   - 버튼: px-4 py-2
   - 입력 필드: p-2, border border-gray-300
   - 카드/섹션: p-4
   - 요소 간격: gap-4 또는 space-y-4
5. **색상 팔레트 권장** (사용자 요구사항이 없는 경우에만 적용):
   - Body 배경: bg-gray-100
   - 카드 배경: bg-white
   - 테두리: border-gray-300
   - 텍스트: text-gray-700 (기본), text-gray-500 (보조)
   - 중요: 사용자가 명시한 색상이 없다면 위 팔레트를 따르되, 불필요한 배경색은 추가하지 마세요
6. **높이 자동 조절 (중요)**:
   - 각 영역의 높이는 내용에 맞게 자동으로 조절되어야 합니다
   - min-height 인라인 스타일 사용 금지
   - 내용이 적으면 작게, 많으면 크게 자연스럽게 표시
7. 더미 텍스트는 **한국어**로
8. 각 영역을 명확히 구분 (border/background로 시각화)
9. 실제 사용 가능한 수준의 퀄리티
10. **중요**: 각 주요 섹션/컴포넌트에 data-editable="true" 속성을 추가하세요 (나중에 드래그/리사이즈 편집을 위해 필요)
    - data-section-id는 자동으로 추가되므로 신경쓰지 않아도 됩니다
11. **테이블/그리드 중요 (매우 엄격)**:
    - 사용자가 "1행"이라고 명시한 경우, **절대로 여러 행으로 나누지 마세요**.
    - **flex-col, space-y, grid-rows 사용 금지** - 이들은 수직 배치를 만듭니다.
    - 반드시 **flex-row 또는 grid-cols**만 사용하세요.
    - 예: "1행 × 10열" → <table><tr><td>1</td><td>2</td>...<td>10</td></tr></table> 또는 grid grid-cols-10
    - 예: "지정현황, 사업현황 1행" → <div class="grid grid-cols-2"> 또는 <div class="flex flex-row gap-4">
    - **모든 요소가 가로로 나란히** 배치되어야 합니다.
12. **빈 공간 처리 금지**: 사용자가 요구하지 않은 설명 텍스트나 placeholder를 임의로 추가하지 마세요. 예를 들어 "여기에 내용이 표시됩니다", "정보를 입력하세요" 같은 문구를 넣지 말고, 사용자가 명시한 요소(버튼, 입력필드, 라벨 등)만 생성하세요. 빈 영역은 빈 공간으로 남겨두세요.

# Flex 레이아웃 구현 규칙
13. Flex 레이아웃 타입의 영역은 다음과 같이 구현하세요:
    - 컨테이너에 "display: flex" 또는 Tailwind의 "flex" 클래스 사용
    - 방향에 따라 "flex-row" (가로) 또는 "flex-column" (세로) 적용
    - 정렬 방식에 따라 "justify-start" (왼쪽), "justify-end" (오른쪽), "justify-center" (가운데) 적용
    - 항상 "items-center"로 교차축 정렬
    - 자식 요소 간 균등한 간격: "gap-4" 또는 적절한 gap 값 사용
14. 각 자식 요소는 다음과 같이 구현하세요:
    - 공간 비율(spaceRatio)에 따라 width(가로) 또는 height(세로) 설정
    - 예: 가로 방향에서 spaceRatio가 30%이면 → style="width: 30%"
    - 예: 세로 방향에서 spaceRatio가 50%이면 → style="height: 50%"
    - 각 자식 요소의 content 설명에 따라 실제 HTML 요소 생성 (버튼, 입력필드, 텍스트 등)
    - 남은 공간(100% - 총 spaceRatio)은 정렬 방식에 따라 자동 배치됨

# Table 레이아웃 구현 규칙
15. Table 레이아웃 타입의 영역은 다음과 같이 구현하세요:
    - HTML <table> 태그 사용 (Tailwind의 table 클래스 적용)
    - 첫 행이 헤더인 경우 <thead>와 <th> 태그 사용
    - 나머지 행은 <tbody>와 <td> 태그 사용
    - 테두리는 "border border-gray-300" 클래스 적용
16. 셀 병합 처리:
    - rowSpan이 1보다 크면 <td rowspan="{N}"> 속성 사용
    - colSpan이 1보다 크면 <td colspan="{N}"> 속성 사용
    - content가 undefined인 셀은 렌더링하지 마세요 (병합으로 숨겨진 셀)
17. 테이블 스타일링:
    - 테이블: "table-auto w-full border-collapse"
    - 헤더 셀: "bg-gray-100 font-bold p-2 border"
    - 일반 셀: "p-2 border border-gray-300"
    - 각 셀의 content 설명에 따라 실제 내용 생성

# 팝업 구현 규칙
18. <head> 내부에 다음 CSS를 **반드시** 추가하세요:
    <style>
      .popup-overlay.hidden {
        display: none;
      }
    </style>
19. 팝업이 있는 영역에는 data-popup-trigger="popup-{N}" 속성을 가진 버튼을 추가하세요
20. 각 팝업은 다음 구조로 생성하세요:
    <div id="popup-{N}" class="popup-overlay hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="popup-content bg-white rounded-lg shadow-2xl max-w-[90vw] w-11/12 max-h-[90vh] overflow-auto p-6 relative">
        <button class="popup-close absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <div data-editable="true" data-section-id="popup-{N}-content">
          <!-- 팝업 컨텐츠 영역 (사용자가 편집 가능) -->
          <h2 class="text-2xl font-bold mb-4">팝업 제목</h2>
          <p>팝업 내용을 여기에 입력하세요.</p>
        </div>
      </div>
    </div>
21. </body> 태그 직전에 다음 JavaScript를 추가하세요:
    <script>
      // 팝업 열기/닫기 로직
      document.querySelectorAll('[data-popup-trigger]').forEach(btn => {
        btn.addEventListener('click', () => {
          const popupId = btn.getAttribute('data-popup-trigger');
          document.getElementById(popupId).classList.remove('hidden');
        });
      });

      document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay || e.target.classList.contains('popup-close')) {
            overlay.classList.add('hidden');
          }
        });
      });

      // ESC 키로 팝업 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.popup-overlay').forEach(p => p.classList.add('hidden'));
        }
      });
    </script>

# 출력 형식
- HTML 코드만 반환 (마크다운 코드블록 없이)
- 설명/주석 최소화
`.trim();

  // 로그 저장 (프로토타입 개발용)
  logHTMLGeneration(boxes, prompt);

  // 클라이언트 취소 감지
  if (signal?.aborted) {
    decrementUsage(); // 카운트 감소
    await logGeminiUsage({
      requestIp,
      timestamp: new Date(),
      isError: true,
      errorMessage: 'Client cancelled request before API call',
      apiKeyUsed: keyNumber
    });
    throw new Error('요청이 취소되었습니다.');
  }

  try {
    // 이미지가 있는지 확인
    const hasImages = generateBoxes.some(box =>
      imageFiles[box.id] && imageFiles[box.id].length > 0
    );

    let result;

    if (hasImages) {
      // 멀티모달: 이미지 + 텍스트 전송
      const parts: any[] = [{ text: prompt }];

      // 각 박스의 이미지를 base64로 변환하여 추가
      for (const box of generateBoxes) {
        const files = imageFiles[box.id];
        if (files && files.length > 0) {
          for (const file of files) {
            // Next.js FormData에서 받은 파일 처리
            let buffer: Buffer;

            // arrayBuffer 메서드가 있는 경우 (Blob/File)
            if (typeof file.arrayBuffer === 'function') {
              const bytes = await file.arrayBuffer();
              buffer = Buffer.from(bytes);
            }
            // 이미 Buffer인 경우
            else if (Buffer.isBuffer(file)) {
              buffer = file;
            }
            // 기타: text()로 받아서 Buffer로 변환
            else {
              const text = await (file as any).text();
              buffer = Buffer.from(text, 'binary');
            }

            const base64 = buffer.toString('base64');

            parts.push({
              inlineData: {
                mimeType: file.type || 'image/jpeg',
                data: base64
              }
            });
          }
        }
      }

      result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    } else {
      // 텍스트만 전송 (기존 방식)
      result = await model.generateContent(prompt);
    }

    // API 호출 후 취소 감지
    if (signal?.aborted) {
      decrementUsage(); // 카운트 감소
      await logGeminiUsage({
        requestIp,
        timestamp: new Date(),
        isError: true,
        errorMessage: 'Client cancelled request after API call',
        tokenUsage: result?.response?.usageMetadata ? {
          promptTokens: result.response.usageMetadata.promptTokenCount || 0,
          candidatesTokens: result.response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: result.response.usageMetadata.totalTokenCount || 0
        } : undefined,
        apiKeyUsed: keyNumber
      });
      throw new Error('요청이 취소되었습니다.');
    }

    if (!result || !result.response) {
      throw new Error('Gemini API로부터 응답을 받지 못했습니다.');
    }

    let html = result.response.text();

    if (!html || html.trim().length === 0) {
      throw new Error('생성된 HTML이 비어있습니다. 박스 내용을 확인해주세요.');
    }

    // 코드블록 제거 (```html ... ```)
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '');

    // 사용자가 편집한 팝업 컨텐츠를 HTML에 통합
    html = integratePopupContent(html, generateBoxes);

    generatedHtml = html.trim();

    // ✅ 성공 로깅
    const usageMetadata = result.response.usageMetadata;
    await logGeminiUsage({
      requestIp,
      timestamp: new Date(),
      isError: false,
      tokenUsage: usageMetadata ? {
        promptTokens: usageMetadata.promptTokenCount || 0,
        candidatesTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      } : undefined,
      apiKeyUsed: keyNumber
    });
  } catch (error: any) {
    console.error('[generateHTML] Error:', error);

    // ❌ 에러 로깅
    await logGeminiUsage({
      requestIp,
      timestamp: new Date(),
      isError: true,
      errorMessage: error.message || 'Unknown error',
      apiKeyUsed: keyNumber
    });

    // 사용자 친화적인 에러 메시지
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.message?.includes('API key')) {
      throw new Error('API 키가 유효하지 않습니다. 환경 변수를 확인해주세요.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('요청 시간이 초과되었습니다. 박스 개수를 줄이거나 내용을 단순화해주세요.');
    }

    throw error;
  } finally {
    // ✅ 성공/실패 여부와 관계없이 API 키 카운트 감소
    decrementUsage();
  }
  } else if (loadedBoxes.length === 0 && generateBoxes.length === 0) {
    throw new Error('박스를 추가해주세요!');
  }

  // 3단계: 불러온 HTML과 생성된 HTML을 병합
  if (loadedBoxes.length > 0 && generateBoxes.length === 0) {
    // 모든 박스가 불러오기인 경우: 단순 결합
    return mergeLoadedHtmls(loadedBoxes, boxes);
  } else if (loadedBoxes.length > 0) {
    // 불러오기 + 생성된 HTML 혼합: 위치 기반 병합
    return mergeHtmlWithLoaded(generatedHtml, loadedBoxes, boxes);
  } else {
    // 불러오기 없음: 생성된 HTML 그대로 반환
    return generatedHtml;
  }
}

// ============ 팝업 컨텐츠 통합 ============

function integratePopupContent(html: string, boxes: Box[]): string {
  boxes.forEach((box, i) => {
    if (box.hasPopup && box.popupContent) {
      const popupId = `popup-${i + 1}`;

      // popupContent가 HTML인지 확인 (<!DOCTYPE, <html>, <body> 등이 있으면 HTML)
      const isHTML = /<(!DOCTYPE|html|body)/i.test(box.popupContent);

      // HTML이 아니면 Gemini가 생성한 팝업을 그대로 사용
      if (!isHTML) {
        return;
      }

      // 사용자가 편집한 팝업 HTML에서 body 내부 컨텐츠만 추출
      let bodyContent = box.popupContent;

      // <body> 태그가 있으면 그 내부만 추출
      const bodyMatch = bodyContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        bodyContent = bodyMatch[1];
      }

      // 기존 팝업 영역을 찾아서 대체
      const popupRegex = new RegExp(
        `<div id="${popupId}"[^>]*class="popup-overlay[^"]*"[^>]*>.*?</div>\\s*</div>\\s*</div>`,
        'gs'
      );

      const customPopup = `<div id="${popupId}" class="popup-overlay hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="popup-content bg-white rounded-lg shadow-2xl max-w-[90vw] w-11/12 max-h-[90vh] overflow-auto p-6 relative">
        <button class="popup-close absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        <div data-editable="true" data-section-id="popup-${i + 1}-content">
          ${bodyContent}
        </div>
      </div>
    </div>`;

      html = html.replace(popupRegex, customPopup);
    }
  });

  return html;
}

// ============ 불러온 HTML 병합 (Phase 5) ============

/**
 * 모든 박스가 불러오기인 경우: 단순 결합
 */
/**
 * 저장된 HTML에서 특정 section만 추출하는 헬퍼 함수
 * (전체 페이지가 저장된 경우 첫 번째 section만 가져옴)
 */
function extractSectionFromLoadedHtml(loadedHtml: string): string {
  if (!loadedHtml) return '';

  // body 내용 추출
  const bodyMatch = loadedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : loadedHtml;

  // data-section-id를 가진 div의 시작 위치 찾기
  const sectionStartRegex = /<div[^>]*data-section-id="[^"]*"[^>]*>/gi;
  const matches = [...bodyContent.matchAll(sectionStartRegex)];

  if (matches.length === 0) {
    // section이 없으면 전체 body 내용 반환
    return bodyContent;
  }

  // 첫 번째 section의 시작 위치
  const firstMatch = matches[0];
  const startIndex = firstMatch.index!;
  const startTag = firstMatch[0];

  // 시작 위치부터 div의 깊이를 추적하여 닫는 태그 찾기
  let depth = 1;
  let currentIndex = startIndex + startTag.length;
  const content = bodyContent.substring(startIndex);

  for (let i = startTag.length; i < content.length; i++) {
    if (content.substring(i).startsWith('<div')) {
      // div 열림 찾기
      const nextClose = content.indexOf('>', i);
      if (nextClose > i && content.substring(i, nextClose + 1).indexOf('/>') === -1) {
        depth++;
        i = nextClose;
      }
    } else if (content.substring(i).startsWith('</div>')) {
      depth--;
      if (depth === 0) {
        // 매칭되는 닫는 태그 발견
        const endIndex = i + 6; // '</div>'.length
        const extractedSection = content.substring(0, endIndex);

        if (matches.length > 1) {
          console.log(`[Info] 저장된 HTML에서 ${matches.length}개 section 발견, 첫 번째만 사용`);
        }

        return extractedSection;
      }
      i += 5; // '</div>'.length - 1
    }
  }

  // 매칭 실패 시 전체 body 내용 반환
  console.warn('[Warning] section 닫는 태그를 찾지 못했습니다. 전체 body 반환');
  return bodyContent;
}

function mergeLoadedHtmls(loadedBoxes: Box[], allBoxes: Box[]): string {
  // Case 1: 박스가 1개면 컨테이너 방식 (전체 너비 사용)
  if (loadedBoxes.length === 1) {
    const box = loadedBoxes[0];
    const content = extractSectionFromLoadedHtml(box.loadedHtml || '');

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Layout</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; }
  </style>
</head>
<body class="bg-gray-100 text-gray-700">
  <div class="container mx-auto max-w-screen-2xl space-y-4 p-4">
${content}
  </div>
</body>
</html>`;
  }

  // Case 2: 박스가 2개 이상이면 24컬럼 그리드 배치
  const bodyContent = loadedBoxes
    .map((box) => {
      const content = extractSectionFromLoadedHtml(box.loadedHtml || '');

      // 24컬럼 그리드 기준으로 배치
      const colSpan = Math.round((box.width / 24) * 24); // width는 1-24 범위
      const rowStart = Math.floor(box.y / 100) + 1; // y를 row로 변환

      return `<div class="col-span-${colSpan}" style="grid-row-start: ${rowStart};">
${content}
</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Layout</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; }
  </style>
</head>
<body class="bg-gray-100 text-gray-700">
  <div class="container mx-auto max-w-screen-2xl p-4">
    <div class="grid grid-cols-24 gap-4 auto-rows-min">
${bodyContent}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 불러온 HTML과 생성된 HTML 혼합 (간단 구현)
 */
function mergeHtmlWithLoaded(generatedHtml: string, loadedBoxes: Box[], allBoxes: Box[]): string {
  // 불러온 HTML에서 첫 번째 section만 추출하여 병합
  const loadedContent = loadedBoxes
    .map((box) => {
      if (!box.loadedHtml) return '';

      // 헬퍼 함수 사용: 저장된 HTML에서 첫 번째 section만 추출
      return extractSectionFromLoadedHtml(box.loadedHtml);
    })
    .filter(content => content.length > 0)
    .join('\n');

  // Grid 내부에 불러온 HTML 삽입 (container 안에 위치하도록)
  // 패턴: </div>\s*</div>\s*</body> 를 찾아서 첫 번째 </div> 앞에 삽입
  const gridClosePattern = /(<\/div>\s*<\/div>\s*<\/body>)/;
  if (gridClosePattern.test(generatedHtml)) {
    return generatedHtml.replace(gridClosePattern, `${loadedContent}\n$1`);
  }

  // Fallback: 기존 방식 (grid가 없는 경우)
  return generatedHtml.replace('</body>', `${loadedContent}\n</body>`);
}

// ============ HTML 수정 ============

export async function modifyHTML(
  currentHTML: string,
  userRequest: string,
  requestIp: string = 'unknown'
): Promise<string> {
  const apiInfo = getGenAI();
  const keyNumber = apiInfo.keyNumber;
  const decrementUsage = apiInfo.decrementUsage;
  const model = apiInfo.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
당신은 HTML 수정 전문가입니다.

# 현재 HTML
\`\`\`html
${currentHTML}
\`\`\`

# 사용자 수정 요청
"${userRequest}"

# 지시사항
1. **최소한의 변경**만 수행
2. 기존 구조 최대한 유지
3. TailwindCSS 클래스 사용
4. 완전한 HTML 파일 반환
5. 사용자 요청을 정확히 반영

# 출력 형식
- 수정된 HTML 코드만 (마크다운 코드블록 없이)
`.trim();

  // 로그 저장 (프로토타입 개발용)
  logHTMLModification(currentHTML, userRequest, prompt);

  try {
    const result = await model.generateContent(prompt);
    let html = result.response.text();

    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '');

    // ✅ 성공 로깅
    const usageMetadata = result.response.usageMetadata;
    await logGeminiUsage({
      requestIp,
      timestamp: new Date(),
      isError: false,
      tokenUsage: usageMetadata ? {
        promptTokens: usageMetadata.promptTokenCount || 0,
        candidatesTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      } : undefined,
      apiKeyUsed: keyNumber
    });

    return html.trim();
  } catch (error: any) {
    // ❌ 에러 로깅
    await logGeminiUsage({
      requestIp,
      timestamp: new Date(),
      isError: true,
      errorMessage: error.message || 'Unknown error',
      apiKeyUsed: keyNumber
    });

    throw error;
  } finally {
    // ✅ 성공/실패 여부와 관계없이 API 키 카운트 감소
    decrementUsage();
  }
}

// ============ 재시도 로직 (429 에러 대응) ============

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, i); // 지수 백오프
        console.log(`[Gemini] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
