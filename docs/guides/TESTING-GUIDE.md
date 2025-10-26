# 테스팅 가이드

**목적**: 프로젝트의 품질을 보장하기 위한 체계적인 테스트 전략

---

## 테스트 전략

### 테스트 피라미드

```
        E2E (5%)
      /          \
   통합 (25%)
  /              \
단위 (70%)
```

- **단위 테스트 (70%)**: 개별 함수/클래스 테스트
- **통합 테스트 (25%)**: 컴포넌트 간 상호작용 테스트
- **E2E 테스트 (5%)**: 사용자 시나리오 테스트

---

## 테스트 도구

### 설치된 도구

```json
{
  "vitest": "^1.0.0",         // 단위/통합 테스트
  "@testing-library/react": "^14.0.0",  // React 컴포넌트 테스트
  "@testing-library/jest-dom": "^6.0.0",  // DOM 매처
  "@playwright/test": "^1.40.0",  // E2E 테스트
  "c8": "^9.0.0"              // 커버리지
}
```

### 설정 파일

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.ts',
        '.next/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

```typescript
// tests/setup.ts

import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
});

// 커스텀 매처 (선택사항)
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be one of ${expected}`
          : `expected ${received} to be one of ${expected}`,
    };
  },
});
```

---

## 단위 테스트

### 데이터 모델 테스트

```typescript
// tests/unit/types.test.ts

import { describe, it, expect } from 'vitest';
import {
  isValidBox,
  createDefaultBox,
  createDefaultChildElement,
  createDefaultTableStructure,
} from '@/types';

describe('Box Validation', () => {
  it('should validate simple box', () => {
    const box = createDefaultBox();
    expect(isValidBox(box)).toBe(true);
  });

  it('should reject invalid layout type', () => {
    const box = { ...createDefaultBox(), layout: 'invalid' as any };
    expect(isValidBox(box)).toBe(false);
  });

  it('should reject table layout without tableStructure', () => {
    const box = { ...createDefaultBox(), layout: 'table' };
    expect(isValidBox(box)).toBe(false);
  });
});

describe('ChildElement Creation', () => {
  it('should create element with correct defaults', () => {
    const child = createDefaultChildElement('button', 0);

    expect(child.type).toBe('button');
    expect(child.order).toBe(0);
    expect(child.flexGrow).toBe(0);
    expect(child.id).toBeTruthy();
  });

  it('should create unique IDs', () => {
    const child1 = createDefaultChildElement('text', 0);
    const child2 = createDefaultChildElement('text', 1);

    expect(child1.id).not.toBe(child2.id);
  });
});

describe('TableStructure Creation', () => {
  it('should create 3x3 table with 9 cells', () => {
    const table = createDefaultTableStructure(3, 3);

    expect(table.rows).toBe(3);
    expect(table.cols).toBe(3);
    expect(table.cells).toHaveLength(9);
  });

  it('should initialize cells with default properties', () => {
    const table = createDefaultTableStructure(2, 2);

    table.cells.forEach((cell) => {
      expect(cell.colspan).toBe(1);
      expect(cell.rowspan).toBe(1);
      expect(cell.content).toBe('');
    });
  });
});
```

### 유틸리티 함수 테스트

```typescript
// tests/unit/table-merger.test.ts

import { describe, it, expect } from 'vitest';
import { TableCellMerger } from '@/components/shared/TableCellMerger';
import { createDefaultTableStructure } from '@/types';

describe('TableCellMerger - Merge', () => {
  it('should merge 2x2 cells', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(merged).not.toBeNull();
    expect(merged!.cells).toHaveLength(6);

    const mergedCell = merged!.cells.find(
      (c) => c.rowIndex === 0 && c.colIndex === 0
    );
    expect(mergedCell?.rowspan).toBe(2);
    expect(mergedCell?.colspan).toBe(2);
  });

  it('should reject non-rectangular merge', () => {
    const table = createDefaultTableStructure(3, 3);

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ]);

    expect(merged).toBeNull();
  });

  it('should combine cell contents', () => {
    const table = createDefaultTableStructure(2, 2);
    table.cells[0].content = 'A';
    table.cells[1].content = 'B';

    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const mergedCell = merged!.cells.find(
      (c) => c.rowIndex === 0 && c.colIndex === 0
    );
    expect(mergedCell?.content).toBe('A B');
  });
});

describe('TableCellMerger - Split', () => {
  it('should split merged cell', () => {
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
});

describe('TableCellMerger - Validate', () => {
  it('should validate correct table', () => {
    const table = createDefaultTableStructure(3, 3);
    expect(TableCellMerger.validate(table)).toBe(true);
  });

  it('should reject table with gaps', () => {
    const table = createDefaultTableStructure(3, 3);
    table.cells = table.cells.slice(0, 8);

    expect(TableCellMerger.validate(table)).toBe(false);
  });
});
```

### 복잡도 계산 테스트

```typescript
// tests/unit/complexity.test.ts

import { describe, it, expect } from 'vitest';
import { calculateComplexity } from '@/lib/complexity';
import { createDefaultBox, createDefaultChildElement } from '@/types';

describe('Complexity Calculation', () => {
  it('should give low score for single simple box', () => {
    const boxes = [createDefaultBox()];
    const result = calculateComplexity(boxes);

    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(50);
  });

  it('should give medium score for multiple flex boxes', () => {
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
  });

  it('should include warnings for excessive elements', () => {
    const boxes = Array.from({ length: 15 }, () => createDefaultBox());

    const result = calculateComplexity(boxes);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
```

---

## 통합 테스트

### 컴포넌트 통합 테스트

```typescript
// tests/integration/flex-layout.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlexLayoutEditor } from '@/components/Canvas/FlexLayoutEditor';
import { createDefaultBox } from '@/types';

describe('FlexLayoutEditor Integration', () => {
  it('should add and delete child elements', async () => {
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

    // 삭제 버튼 클릭
    const deleteBtn = screen.getByText('삭제');
    fireEvent.click(deleteBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        children: [],
      })
    );
  });

  it('should update child element properties', () => {
    const box = {
      ...createDefaultBox(),
      layout: 'flex',
      children: [createDefaultChildElement('text', 0)],
    };
    const onUpdate = vi.fn();

    render(<FlexLayoutEditor box={box} onUpdate={onUpdate} />);

    // 내용 입력
    const input = screen.getByPlaceholderText('내용 입력...');
    fireEvent.change(input, { target: { value: '새 내용' } });

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        children: expect.arrayContaining([
          expect.objectContaining({ content: '새 내용' }),
        ]),
      })
    );
  });
});
```

### API 통합 테스트

```typescript
// tests/integration/api.test.ts

import { describe, it, expect, vi } from 'vitest';
import { POST as generatePOST } from '@/app/api/generate/route';
import { createDefaultBox } from '@/types';

// Gemini API 모킹
vi.mock('@/lib/gemini', () => ({
  generateHTML: vi.fn(() => Promise.resolve('<div>Mock HTML</div>')),
}));

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
    expect(data.html).toBeTruthy();
  });

  it('should reject invalid box data', async () => {
    const boxes = [{ id: '123', x: -1, y: 0, width: 0, height: 100 }];

    const request = new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ boxes }),
    });

    const response = await generatePOST(request);

    expect(response.status).toBe(400);
  });
});
```

---

## E2E 테스트

### Playwright 설정

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E 테스트 예시

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

## 테스트 실행

### 명령어

```bash
# 모든 단위/통합 테스트
npm test

# Watch 모드
npm test -- --watch

# 특정 파일 테스트
npm test -- types.test.ts

# 커버리지
npm test -- --coverage

# E2E 테스트
npx playwright test

# E2E UI 모드
npx playwright test --ui

# 특정 브라우저
npx playwright test --project=chromium
```

### CI/CD 스크립트

```bash
#!/bin/bash
# scripts/test-ci.sh

set -e

echo "🧪 Running all tests..."

# 1. 타입 체크
echo "📝 Type checking..."
npm run type-check

# 2. Lint
echo "🔍 Linting..."
npm run lint

# 3. 단위/통합 테스트
echo "🧪 Unit & Integration tests..."
npm test -- --coverage

# 4. E2E 테스트
echo "🎭 E2E tests..."
npx playwright test

# 5. 빌드
echo "🔨 Building..."
npm run build

echo "✅ All tests passed!"
```

---

## 커버리지 목표

### 목표 수치

```yaml
statements: 80%
branches: 75%
functions: 80%
lines: 80%
```

### 중요 경로 우선순위

```yaml
critical_paths:
  data_model: 95%        # types, validation
  table_merger: 90%      # 병합/분할 로직
  api_routes: 85%        # 에러 핸들링
  core_components: 80%   # FlexEditor, TableBuilder
  utils: 75%             # 기타 유틸리티
```

---

## 테스트 작성 팁

### 좋은 테스트 원칙

```yaml
FIRST:
  Fast: 빠르게 실행 (<100ms/test)
  Independent: 독립적 (순서 무관)
  Repeatable: 반복 가능 (항상 같은 결과)
  Self-Validating: 자동 검증 (수동 확인 불필요)
  Timely: 적시에 작성 (코드 작성 직후)
```

### AAA 패턴

```typescript
it('should do something', () => {
  // Arrange (준비)
  const box = createDefaultBox();
  const onUpdate = vi.fn();

  // Act (실행)
  render(<FlexLayoutEditor box={box} onUpdate={onUpdate} />);
  fireEvent.click(screen.getByText('+ 텍스트'));

  // Assert (검증)
  expect(onUpdate).toHaveBeenCalled();
});
```

### 테스트 이름 규칙

```typescript
// ✅ 좋은 예
it('should merge 2x2 cells successfully', () => {});
it('should reject non-rectangular merge', () => {});
it('should create element with correct defaults', () => {});

// ❌ 나쁜 예
it('test 1', () => {});
it('merge', () => {});
it('works', () => {});
```

---

## 트러블슈팅

### 일반적인 문제

```yaml
문제: "Cannot find module '@/types'"
해결:
  - vitest.config.ts의 alias 확인
  - tsconfig.json의 paths 확인

문제: "ReferenceError: document is not defined"
해결:
  - environment: 'jsdom' 설정 확인
  - tests/setup.ts import 확인

문제: "Timeout of 5000ms exceeded"
해결:
  - 비동기 작업에 await 추가
  - timeout 옵션 증가: { timeout: 10000 }

문제: "Test failed unexpectedly"
해결:
  - cleanup() 함수 호출 확인
  - Mock 상태 초기화
```

---

**생성일**: 2025-10-26
**담당자**: Session C
**상태**: ✅ 활성
