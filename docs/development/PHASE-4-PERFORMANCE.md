# Phase 4: 성능 및 안정성

**목표**: 복잡한 구조 처리 및 에러 핸들링 개선
**예상 기간**: 2일
**브랜치**: `feature/phase-4-performance`
**담당 세션**: Session B

---

## 작업 내용

### 1. Gemini 프롬프트 최적화

**목표**: 계층 구조를 명확히 이해하도록 프롬프트 개선

```typescript
// lib/gemini.ts

const PROMPT_TEMPLATE = `
당신은 HTML 전문가입니다. 주어진 Box 정보를 바탕으로 Tailwind CSS를 사용한 반응형 HTML을 생성하세요.

# 레이아웃 타입 이해

## 1. Simple 레이아웃
- 사용자 설명만으로 HTML을 생성합니다.
- 예시: "로그인 폼" → <form>...</form>

## 2. Flex 레이아웃
- 자식 요소들이 Flexbox로 배치됩니다.
- order 속성에 따라 순서가 정해집니다.
- flexGrow, width, height 속성을 고려하세요.
- 예시:
  Box (Flex):
    - Child 1 (text, order: 0, flexGrow: 1): "제목"
    - Child 2 (button, order: 1): "클릭"

  → HTML:
  <div class="flex flex-row gap-2">
    <p class="flex-grow">제목</p>
    <button>클릭</button>
  </div>

## 3. Table 레이아웃
- TableStructure를 바탕으로 <table> 태그를 생성합니다.
- rowspan, colspan 속성을 정확히 반영하세요.
- 병합된 셀은 제공된 cells 배열에만 존재합니다.
- 예시:
  Table (3행 × 3열):
    - Cell (0,0, rowspan=2, colspan=1): "헤더"
    - Cell (0,1, rowspan=1, colspan=2): "타이틀"
    - Cell (1,1): "데이터1"
    - Cell (1,2): "데이터2"
    ...

  → HTML:
  <table class="border-collapse border">
    <tr>
      <td rowspan="2">헤더</td>
      <td colspan="2">타이틀</td>
    </tr>
    <tr>
      <td>데이터1</td>
      <td>데이터2</td>
    </tr>
    ...
  </table>

# 필수 규칙

1. **Tailwind CSS 사용**: 인라인 스타일 대신 Tailwind 클래스 사용
2. **반응형**: 모바일/데스크톱 대응 (sm:, md:, lg: 사용)
3. **접근성**: aria-label, alt, role 속성 추가
4. **Popup 지원**: hasPopup이 true인 경우 모달 HTML 포함
5. **Grid 레이아웃**: 12-column grid 기준으로 배치

# Box 정보

{{BOXES_DATA}}

# 출력 형식

- 전체 페이지 구조 (<!DOCTYPE html>부터 </html>까지)
- 반응형 container 사용
- Popup은 TailwindCSS 모달로 구현
- 주석 최소화, 깔끔한 코드
`;

function generatePrompt(boxes: Box[]): string {
  let boxesData = '';

  boxes.forEach((box, idx) => {
    boxesData += `\n## Box ${idx + 1}\n`;
    boxesData += `- ID: ${box.id}\n`;
    boxesData += `- 위치: Grid Column ${box.x} (0-11), Y ${box.y}px\n`;
    boxesData += `- 크기: ${box.width} ${box.layout === 'simple' ? 'columns' : 'px'} × ${box.height}px\n`;
    boxesData += `- 레이아웃: ${box.layout || 'simple'}\n`;

    if (box.layout === 'flex' && box.children) {
      boxesData += `- Flex 자식 요소 (${box.children.length}개):\n`;
      box.children
        .sort((a, b) => a.order - b.order)
        .forEach((child, childIdx) => {
          boxesData += `  ${childIdx + 1}. ${child.type} (order: ${child.order}):\n`;
          boxesData += `     - 내용: ${child.content}\n`;
          if (child.flexGrow !== undefined && child.flexGrow > 0) {
            boxesData += `     - flexGrow: ${child.flexGrow}\n`;
          }
          if (child.width) boxesData += `     - width: ${child.width}px\n`;
          if (child.height) boxesData += `     - height: ${child.height}px\n`;
        });
    } else if (box.layout === 'table' && box.tableStructure) {
      const { rows, cols, cells } = box.tableStructure;
      boxesData += `- Table 구조 (${rows}행 × ${cols}열):\n`;
      boxesData += `- Cells:\n`;

      cells.forEach((cell, cellIdx) => {
        boxesData += `  ${cellIdx + 1}. (row ${cell.rowIndex}, col ${cell.colIndex})`;
        if (cell.rowspan > 1) boxesData += ` rowspan=${cell.rowspan}`;
        if (cell.colspan > 1) boxesData += ` colspan=${cell.colspan}`;
        boxesData += `: "${cell.content}"\n`;
      });
    } else {
      boxesData += `- 설명: ${box.content}\n`;
    }

    if (box.hasPopup) {
      boxesData += `- Popup:\n`;
      boxesData += `  - 트리거 텍스트: ${box.popupTriggerText}\n`;
      boxesData += `  - 내용: ${box.popupContent}\n`;
    }
  });

  return PROMPT_TEMPLATE.replace('{{BOXES_DATA}}', boxesData);
}
```

---

### 2. 에러 핸들링 개선

**2.1. API Route 에러 처리**

```typescript
// app/api/generate/route.ts

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { boxes }: { boxes: Box[] } = await request.json();

    // === 입력 검증 ===
    if (!boxes || boxes.length === 0) {
      return NextResponse.json(
        { error: 'Box 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    // Box 유효성 검사
    for (const box of boxes) {
      if (!isValidBox(box)) {
        return NextResponse.json(
          { error: `유효하지 않은 Box: ${box.id}` },
          { status: 400 }
        );
      }

      // Table 구조 검증
      if (box.layout === 'table' && box.tableStructure) {
        if (!TableCellMerger.validate(box.tableStructure)) {
          return NextResponse.json(
            { error: `잘못된 테이블 구조: Box ${box.id}` },
            { status: 400 }
          );
        }
      }
    }

    // === Gemini API 호출 ===
    const prompt = generatePrompt(boxes);
    let html: string;

    try {
      html = await generateHTML(prompt);
    } catch (geminiError: any) {
      console.error('Gemini API Error:', geminiError);

      // 타임아웃 에러
      if (geminiError.message?.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'HTML 생성 시간이 초과되었습니다. 박스 수를 줄이거나 내용을 간단히 해보세요.',
            code: 'TIMEOUT',
          },
          { status: 504 }
        );
      }

      // API 키 에러
      if (geminiError.message?.includes('API key')) {
        return NextResponse.json(
          { error: 'API 키 오류. 관리자에게 문의하세요.', code: 'API_KEY_ERROR' },
          { status: 500 }
        );
      }

      // 기타 에러
      return NextResponse.json(
        { error: 'HTML 생성 실패. 다시 시도해주세요.', code: 'GENERATION_ERROR' },
        { status: 500 }
      );
    }

    // === 성공 응답 ===
    return NextResponse.json({ html }, { status: 200 });
  } catch (error: any) {
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: '예상치 못한 오류가 발생했습니다.', code: 'UNEXPECTED_ERROR' },
      { status: 500 }
    );
  }
}
```

**2.2. 클라이언트 에러 핸들링**

```typescript
// app/page.tsx

async function handleGenerateHTML() {
  setIsGenerating(true);
  setError(null);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxes }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 에러 코드별 처리
      switch (data.code) {
        case 'TIMEOUT':
          setError({
            message: '⏱️ 처리 시간 초과',
            detail: data.error,
            suggestion: 'Box 수를 줄이거나 내용을 간단히 해보세요.',
          });
          break;

        case 'API_KEY_ERROR':
          setError({
            message: '🔑 API 키 오류',
            detail: '관리자에게 문의하세요.',
          });
          break;

        case 'GENERATION_ERROR':
          setError({
            message: '❌ HTML 생성 실패',
            detail: data.error,
            suggestion: '다시 시도하거나 내용을 수정해보세요.',
          });
          break;

        default:
          setError({
            message: '⚠️ 오류 발생',
            detail: data.error || '알 수 없는 오류',
          });
      }

      return;
    }

    // 성공
    setGeneratedHTML(data.html);
    toast.success('HTML이 생성되었습니다!');
  } catch (fetchError) {
    // 네트워크 에러
    setError({
      message: '🌐 네트워크 오류',
      detail: '서버에 연결할 수 없습니다.',
      suggestion: '인터넷 연결을 확인하거나 잠시 후 다시 시도하세요.',
    });
  } finally {
    setIsGenerating(false);
  }
}
```

---

### 3. 성능 최적화

**3.1. React 렌더링 최적화**

```typescript
// components/Canvas/BoxEditor.tsx

import { memo } from 'react';

export const BoxEditor = memo(function BoxEditor({ box, onUpdate }: BoxEditorProps) {
  // ... 기존 코드 ...
}, (prevProps, nextProps) => {
  // 얕은 비교: box ID와 주요 속성만 비교
  return (
    prevProps.box.id === nextProps.box.id &&
    prevProps.box.x === nextProps.box.x &&
    prevProps.box.y === nextProps.box.y &&
    prevProps.box.width === nextProps.box.width &&
    prevProps.box.height === nextProps.box.height &&
    prevProps.box.layout === nextProps.box.layout
  );
});
```

**3.2. Zustand 선택적 구독**

```typescript
// app/page.tsx

// ❌ 나쁜 예: 전체 스토어 구독
const { boxes, addBox, updateBox } = useBoxStore();

// ✅ 좋은 예: 필요한 부분만 구독
const boxes = useBoxStore((state) => state.boxes);
const updateBox = useBoxStore((state) => state.updateBox);
```

**3.3. 복잡한 계산 메모이제이션**

```typescript
// components/Canvas/TableBuilder.tsx

import { useMemo } from 'react';

const tableGrid = useMemo(() => {
  return TableCellMerger.buildGrid(tableStructure);
}, [tableStructure]);

const cellPositions = useMemo(() => {
  return tableStructure.cells.reduce((acc, cell) => {
    acc[`${cell.rowIndex}-${cell.colIndex}`] = cell;
    return acc;
  }, {} as Record<string, TableCell>);
}, [tableStructure.cells]);
```

**3.4. 가상 스크롤 (선택사항)**

```typescript
// components/Canvas/FlexLayoutEditor.tsx

import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const rowVirtualizer = useVirtualizer({
  count: children.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100, // 예상 행 높이
  overscan: 5,
});

// children.length > 50일 때만 가상 스크롤 사용
const shouldVirtualize = children.length > 50;
```

---

### 4. 복잡도 제한 및 경고

**4.1. 복잡도 점수 계산**

```typescript
// lib/complexity.ts

export interface ComplexityScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'extreme';
  warnings: string[];
}

export function calculateComplexity(boxes: Box[]): ComplexityScore {
  let score = 0;
  const warnings: string[] = [];

  // Box 수
  score += boxes.length * 10;
  if (boxes.length > 10) {
    warnings.push(`Box 수가 많습니다 (${boxes.length}개). 10개 이하 권장.`);
  }

  // 각 Box 분석
  for (const box of boxes) {
    // Flex 자식 요소
    if (box.children) {
      score += box.children.length * 5;
      if (box.children.length > 10) {
        warnings.push(`Box ${box.id}: 자식 요소가 너무 많습니다 (${box.children.length}개).`);
      }
    }

    // Table 복잡도
    if (box.tableStructure) {
      const { rows, cols, cells } = box.tableStructure;
      score += rows * cols * 2;

      // 병합된 셀 수
      const mergedCells = cells.filter((c) => c.rowspan > 1 || c.colspan > 1);
      score += mergedCells.length * 3;

      if (rows * cols > 50) {
        warnings.push(`Box ${box.id}: 테이블이 너무 큽니다 (${rows}×${cols}).`);
      }
    }

    // Popup
    if (box.hasPopup) {
      score += 5;
    }
  }

  // 레벨 판정
  let level: ComplexityScore['level'];
  if (score < 50) level = 'low';
  else if (score < 100) level = 'medium';
  else if (score < 200) level = 'high';
  else level = 'extreme';

  return { score, level, warnings };
}
```

**4.2. 생성 전 경고 표시**

```typescript
// app/page.tsx

function handleGenerateClick() {
  const complexity = calculateComplexity(boxes);

  if (complexity.level === 'extreme') {
    const confirmed = confirm(
      `⚠️ 매우 복잡한 구조입니다 (점수: ${complexity.score}).\n\n` +
      complexity.warnings.join('\n') +
      '\n\n계속 진행하시겠습니까? (시간이 오래 걸릴 수 있습니다)'
    );

    if (!confirmed) return;
  } else if (complexity.level === 'high') {
    toast.warning(`복잡도 높음 (점수: ${complexity.score}). 시간이 다소 소요됩니다.`);
  }

  handleGenerateHTML();
}
```

---

## 검증 기준

### 성능 검증
- ✅ 10개 Box + 각 5개 자식 요소 처리 가능 (30초 이내)
- ✅ 복잡한 테이블 (10×10, 병합 셀 5개) 처리 가능
- ✅ 브라우저 렌더링 60fps 유지
- ✅ Zustand 선택적 구독으로 불필요한 리렌더링 없음

### 에러 핸들링 검증
- ✅ 타임아웃 에러 시 사용자 친화적 메시지
- ✅ 잘못된 테이블 구조 입력 시 검증 에러
- ✅ 네트워크 에러 시 재시도 안내
- ✅ 모든 에러가 콘솔과 UI 양쪽에 표시

### 프롬프트 검증
- ✅ Flex 레이아웃 → 올바른 순서로 HTML 생성
- ✅ Table 레이아웃 → rowspan/colspan 정확히 반영
- ✅ 복잡한 구조도 이해하고 생성 성공
- ✅ Popup 포함 시 모달 HTML 생성

---

## 다음 단계

Phase 4 완료 후:
1. **Phase 5 시작**: 테스팅
2. **문서 업데이트**: 성능 최적화 가이드

---

**생성일**: 2025-10-26
**담당자**: Session B
**상태**: ⏳ Phase 3 완료 대기
