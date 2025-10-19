# TODO: 레이아웃 안정성 개선 방안

**작성일**: 2025-10-19
**목적**: Gemini 의존도를 낮추고 사용자 입력을 구조화하여 일관성 있는 HTML 생성

---

## 현재 문제점

### 1. LLM 비결정성 문제
- **증상**: 동일한 프롬프트로 다른 결과 생성
  - V14: `grid grid-cols-2` → 1행 배치 ✓
  - V15: `flex flex-col space-y-4` → 2행 배치 ✗
- **원인**: Gemini가 자연어 해석을 다르게 함
- **영향**: 사용자가 예측 불가능한 레이아웃 받음

### 2. 제어력 부족
- 프롬프트로만 제어 → 100% 일관성 불가능
- "1행으로 배치"라는 자연어가 모호함
- CSS 클래스 선택권이 Gemini에게 있음

### 3. 디버깅 어려움
- 문제 발생 시 프롬프트만 수정 가능
- 근본적 해결 불가 (LLM 특성상)

---

## 개선 방안 3가지

### Option A: 구조화된 입력 UI (가장 안정적, 개발 비용 높음)

#### 컨셉
사용자가 레이아웃 구조를 UI로 직접 정의

#### UI 설계
```
┌─────────────────────────────────────┐
│ 박스 설정                            │
├─────────────────────────────────────┤
│ 내용: [자유 텍스트 입력]             │
│                                      │
│ 레이아웃 유형:                       │
│  ○ 자유 입력 (AI가 해석)             │
│  ○ 폼 (라벨 + 입력필드 조합)         │
│  ● 그리드/테이블 (정확한 행열)       │
│                                      │
│ [그리드 설정 - 유형 선택시 표시]     │
│  행: [1] × 열: [10]                  │
│                                      │
│  각 셀 내용:                         │
│  ┌─────────────────────────────┐   │
│  │ 셀1: 라벨 [지정현황]         │   │
│  │ 셀2: 입력 [사업장수]         │   │
│  │ 셀3: 입력 [근로자수]         │   │
│  │ ...                          │   │
│  └─────────────────────────────┘   │
│                                      │
│ 스타일 (선택):                       │
│  배경색: [#f0f0f0] 테두리: [✓]      │
└─────────────────────────────────────┘
```

#### 데이터 모델
```typescript
interface GridConfig {
  rows: number;
  cols: number;
  items: Array<{
    type: 'label' | 'input' | 'button' | 'text' | 'select';
    content: string;
    placeholder?: string;
  }>;
}

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;

  // 레이아웃 방식 선택
  layoutType: 'freeform' | 'form' | 'grid' | 'table';

  // 자유 입력 (기존)
  content?: string;

  // 구조화된 입력 (신규)
  gridConfig?: GridConfig;

  // 팝업
  hasPopup?: boolean;
  popupContent?: string;
  popupTriggerText?: string;
}
```

#### 장점
- **100% 일관성**: 정확한 HTML 구조 생성
- **사용자 제어**: 원하는 대로 정확히 배치
- **디버깅 용이**: 구조 문제 원천 차단

#### 단점
- **개발 비용**: UI 컴포넌트 많이 필요
- **UX 복잡도**: 사용자가 더 많이 입력해야 함
- **유연성 감소**: 미리 정의된 패턴만 가능

#### 구현 예상 공수
- UI 컴포넌트: 2-3일
- 데이터 모델 수정: 1일
- HTML 생성 로직: 1-2일
- **총 4-6일**

---

### Option B: 하이브리드 방식 (추천 - 균형잡힌 접근)

#### 컨셉
1단계(구조)는 코드로, 2단계(스타일)는 Gemini로 분리

#### 아키텍처
```
사용자 입력
    ↓
[1단계] 구조 생성 (코드 기반 - 100% 일관성)
    ├─ layoutType이 'grid'면 → 정확한 <div> 구조 생성
    ├─ rows × cols 정보 → grid-template-columns 직접 설정
    └─ items 배열 → HTML 요소로 변환
    ↓
    <div class="grid" style="grid-template-columns: repeat(10, 1fr)">
      <div>지정현황</div>
      <input placeholder="사업장수">
      ...
    </div>
    ↓
[2단계] 스타일 적용 (Gemini - 디자인만 담당)
    ├─ 생성된 구조는 절대 변경 금지
    ├─ TailwindCSS 클래스만 추가
    └─ 색상, 간격, 폰트 등 미적 요소만
    ↓
최종 HTML
```

#### 구현 예시
```typescript
// lib/structureGenerator.ts (신규)
export function generateStructure(box: Box): string {
  // 자유 입력 모드
  if (box.layoutType === 'freeform') {
    return ''; // Gemini가 전부 생성
  }

  // 그리드 모드
  if (box.layoutType === 'grid' && box.gridConfig) {
    const { rows, cols, items } = box.gridConfig;

    return `<div class="grid" style="grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, auto)">
      ${items.map(item => {
        if (item.type === 'label') return `<span>${item.content}</span>`;
        if (item.type === 'input') return `<input placeholder="${item.content}">`;
        return `<div>${item.content}</div>`;
      }).join('\n')}
    </div>`;
  }

  return '';
}

// lib/gemini.ts 수정
const structuredHTML = generateStructure(box);

const prompt = structuredHTML
  ? `다음 HTML 구조에 TailwindCSS 스타일만 추가하세요.
     구조는 절대 변경하지 마세요:
     ${structuredHTML}`
  : `다음 요구사항으로 HTML 생성:
     ${box.content}`;
```

#### 장점
- **점진적 마이그레이션**: 기존 방식 유지 + 신규 옵션 추가
- **필요한 곳만 적용**: 정확성이 중요한 부분만 구조화
- **개발 비용 적정**: Option A보다 간단
- **Gemini 활용**: 디자인 부분은 여전히 AI 활용

#### 단점
- **두 단계 처리**: 로직이 조금 복잡해짐
- **Gemini 신뢰 필요**: 구조 변경 안 한다는 보장 없음 (추가 검증 필요)

#### 구현 예상 공수
- 구조 생성 모듈: 1-2일
- UI 추가 (간단한 폼): 1일
- Gemini 프롬프트 수정: 0.5일
- 검증 로직: 0.5일
- **총 3-4일**

---

### Option C: 템플릿 기반 (가장 빠름, 유연성 낮음)

#### 컨셉
자주 사용하는 레이아웃을 템플릿으로 미리 정의

#### 구현
```typescript
// lib/templates.ts
const layoutTemplates = {
  // 1행 N열 폼
  'form-1row-labels-inputs': {
    description: '1행 라벨+입력 반복 (지정현황, 사업현황 등)',
    slots: ['label1', 'input1', 'label2', 'input2', 'label3', 'input3', ...],
    html: (data: string[]) => `
      <div class="grid grid-cols-${data.length} gap-4">
        ${data.map((item, i) =>
          i % 2 === 0
            ? `<label class="bg-blue-100 p-2">${item}</label>`
            : `<input placeholder="${item}" class="border p-2">`
        ).join('\n')}
      </div>
    `
  },

  // 동적 테이블
  'table-dynamic': {
    description: 'N행 M열 테이블',
    generate: (rows: number, cols: number, headers: string[]) => `
      <table class="w-full border-collapse">
        <thead>
          <tr>${headers.map(h => `<th class="border p-2">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${Array(rows).fill(0).map(() =>
            `<tr>${Array(cols).fill(0).map(() =>
              `<td class="border p-2"><input class="w-full"></td>`
            ).join('')}</tr>`
          ).join('\n')}
        </tbody>
      </table>
    `
  }
};

// 사용자 UI
<select value={box.template} onChange={...}>
  <option value="">자유 입력</option>
  <option value="form-1row-labels-inputs">1행 폼 (라벨+입력)</option>
  <option value="table-dynamic">테이블</option>
</select>

{box.template === 'form-1row-labels-inputs' && (
  <textarea placeholder="라벨1, 입력1, 라벨2, 입력2 (쉼표로 구분)" />
)}
```

#### 장점
- **빠른 개발**: 1-2일이면 완성
- **즉시 안정성**: 검증된 패턴만 사용
- **단순 UX**: 템플릿 선택 + 데이터만 입력

#### 단점
- **제한적**: 미리 정의한 패턴만 가능
- **확장성 낮음**: 새 패턴마다 코드 추가 필요
- **유연성 부족**: 복잡한 레이아웃 대응 어려움

#### 구현 예상 공수
- 템플릿 3-5개 정의: 1일
- UI 통합: 0.5일
- **총 1.5-2일**

---

## 추천 구현 순서

### Phase 1: 최소 변경으로 빠른 개선 (1주일)
**목표**: 당장 가장 문제되는 그리드/테이블 레이아웃 안정화

**구현**:
```typescript
// types/index.ts
export interface Box {
  // 기존 필드...

  // 추가
  strictLayout?: {
    type: 'grid' | 'table';
    rows: number;
    cols: number;
    cellContents: string; // 쉼표로 구분된 셀 내용
  };
}
```

**UI 추가** (GridBox.tsx):
```tsx
<div className="mt-2 border-t pt-2">
  <label>
    <input
      type="checkbox"
      checked={box.strictLayout !== undefined}
      onChange={...}
    />
    정확한 레이아웃 모드 (그리드/테이블)
  </label>

  {box.strictLayout && (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input type="number" placeholder="행" min="1" />
        <input type="number" placeholder="열" min="1" />
      </div>
      <textarea
        placeholder="각 셀 내용을 쉼표로 구분해서 입력
예: 지정현황, 사업장수, 근로자수, 사업현황, 사업장수, 근로자수"
        rows={3}
      />
    </div>
  )}
</div>
```

**Gemini 프롬프트 강화**:
```typescript
${box.strictLayout ? `
**절대적 레이아웃 요구사항**:
- 유형: ${box.strictLayout.type}
- 반드시 ${box.strictLayout.rows}행 × ${box.strictLayout.cols}열
- 다음 정확한 구조를 사용하세요 (변경 금지):

<div class="grid" style="grid-template-columns: repeat(${box.strictLayout.cols}, 1fr);">
  ${box.strictLayout.cellContents.split(',').map(c => `<div>${c.trim()}</div>`).join('\n')}
</div>

위 구조에 TailwindCSS 클래스만 추가하고, grid-template-columns와 내용은 절대 변경하지 마세요.
` : ''}
```

**효과**:
- 그리드/테이블 일관성 대폭 향상
- 기존 자유 입력 방식 완전 호환
- 개발 2-3일이면 완성

---

### Phase 2: 하이브리드 시스템 구축 (2-3주)
**목표**: 구조 생성을 코드로 분리하여 근본적 안정성 확보

**구현**:
1. `lib/structureGenerator.ts` 생성
2. 레이아웃 타입별 HTML 구조 생성 함수
3. Gemini 역할을 스타일링으로 제한
4. 구조 변경 검증 로직 추가

**효과**:
- 90%+ 일관성 달성
- Gemini 의존도 50% 감소
- 디버깅 가능한 시스템

---

### Phase 3: 고급 기능 추가 (1-2개월)
**목표**: 복잡한 레이아웃도 정확하게 생성

**구현**:
1. 드래그앤드롭 셀 배치 UI
2. 중첩 레이아웃 지원
3. 반응형 설정 옵션
4. 레이아웃 프리셋 라이브러리

---

## 결정 사항 체크리스트

회의에서 결정할 항목:

- [ ] 어느 옵션으로 진행할지? (A / B / C)
- [ ] 개발 우선순위는? (빠른 개선 vs 근본적 해결)
- [ ] UX 복잡도 수용 가능한가? (간단 vs 정확)
- [ ] 예산/일정은? (1주 / 3주 / 2개월)
- [ ] Phase 1만 우선 적용할지?
- [ ] 기존 자유 입력 방식 유지할지?

---

## 참고 자료

### 현재 프로젝트 상태
- 파일: `/mnt/c/CodePracticeProject/TexttoHtml/text-to-html`
- 문제 사례: `Testcase/layout-v14.html` (성공) vs `layout-v15.html` (실패)
- 현재 프롬프트: `lib/gemini.ts` 55-61줄

### 관련 이슈
- Gemini 비결정성으로 인한 레이아웃 불일치
- 자연어 프롬프트 한계
- 프로덕션 환경에서의 신뢰성 부족

---

**작성자**: Claude Code
**검토 필요**: 개발팀, 기획팀
**다음 액션**: 회의 후 선택된 옵션 구현 시작
