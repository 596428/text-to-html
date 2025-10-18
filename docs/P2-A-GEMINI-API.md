# P2-A: Gemini API 통합 상세 구현 가이드

**담당:** Session 5
**예상 시간:** 1일
**Dependency:** P0 완료

---

## 구현 파일

1. `lib/gemini.ts` - Gemini API 클라이언트
2. `app/api/generate/route.ts` - HTML 생성 엔드포인트
3. `app/api/modify/route.ts` - HTML 수정 엔드포인트

---

## 1. lib/gemini.ts

**역할:** Gemini API 호출 로직

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Box } from '@/types';

// ============ API 키 관리 (순환 사용) ============

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getGenAI() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenerativeAI(key);
}

// ============ HTML 생성 ============

export async function generateHTML(boxes: Box[]): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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

# 출력 형식
- HTML 코드만 반환 (마크다운 코드블록 없이)
- 설명/주석 최소화
`.trim();

  const result = await model.generateContent(prompt);
  let html = result.response.text();

  // 코드블록 제거
  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/, '');

  return html.trim();
}

// ============ HTML 수정 ============

export async function modifyHTML(
  currentHTML: string,
  userRequest: string
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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
```

**핵심 기능:**
- API 키 순환 사용 (429 에러 방지)
- 프롬프트 엔지니어링 (구조화된 레이아웃 정보)
- 코드블록 자동 제거

---

## 2. app/api/generate/route.ts

**역할:** HTML 생성 API 엔드포인트

```typescript
import { NextResponse } from 'next/server';
import { generateHTML } from '@/lib/gemini';
import { GenerateRequest, GenerateResponse } from '@/types';

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json();
    const { boxes } = body;

    // 입력 검증
    if (!boxes || boxes.length === 0) {
      return NextResponse.json<GenerateResponse>(
        { html: '', error: '박스가 비어있습니다' },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const html = await generateHTML(boxes);

    return NextResponse.json<GenerateResponse>({ html });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json<GenerateResponse>(
      { html: '', error: 'HTML 생성 실패: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
```

**테스트 방법:**

```bash
# curl 테스트
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "boxes": [
      {
        "id": "test-1",
        "x": 0,
        "y": 0,
        "width": 12,
        "height": 300,
        "content": "상단 헤더 - 로고와 네비게이션"
      }
    ]
  }'
```

---

## 3. app/api/modify/route.ts

**역할:** HTML 수정 API 엔드포인트

```typescript
import { NextResponse } from 'next/server';
import { modifyHTML } from '@/lib/gemini';
import { ModifyRequest, ModifyResponse } from '@/types';

export async function POST(req: Request) {
  try {
    const body: ModifyRequest = await req.json();
    const { currentHTML, userRequest } = body;

    // 입력 검증
    if (!currentHTML || !userRequest) {
      return NextResponse.json<ModifyResponse>(
        { html: '', error: 'HTML 또는 요청이 비어있습니다' },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const html = await modifyHTML(currentHTML, userRequest);

    return NextResponse.json<ModifyResponse>({ html });
  } catch (error) {
    console.error('Modify API error:', error);
    return NextResponse.json<ModifyResponse>(
      { html: '', error: '수정 실패: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
```

**테스트 방법:**

```bash
curl -X POST http://localhost:3000/api/modify \
  -H "Content-Type: application/json" \
  -d '{
    "currentHTML": "<html>...</html>",
    "userRequest": "헤더 배경을 파란색으로 변경"
  }'
```

---

## ✅ 완료 기준

- [ ] `.env.local`에 Gemini API 키 설정
- [ ] `npm run dev` 실행
- [ ] `/api/generate` POST 테스트 성공
- [ ] `/api/modify` POST 테스트 성공
- [ ] 에러 처리 확인 (빈 박스, API 실패 등)
- [ ] API 키 순환 동작 확인

---

## 에러 핸들링

### 1. API 키 없음

```typescript
if (API_KEYS.length === 0) {
  throw new Error('Gemini API 키가 설정되지 않았습니다');
}
```

### 2. 할당량 초과 (429)

```typescript
// lib/gemini.ts에 추가
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Git 커밋

```bash
git add lib/gemini.ts app/api/
git commit -m "feat: Gemini API integration with generate and modify endpoints"
```

---

## 다음 단계

- [ ] P1-B (PreviewPanel)에서 `/api/generate` 호출 구현
- [ ] P1-C (ChatPanel)에서 `/api/modify` 호출 구현
