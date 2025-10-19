import { GoogleGenerativeAI } from '@google/generative-ai';
import { Box } from '@/types';

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
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
당신은 전문 웹 개발자입니다. 다음 레이아웃 정보를 기반으로 **완전한 단일 HTML 파일**을 생성하세요.

# 레이아웃 정보 (12컬럼 그리드 기반)
${boxes.map((box, i) => `
## 영역 ${i + 1}
- **위치**: ${box.x}열 (0-11), Y축 ${box.y}px
- **크기**: ${box.width}/12 컬럼, 높이 ${box.height}px
- **요구사항**: ${box.content || '(설명 없음)'}
`).join('\n')}

# 생성 규칙
1. <!DOCTYPE html>부터 </html>까지 **완전한 파일**
2. **TailwindCSS CDN** 사용 필수
3. 반응형 디자인 (모바일 대응)
4. 12컬럼 그리드 시스템 활용
5. 현대적이고 깔끔한 디자인
6. 더미 텍스트는 **한국어**로
7. 각 영역을 명확히 구분 (border/background로 시각화)
8. 실제 사용 가능한 수준의 퀄리티
9. **중요**: 각 주요 섹션/컴포넌트에 data-editable="true" 속성과 고유한 data-section-id="section-N" 속성을 추가하세요 (나중에 드래그/리사이즈 편집을 위해 필요)

# 출력 형식
- HTML 코드만 반환 (마크다운 코드블록 없이)
- 설명/주석 최소화
`.trim();

  const result = await model.generateContent(prompt);
  let html = result.response.text();

  // 코드블록 제거 (```html ... ```)
  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '');

  return html.trim();
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
