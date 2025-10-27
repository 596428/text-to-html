import { GoogleGenerativeAI } from '@google/generative-ai';
import { Box } from '@/types';
import { logHTMLGeneration, logHTMLModification } from '@/lib/logger';

// ============ API 키 관리 (순환 사용) ============

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getGenAI() {
  if (API_KEYS.length === 0) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. docs/API-KEYS-GUIDE.md를 참조하세요.');
  }

  const key = API_KEYS[currentKeyIndex];
  console.log(`[Gemini] Using API Key #${currentKeyIndex + 1}/${API_KEYS.length}`);
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenerativeAI(key);
}

// ============ HTML 생성 ============

export async function generateHTML(boxes: Box[]): Promise<string> {
  // 1단계: 불러오기 박스를 분리하고 HTML 수집
  const loadedBoxes = boxes.filter(box => box.layoutType === 'loaded' && box.loadedHtml);
  const generateBoxes = boxes.filter(box => box.layoutType !== 'loaded' || !box.loadedHtml);

  // 2단계: 생성이 필요한 박스만 Gemini로 처리
  let generatedHtml = '';

  if (generateBoxes.length > 0) {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    boxDescription += `
- **Flex 레이아웃 설정**:
  - Direction: ${box.flexDirection || 'row'}
  - Wrap: ${box.flexWrap || 'nowrap'}
  - Justify Content: ${box.justifyContent || 'flex-start'}
  - Align Items: ${box.alignItems || 'stretch'}
  - Gap: ${box.gap || 0}px

- **자식 요소들** (${box.children.length}개):
${box.children.map((child, j) => `  ${j + 1}. ${child.content || '(설명 없음)'}
     - flexGrow: ${child.flexGrow ?? 1}
     - flexShrink: ${child.flexShrink ?? 1}
     - flexBasis: ${child.flexBasis ?? 'auto'}
     - order: ${child.order ?? j}`).join('\n')}`;
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
    boxDescription += `
- **요구사항**: ${box.content || '(설명 없음)'}`;
  }

  // 팝업 처리
  if (box.hasPopup) {
    boxDescription += `
- **팝업 기능**: 이 영역에 "${box.popupTriggerText || '상세보기'}" 버튼을 추가하고, 클릭 시 팝업이 표시되도록 구현하세요. 팝업 ID는 "popup-${i + 1}"로 설정하세요.
- **팝업 내용**:
${box.popupContent || '팝업 기본 내용'}`;
  }

  return boxDescription;
}).join('\n')}

# 생성 규칙
1. <!DOCTYPE html>부터 </html>까지 **완전한 파일**
2. **TailwindCSS CDN 고정 버전**: 반드시 다음 CDN을 사용하세요
   <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
3. **컨테이너 너비 표준화**:
   - 메인 컨테이너: <div class="container mx-auto max-w-screen-2xl space-y-4">
   - w-10/12, w-11/12 같은 비율 너비 사용 금지
4. **패딩/간격 표준**:
   - 버튼: px-4 py-2
   - 입력 필드: p-2, border border-gray-300
   - 카드/섹션: p-4
   - 요소 간격: gap-4 또는 space-y-4
5. **색상 팔레트 고정**:
   - Body 배경: bg-gray-100
   - 카드 배경: bg-white
   - 라벨 배경: bg-blue-100
   - 테두리: border-gray-300
   - 텍스트: text-gray-700 (기본), text-gray-500 (보조)
6. **높이 자동 조절 (중요)**:
   - 각 영역의 높이는 내용에 맞게 자동으로 조절되어야 합니다
   - min-height 인라인 스타일 사용 금지
   - 내용이 적으면 작게, 많으면 크게 자연스럽게 표시
7. 더미 텍스트는 **한국어**로
8. 각 영역을 명확히 구분 (border/background로 시각화)
9. 실제 사용 가능한 수준의 퀄리티
10. **중요**: 각 주요 섹션/컴포넌트에 data-editable="true" 속성과 고유한 data-section-id 속성을 추가하세요 (나중에 드래그/리사이즈 편집을 위해 필요)
    - **반드시 아래 제공된 정확한 sectionId 값을 사용하세요** (절대 임의로 section-1, section-2 같은 값을 만들지 마세요):
${boxes.map((b, i) => `      박스${i+1}: data-section-id="${b.sectionId}"`).join('\n')}
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
    - flexDirection에 따라 "flex-row" 또는 "flex-column" 적용
    - flexWrap에 따라 "flex-nowrap", "flex-wrap", "flex-wrap-reverse" 적용
    - justifyContent에 따라 "justify-start", "justify-center", "justify-between" 등 적용
    - alignItems에 따라 "items-start", "items-center", "items-stretch" 등 적용
    - gap이 있으면 "gap-{N}" 클래스 적용 (예: gap-4)
14. 각 자식 요소는 다음과 같이 구현하세요:
    - flexGrow가 있으면 인라인 스타일 "flex-grow: {N}" 또는 Tailwind "flex-grow-{N}" 적용
    - flexShrink가 있으면 인라인 스타일 "flex-shrink: {N}" 적용
    - flexBasis가 있으면 인라인 스타일 "flex-basis: {value}" 적용
    - order가 있으면 인라인 스타일 "order: {N}" 또는 Tailwind "order-{N}" 적용
    - 각 자식 요소의 content 설명에 따라 실제 HTML 요소 생성

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

  try {
    const result = await model.generateContent(prompt);

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
  } catch (error: any) {
    console.error('[generateHTML] Error:', error);

    // 사용자 친화적인 에러 메시지
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
    } else if (error.message?.includes('API key')) {
      throw new Error('API 키가 유효하지 않습니다. 환경 변수를 확인해주세요.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('요청 시간이 초과되었습니다. 박스 개수를 줄이거나 내용을 단순화해주세요.');
    }

    throw error;
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
function mergeLoadedHtmls(loadedBoxes: Box[], allBoxes: Box[]): string {
  const bodyContent = loadedBoxes
    .map((box) => {
      const styles = `
        position: absolute;
        left: ${(box.x / 24) * 100}%;
        top: ${box.y}px;
        width: ${(box.width / 24) * 100}%;
        min-height: ${box.height}px;
      `;
      return `<div style="${styles}">${box.loadedHtml}</div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Layout</title>
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; position: relative; min-height: 100vh; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

/**
 * 불러온 HTML과 생성된 HTML 혼합 (간단 구현)
 */
function mergeHtmlWithLoaded(generatedHtml: string, loadedBoxes: Box[], allBoxes: Box[]): string {
  // 불러온 HTML에서 body 내용만 추출하여 병합
  const loadedContent = loadedBoxes
    .map((box) => {
      if (!box.loadedHtml) return '';

      // loadedHtml에서 <body> 태그 내용만 추출
      const parser = new DOMParser();
      const doc = parser.parseFromString(box.loadedHtml, 'text/html');
      const bodyContent = doc.body.innerHTML;

      // 추출한 내용을 그대로 반환 (position: absolute 제거)
      // data-section-id가 있으면 그대로 사용됨
      return bodyContent;
    })
    .filter(content => content.length > 0)
    .join('\n');

  // </body> 태그 앞에 불러온 HTML 삽입
  return generatedHtml.replace('</body>', `${loadedContent}\n</body>`);
}

// ============ HTML 수정 ============

export async function modifyHTML(
  currentHTML: string,
  userRequest: string
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

  const result = await model.generateContent(prompt);
  let html = result.response.text();

  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '');

  return html.trim();
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
