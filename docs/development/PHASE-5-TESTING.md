# Phase 5: 테스팅

**목표**: 각 기능 통합 테스트 및 회귀 방지
**예상 기간**: 2일
**브랜치**: `feature/phase-5-testing`
**담당 세션**: Session C

---

## 테스트 전략

```
테스트 피라미드:
  E2E 테스트 (5%) - 핵심 사용자 시나리오
       ↑
  통합 테스트 (25%) - 컴포넌트 간 상호작용
       ↑
  단위 테스트 (70%) - 개별 함수/컴포넌트
```

---

## 1. 단위 테스트

### 1.1. 데이터 모델 테스트

```typescript
// tests/unit/types.test.ts

import { describe, it, expect } from 'vitest';
import {
  isValidBox,
  createDefaultBox,
  createDefaultChildElement,
  createDefaultTableStructure,
} from '@/types';

describe('Data Model - Box Validation', () => {
  it('should accept valid simple box', () => {
    const box = createDefaultBox();
    expect(isValidBox(box)).toBe(true);
  });

  it('should reject box with invalid layout type', () => {
    const box = { ...createDefaultBox(), layout: 'invalid' as any };
    expect(isValidBox(box)).toBe(false);
  });

  it('should reject table layout without tableStructure', () => {
    const box = { ...createDefaultBox(), layout: 'table' };
    expect(isValidBox(box)).toBe(false);
  });

  it('should accept table layout with valid structure', () => {
    const box = {
      ...createDefaultBox(),
      layout: 'table',
      tableStructure: createDefaultTableStructure(3, 3),
    };
    expect(isValidBox(box)).toBe(true);
  });
});

describe('Data Model - ChildElement', () => {
  it('should create child element with correct defaults', () => {
    const child = createDefaultChildElement('button', 0);

    expect(child.type).toBe('button');
    expect(child.order).toBe(0);
    expect(child.flexGrow).toBe(0);
    expect(child.flexShrink).toBe(1);
    expect(child.flexBasis).toBe('auto');
    expect(child.id).toBeTruthy();
  });

  it('should create unique IDs for multiple children', () => {
    const child1 = createDefaultChildElement('text', 0);
    const child2 = createDefaultChildElement('text', 1);

    expect(child1.id).not.toBe(child2.id);
  });
});

describe('Data Model - TableStructure', () => {
  it('should create 3x3 table with 9 cells', () => {
    const table = createDefaultTableStructure(3, 3);

    expect(table.rows).toBe(3);
    expect(table.cols).toBe(3);
    expect(table.cells).toHaveLength(9);
  });

  it('should initialize all cells with default properties', () => {
    const table = createDefaultTableStructure(2, 2);

    table.cells.forEach((cell) => {
      expect(cell.colspan).toBe(1);
      expect(cell.rowspan).toBe(1);
      expect(cell.content).toBe('');
    });
  });
});
```

### 1.2. TableCellMerger 테스트

```typescript
// tests/unit/table-merger.test.ts

import { describe, it, expect } from 'vitest';
import { TableCellMerger } from '@/components/shared/TableCellMerger';
import { createDefaultTableStructure } from '@/types';

describe('TableCellMerger - Merge', () => {
  it('should merge 2x2 cells successfully', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(merged).not.toBeNull();
    expect(merged!.cells).toHaveLength(6); // 9 - 4 + 1

    const mergedCell = merged!.cells.find(
      (c) => c.rowIndex === 0 && c.colIndex === 0
    );
    expect(mergedCell?.rowspan).toBe(2);
    expect(mergedCell?.colspan).toBe(2);
  });

  it('should reject non-rectangular merge (L-shape)', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      // Missing { row: 1, col: 1 }
    ]);

    expect(merged).toBeNull();
  });

  it('should reject merge with less than 2 cells', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [{ row: 0, col: 0 }]);

    expect(merged).toBeNull();
  });

  it('should combine cell contents on merge', () => {
    const table = createDefaultTableStructure(2, 2);
    table.cells[0].content = 'A';
    table.cells[1].content = 'B';

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const mergedCell = merged!.cells.find((c) => c.rowIndex === 0 && c.colIndex === 0);
    expect(mergedCell?.content).toBe('A B');
  });
});

describe('TableCellMerger - Split', () => {
  it('should split merged cell back to original cells', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const split = TableCellMerger.split(merged!, 0, 0);

    expect(split).not.toBeNull();
    expect(split!.cells).toHaveLength(9);
  });

  it('should reject split of non-merged cell', () => {
    const table = createDefaultTableStructure(3, 3);

    const split = TableCellMerger.split(table, 0, 0);

    expect(split).toBeNull();
  });

  it('should preserve original content in first cell after split', () => {
    const table = createDefaultTableStructure(2, 2);
    table.cells[0].content = 'Original';

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const split = TableCellMerger.split(merged!, 0, 0);

    const firstCell = split!.cells.find((c) => c.rowIndex === 0 && c.colIndex === 0);
    expect(firstCell?.content).toBe('Original');
  });
});

describe('TableCellMerger - Validate', () => {
  it('should validate correct 3x3 table', () => {
    const table = createDefaultTableStructure(3, 3);
    expect(TableCellMerger.validate(table)).toBe(true);
  });

  it('should reject table with gaps', () => {
    const table = createDefaultTableStructure(3, 3);
    table.cells = table.cells.slice(0, 8); // Remove last cell

    expect(TableCellMerger.validate(table)).toBe(false);
  });

  it('should reject table with overlapping cells', () => {
    const table = createDefaultTableStructure(2, 2);
    table.cells[0].colspan = 2;
    // Now (0,1) is both part of merged cell and standalone cell

    expect(TableCellMerger.validate(table)).toBe(false);
  });

  it('should reject table with cells outside bounds', () => {
    const table = createDefaultTableStructure(2, 2);
    table.cells[0].rowspan = 5; // Exceeds rows

    expect(TableCellMerger.validate(table)).toBe(false);
  });
});
```

### 1.3. 복잡도 계산 테스트

```typescript
// tests/unit/complexity.test.ts

import { describe, it, expect } from 'vitest';
import { calculateComplexity } from '@/lib/complexity';
import { createDefaultBox, createDefaultChildElement, createDefaultTableStructure } from '@/types';

describe('Complexity Calculation', () => {
  it('should give low score for single simple box', () => {
    const boxes = [createDefaultBox()];
    const result = calculateComplexity(boxes);

    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(50);
  });

  it('should give medium score for 5 boxes with flex children', () => {
    const boxes = Array.from({ length: 5 }, () => ({
      ...createDefaultBox(),
      layout: 'flex' as const,
      children: [
        createDefaultChildElement('text', 0),
        createDefaultChildElement('button', 1),
      ],
    }));

    const result = calculateComplexity(boxes);

    expect(result.level).toBe('medium');
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThan(100);
  });

  it('should give high score for complex tables', () => {
    const boxes = [
      {
        ...createDefaultBox(),
        layout: 'table' as const,
        tableStructure: createDefaultTableStructure(10, 10),
      },
    ];

    const result = calculateComplexity(boxes);

    expect(result.level).toBeOneOf(['high', 'extreme']);
  });

  it('should include warnings for excessive elements', () => {
    const boxes = Array.from({ length: 15 }, () => createDefaultBox());

    const result = calculateComplexity(boxes);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('Box 수가 많습니다');
  });
});
```

---

## 2. 통합 테스트

### 2.1. Flex 레이아웃 통합

```typescript
// tests/integration/flex-layout.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlexLayoutEditor } from '@/components/Canvas/FlexLayoutEditor';
import { createDefaultBox } from '@/types';

describe('FlexLayoutEditor Integration', () => {
  it('should add child element and update order', async () => {
    const box = { ...createDefaultBox(), layout: 'flex', children: [] };
    const onUpdate = vi.fn();

    render(<FlexLayoutEditor box={box} onUpdate={onUpdate} />);

    // 텍스트 자식 추가
    const addTextBtn = screen.getByText('+ 텍스트');
    fireEvent.click(addTextBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({ type: 'text', order: 0 }),
        ]),
      })
    );
  });

  it('should delete child element and reorder remaining', () => {
    const box = {
      ...createDefaultBox(),
      layout: 'flex',
      children: [
        createDefaultChildElement('text', 0),
        createDefaultChildElement('button', 1),
        createDefaultChildElement('input', 2),
      ],
    };
    const onUpdate = vi.fn();

    render(<FlexLayoutEditor box={box} onUpdate={onUpdate} />);

    // 두 번째 자식 삭제
    const deleteButtons = screen.getAllByText('삭제');
    fireEvent.click(deleteButtons[1]);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({ order: 0 }),
          expect.objectContaining({ order: 1 }), // 재정렬됨
        ]),
      })
    );
  });
});
```

### 2.2. Table Builder 통합

```typescript
// tests/integration/table-builder.test.tsx

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableBuilder } from '@/components/Canvas/TableBuilder';
import { createDefaultBox, createDefaultTableStructure } from '@/types';

describe('TableBuilder Integration', () => {
  it('should add row and update structure', () => {
    const box = {
      ...createDefaultBox(),
      layout: 'table',
      tableStructure: createDefaultTableStructure(3, 3),
    };
    const onUpdate = vi.fn();

    render(<TableBuilder box={box} onUpdate={onUpdate} />);

    const addRowBtn = screen.getByText('+ 행 추가');
    fireEvent.click(addRowBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tableStructure: expect.objectContaining({
          rows: 4,
          cells: expect.arrayContaining([
            expect.objectContaining({ rowIndex: 3 }),
          ]),
        }),
      })
    );
  });

  it('should merge selected cells', () => {
    const box = {
      ...createDefaultBox(),
      layout: 'table',
      tableStructure: createDefaultTableStructure(3, 3),
    };
    const onUpdate = vi.fn();

    render(<TableBuilder box={box} onUpdate={onUpdate} />);

    // 4개 셀 선택 (2x2)
    const cells = screen.getAllByRole('cell');
    fireEvent.click(cells[0]); // (0,0)
    fireEvent.click(cells[1]); // (0,1)
    fireEvent.click(cells[3]); // (1,0)
    fireEvent.click(cells[4]); // (1,1)

    const mergeBtn = screen.getByText('병합');
    fireEvent.click(mergeBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        tableStructure: expect.objectContaining({
          cells: expect.arrayContaining([
            expect.objectContaining({
              rowspan: 2,
              colspan: 2,
            }),
          ]),
        }),
      })
    );
  });
});
```

### 2.3. API Route 통합

```typescript
// tests/integration/api.test.ts

import { describe, it, expect } from 'vitest';
import { POST as generatePOST } from '@/app/api/generate/route';
import { createDefaultBox, createDefaultTableStructure } from '@/types';

describe('API /generate Integration', () => {
  it('should generate HTML for simple box', async () => {
    const boxes = [createDefaultBox()];
    boxes[0].content = '로그인 폼';

    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ boxes }),
    });

    const response = await generatePOST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.html).toContain('<form');
  });

  it('should reject invalid box data', async () => {
    const boxes = [{ id: '123', x: -1, y: 0, width: 0, height: 100 }]; // Invalid

    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ boxes }),
    });

    const response = await generatePOST(request);

    expect(response.status).toBe(400);
  });

  it('should reject invalid table structure', async () => {
    const box = {
      ...createDefaultBox(),
      layout: 'table',
      tableStructure: {
        rows: 2,
        cols: 2,
        cells: [], // Empty cells = invalid
      },
    };

    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ boxes: [box] }),
    });

    const response = await generatePOST(request);

    expect(response.status).toBe(400);
  });
});
```

---

## 3. E2E 테스트 (Playwright)

```typescript
// tests/e2e/user-workflow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Complete User Workflow', () => {
  test('should create flex layout and generate HTML', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 1. Box 추가
    await page.click('text=+ 박스 추가');

    // 2. Flex 레이아웃으로 변경
    await page.click('text=레이아웃');
    await page.click('text=📦 Flex');

    // 3. 자식 요소 추가
    await page.click('text=자식 요소');
    await page.click('text=+ 텍스트');
    await page.click('text=+ 버튼');

    // 4. 내용 입력
    const inputs = page.locator('input[placeholder*="내용 입력"]');
    await inputs.first().fill('제목');
    await inputs.last().fill('클릭');

    // 5. HTML 생성
    await page.click('text=HTML 생성');

    // 6. 결과 확인
    await expect(page.locator('text=HTML이 생성되었습니다')).toBeVisible({
      timeout: 60000,
    });

    const html = await page.textContent('.generated-html');
    expect(html).toContain('<div');
    expect(html).toContain('제목');
    expect(html).toContain('클릭');
  });

  test('should create table with merged cells', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 1. Box 추가 및 Table 레이아웃 선택
    await page.click('text=+ 박스 추가');
    await page.click('text=레이아웃');
    await page.click('text=📊 Table');

    // 2. 자식 요소 탭으로 이동
    await page.click('text=자식 요소');

    // 3. 4개 셀 선택
    const cells = page.locator('td');
    await cells.nth(0).click();
    await cells.nth(1).click();
    await cells.nth(3).click();
    await cells.nth(4).click();

    // 4. 병합
    await page.click('text=병합');

    // 5. HTML 생성
    await page.click('text=HTML 생성');

    // 6. 결과 확인
    await expect(page.locator('text=HTML이 생성되었습니다')).toBeVisible({
      timeout: 60000,
    });

    const html = await page.textContent('.generated-html');
    expect(html).toContain('rowspan="2"');
    expect(html).toContain('colspan="2"');
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Box 없이 HTML 생성 시도
    await page.click('text=HTML 생성');

    // 에러 메시지 확인
    await expect(page.locator('text=Box 데이터가 없습니다')).toBeVisible();
  });
});
```

---

## 4. 회귀 테스트 체크리스트

### 기존 기능 동작 확인

```markdown
## Phase 0 (데이터 모델)
- [ ] 기존 Simple Box 정상 로드
- [ ] LocalStorage 마이그레이션 성공
- [ ] 새로운 필드 추가해도 기존 기능 동작

## Phase 1 (Flex)
- [ ] Flex 자식 요소 드래그 앤 드롭
- [ ] 순서 변경 반영
- [ ] HTML 생성 시 order 순서대로 렌더링

## Phase 2 (Table)
- [ ] 테이블 병합/분할 정상 작동
- [ ] 복잡한 병합 구조 검증 통과
- [ ] HTML에 rowspan/colspan 정확히 반영

## Phase 3 (UX)
- [ ] 프리셋 크기 버튼 작동
- [ ] 비율 고정 크기 조절
- [ ] Layout 타입 전환 시 경고 표시

## Phase 4 (성능)
- [ ] 복잡도 계산 및 경고
- [ ] 에러 핸들링 (타임아웃, 네트워크, API 키)
- [ ] 성능 최적화 (React.memo, 선택적 구독)
```

---

## 5. 테스트 커버리지 목표

```yaml
coverage_targets:
  statements: 80%
  branches: 75%
  functions: 80%
  lines: 80%

critical_paths:
  data_model: 95%
  table_merger: 90%
  api_routes: 85%
  core_components: 80%
```

---

## 검증 기준

- ✅ 모든 단위 테스트 통과 (100개 이상)
- ✅ 통합 테스트 3가지 시나리오 성공
- ✅ E2E 테스트 2가지 워크플로우 성공
- ✅ 기존 기능 회귀 테스트 통과
- ✅ 코드 커버리지 80% 이상

---

## 다음 단계

Phase 5 완료 후:
1. **Phase 6 시작**: Docker 배포
2. **문서 업데이트**: 테스팅 가이드

---

**생성일**: 2025-10-26
**담당자**: Session C
**상태**: ⏳ Phase 4 완료 대기
