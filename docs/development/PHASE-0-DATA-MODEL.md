# Phase 0: 데이터 모델 확장

**목표**: 계층적 구조를 지원하는 타입 시스템 구축
**예상 기간**: 1일
**담당 세션**: Session A (Master)
**브랜치**: `feature/phase-0-data-model`

---

## 개요

현재 Box 인터페이스를 확장하여 다음을 지원:
1. **LayoutType**: Simple, Flex, Table 세 가지 레이아웃 타입
2. **ChildElement**: 박스 내부의 자식 요소 배열
3. **TableStructure**: 병합 셀을 포함한 테이블 구조
4. **하위 호환성**: 기존 프로젝트 데이터 자동 마이그레이션

---

## 작업 내용

### 1. `types/index.ts` 확장

**새로운 타입 정의**:

```typescript
// types/index.ts

// 기존 Box 인터페이스 유지 (하위 호환성)
export interface Box {
  id: string;
  x: number;          // Grid column (0-11)
  y: number;          // Y coordinate (px)
  width: number;      // Grid columns (1-12)
  height: number;     // Height (px)
  content: string;    // User description
  hasPopup?: boolean;
  popupContent?: string;
  popupTriggerText?: string;

  // === 새로운 필드 ===
  layout?: LayoutType;              // 기본값: 'simple'
  children?: ChildElement[];         // Flex/Table 레이아웃용
  tableStructure?: TableStructure;   // Table 전용
}

// 레이아웃 타입
export type LayoutType = 'simple' | 'flex' | 'table';

// 자식 요소 타입
export type ChildElementType = 'text' | 'input' | 'button' | 'image' | 'custom';

// 자식 요소 인터페이스
export interface ChildElement {
  id: string;
  type: ChildElementType;
  content: string;          // 텍스트 또는 설명
  order: number;            // Flex 레이아웃 순서 (0부터 시작)

  // Flex 레이아웃 속성
  flexGrow?: number;        // 기본값: 0
  flexShrink?: number;      // 기본값: 1
  flexBasis?: string;       // 예: '100px', 'auto'

  // 크기 속성
  width?: number;           // Pixel 단위
  height?: number;          // Pixel 단위

  // 스타일링
  className?: string;       // Tailwind 클래스
  customStyles?: Record<string, string>;
}

// 테이블 셀
export interface TableCell {
  rowIndex: number;         // 0부터 시작
  colIndex: number;         // 0부터 시작
  colspan: number;          // 기본값: 1
  rowspan: number;          // 기본값: 1
  content: string;          // 셀 내용
}

// 테이블 구조
export interface TableStructure {
  rows: number;             // 총 행 수
  cols: number;             // 총 열 수
  cells: TableCell[];       // 셀 배열 (병합된 셀 고려)
}

// Validation 헬퍼
export function isValidBox(box: Partial<Box>): box is Box {
  if (!box.id || typeof box.x !== 'number' || typeof box.y !== 'number') {
    return false;
  }

  // Layout 타입 검증
  if (box.layout && !['simple', 'flex', 'table'].includes(box.layout)) {
    return false;
  }

  // Table 레이아웃은 tableStructure 필수
  if (box.layout === 'table' && !box.tableStructure) {
    return false;
  }

  return true;
}

// 기본값 생성 헬퍼
export function createDefaultBox(): Box {
  return {
    id: crypto.randomUUID(),
    x: 0,
    y: 0,
    width: 6,
    height: 200,
    content: '',
    layout: 'simple',
  };
}

export function createDefaultChildElement(type: ChildElementType, order: number): ChildElement {
  return {
    id: crypto.randomUUID(),
    type,
    content: '',
    order,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
  };
}

export function createDefaultTableStructure(rows: number, cols: number): TableStructure {
  const cells: TableCell[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        rowIndex: r,
        colIndex: c,
        colspan: 1,
        rowspan: 1,
        content: '',
      });
    }
  }

  return { rows, cols, cells };
}
```

---

### 2. `lib/store.ts` 마이그레이션 로직

**Zustand 스토어 업데이트**:

```typescript
// lib/store.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Box } from '@/types';

interface BoxState {
  boxes: Box[];
  addBox: (box: Box) => void;
  updateBox: (id: string, updates: Partial<Box>) => void;
  deleteBox: (id: string) => void;
  clearBoxes: () => void;
}

// 마이그레이션 함수
function migrateBoxData(boxes: Box[]): Box[] {
  return boxes.map((box) => {
    // layout 필드가 없으면 'simple'로 설정
    if (!box.layout) {
      return { ...box, layout: 'simple' };
    }

    // 이미 마이그레이션된 데이터
    return box;
  });
}

export const useBoxStore = create<BoxState>()(
  devtools(
    persist(
      (set) => ({
        boxes: [],

        addBox: (box) => set((state) => ({
          boxes: [...state.boxes, box]
        })),

        updateBox: (id, updates) => set((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === id ? { ...box, ...updates } : box
          ),
        })),

        deleteBox: (id) => set((state) => ({
          boxes: state.boxes.filter((box) => box.id !== id),
        })),

        clearBoxes: () => set({ boxes: [] }),
      }),
      {
        name: 'box-storage',
        version: 2, // 버전 증가
        migrate: (persistedState: any, version: number) => {
          if (version === 1) {
            // v1 → v2 마이그레이션
            return {
              ...persistedState,
              boxes: migrateBoxData(persistedState.boxes || []),
            };
          }
          return persistedState;
        },
      }
    )
  )
);
```

---

### 3. 테스트 코드 작성

**`tests/unit/types.test.ts`**:

```typescript
import { describe, it, expect } from 'vitest';
import {
  isValidBox,
  createDefaultBox,
  createDefaultChildElement,
  createDefaultTableStructure,
} from '@/types';

describe('Data Model Validation', () => {
  it('should validate simple box', () => {
    const box = createDefaultBox();
    expect(isValidBox(box)).toBe(true);
  });

  it('should reject invalid layout type', () => {
    const box = { ...createDefaultBox(), layout: 'invalid' as any };
    expect(isValidBox(box)).toBe(false);
  });

  it('should require tableStructure for table layout', () => {
    const box = { ...createDefaultBox(), layout: 'table' };
    expect(isValidBox(box)).toBe(false);

    box.tableStructure = createDefaultTableStructure(3, 3);
    expect(isValidBox(box)).toBe(true);
  });

  it('should create default child element with correct properties', () => {
    const child = createDefaultChildElement('button', 0);

    expect(child.type).toBe('button');
    expect(child.order).toBe(0);
    expect(child.flexGrow).toBe(0);
    expect(child.id).toBeTruthy();
  });

  it('should create 3x3 table structure with 9 cells', () => {
    const table = createDefaultTableStructure(3, 3);

    expect(table.rows).toBe(3);
    expect(table.cols).toBe(3);
    expect(table.cells).toHaveLength(9);

    const firstCell = table.cells[0];
    expect(firstCell.rowIndex).toBe(0);
    expect(firstCell.colIndex).toBe(0);
    expect(firstCell.colspan).toBe(1);
  });
});
```

---

## 검증 기준

### 기능 검증
- ✅ 새로운 타입 정의가 TypeScript 컴파일 에러 없이 빌드됨
- ✅ `isValidBox()` 함수가 모든 케이스를 올바르게 검증
- ✅ 기본값 생성 헬퍼 함수들이 올바른 객체 반환
- ✅ 마이그레이션 로직이 기존 데이터를 정상 변환

### 하위 호환성 검증
- ✅ 기존 프로젝트 로드 시 에러 없음
- ✅ `layout` 없는 Box는 자동으로 `'simple'`로 마이그레이션
- ✅ 기존 Box 편집/삭제 기능 정상 작동
- ✅ LocalStorage 데이터 마이그레이션 성공

### 테스트 검증
- ✅ 모든 단위 테스트 통과
- ✅ 테스트 커버리지 90% 이상

---

## 다음 단계

Phase 0 완료 후:
1. **Phase 1 시작**: Flex 레이아웃 에디터 개발
2. **병렬 작업 시작**: Session B/C가 ChildElement, DraggableItem 작업 시작
3. **문서 업데이트**: 확장된 타입 시스템 사용법 가이드

---

## 참고 자료

- TypeScript Handbook - Type Guards: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
- Zustand Persist Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
- React DnD Type System: https://react-dnd.github.io/react-dnd/docs/api/use-drag

---

**생성일**: 2025-10-26
**담당자**: Session A (Master)
**상태**: ⏳ 작업 대기
