# Phase 2: Table Builder

**목표**: 시각적 인터페이스로 병합 셀 테이블 생성
**예상 기간**: 4일 (병렬 작업)
**브랜치 전략**: `feature/phase-2-table-builder` (통합), 2개 하위 브랜치
**병렬 세션**: 2개 (Session A, B)

---

## 병렬 작업 분할

```
Phase 2 (4일) → 병렬 2개 세션
├─ Group 2A (Session A): TableBuilder.tsx - 2일
└─ Group 2B (Session B): TableCellMerger.tsx - 2일
+ 통합 및 테스트: 2일
```

---

## Group 2A: TableBuilder.tsx

**담당**: Session A
**브랜치**: `feature/phase-2a-table-ui`
**기간**: 2일

### 작업 내용

**컴포넌트 구조**:

```typescript
// components/Canvas/TableBuilder.tsx

import { useState } from 'react';
import type { Box, TableStructure, TableCell } from '@/types';
import { TableCellMerger } from '@/components/shared/TableCellMerger';

interface TableBuilderProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

export function TableBuilder({ box, onUpdate }: TableBuilderProps) {
  const tableStructure = box.tableStructure || { rows: 3, cols: 3, cells: [] };
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  // 셀 ID 생성 (rowIndex-colIndex)
  const getCellId = (row: number, col: number) => `${row}-${col}`;

  // 행/열 추가
  const addRow = () => {
    const newRows = tableStructure.rows + 1;
    const newCells = [...tableStructure.cells];

    // 새 행의 셀 추가
    for (let c = 0; c < tableStructure.cols; c++) {
      newCells.push({
        rowIndex: newRows - 1,
        colIndex: c,
        colspan: 1,
        rowspan: 1,
        content: '',
      });
    }

    onUpdate({
      tableStructure: {
        ...tableStructure,
        rows: newRows,
        cells: newCells,
      },
    });
  };

  const addColumn = () => {
    const newCols = tableStructure.cols + 1;
    const newCells = [...tableStructure.cells];

    // 각 행에 새 열 추가
    for (let r = 0; r < tableStructure.rows; r++) {
      newCells.push({
        rowIndex: r,
        colIndex: newCols - 1,
        colspan: 1,
        rowspan: 1,
        content: '',
      });
    }

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cols: newCols,
        cells: newCells,
      },
    });
  };

  // 행/열 삭제
  const deleteRow = (rowIndex: number) => {
    if (tableStructure.rows <= 1) {
      alert('최소 1개 행이 필요합니다.');
      return;
    }

    const newCells = tableStructure.cells
      .filter((cell) => cell.rowIndex !== rowIndex)
      .map((cell) => ({
        ...cell,
        rowIndex: cell.rowIndex > rowIndex ? cell.rowIndex - 1 : cell.rowIndex,
      }));

    onUpdate({
      tableStructure: {
        ...tableStructure,
        rows: tableStructure.rows - 1,
        cells: newCells,
      },
    });
  };

  const deleteColumn = (colIndex: number) => {
    if (tableStructure.cols <= 1) {
      alert('최소 1개 열이 필요합니다.');
      return;
    }

    const newCells = tableStructure.cells
      .filter((cell) => cell.colIndex !== colIndex)
      .map((cell) => ({
        ...cell,
        colIndex: cell.colIndex > colIndex ? cell.colIndex - 1 : cell.colIndex,
      }));

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cols: tableStructure.cols - 1,
        cells: newCells,
      },
    });
  };

  // 셀 선택/해제
  const toggleCellSelection = (row: number, col: number) => {
    const cellId = getCellId(row, col);
    const newSelection = new Set(selectedCells);

    if (newSelection.has(cellId)) {
      newSelection.delete(cellId);
    } else {
      newSelection.add(cellId);
    }

    setSelectedCells(newSelection);
  };

  // 셀 병합
  const mergeCells = () => {
    if (selectedCells.size < 2) {
      alert('최소 2개 셀을 선택해야 합니다.');
      return;
    }

    const selectedArray = Array.from(selectedCells).map((id) => {
      const [row, col] = id.split('-').map(Number);
      return { row, col };
    });

    const mergedStructure = TableCellMerger.merge(tableStructure, selectedArray);

    if (mergedStructure) {
      onUpdate({ tableStructure: mergedStructure });
      setSelectedCells(new Set());
    } else {
      alert('병합할 수 없는 셀입니다. (인접하지 않거나 이미 병합됨)');
    }
  };

  // 셀 분할
  const splitCells = () => {
    if (selectedCells.size !== 1) {
      alert('1개 셀만 선택해야 합니다.');
      return;
    }

    const [row, col] = Array.from(selectedCells)[0].split('-').map(Number);
    const splitStructure = TableCellMerger.split(tableStructure, row, col);

    if (splitStructure) {
      onUpdate({ tableStructure: splitStructure });
      setSelectedCells(new Set());
    } else {
      alert('분할할 수 없습니다. (이미 기본 셀)');
    }
  };

  // 셀 내용 업데이트
  const updateCellContent = (row: number, col: number, content: string) => {
    const updatedCells = tableStructure.cells.map((cell) =>
      cell.rowIndex === row && cell.colIndex === col
        ? { ...cell, content }
        : cell
    );

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cells: updatedCells,
      },
    });
  };

  // 셀 렌더링 (병합 고려)
  const renderCell = (row: number, col: number) => {
    const cell = tableStructure.cells.find(
      (c) => c.rowIndex === row && c.colIndex === col
    );

    if (!cell) return null; // 병합된 셀

    const cellId = getCellId(row, col);
    const isSelected = selectedCells.has(cellId);

    return (
      <td
        key={cellId}
        rowSpan={cell.rowspan}
        colSpan={cell.colspan}
        className={`
          border p-2 cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-200' : 'hover:bg-gray-100'}
        `}
        onClick={() => toggleCellSelection(row, col)}
      >
        <input
          type="text"
          value={cell.content}
          onChange={(e) => updateCellContent(row, col, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          placeholder={`${row + 1},${col + 1}`}
          className="w-full bg-transparent border-none focus:outline-none text-sm"
        />
      </td>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 컨트롤 패널 */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={addRow} className="btn-sm bg-green-500 text-white">
          + 행 추가
        </button>
        <button onClick={addColumn} className="btn-sm bg-green-500 text-white">
          + 열 추가
        </button>
        <button
          onClick={mergeCells}
          disabled={selectedCells.size < 2}
          className="btn-sm bg-blue-500 text-white disabled:opacity-50"
        >
          병합
        </button>
        <button
          onClick={splitCells}
          disabled={selectedCells.size !== 1}
          className="btn-sm bg-orange-500 text-white disabled:opacity-50"
        >
          분할
        </button>
        <button
          onClick={() => setSelectedCells(new Set())}
          className="btn-sm bg-gray-500 text-white"
        >
          선택 해제
        </button>
      </div>

      {/* 테이블 */}
      <div className="overflow-auto border rounded">
        <table className="w-full border-collapse">
          <tbody>
            {Array.from({ length: tableStructure.rows }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: tableStructure.cols }, (_, col) =>
                  renderCell(row, col)
                )}
                <td className="border-l-2 p-1">
                  <button
                    onClick={() => deleteRow(row)}
                    className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: tableStructure.cols }, (_, col) => (
                <td key={col} className="border-t-2 p-1 text-center">
                  <button
                    onClick={() => deleteColumn(col)}
                    className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-xs"
                  >
                    ✕
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 정보 */}
      <div className="text-sm text-gray-600">
        {tableStructure.rows} × {tableStructure.cols} 테이블 |{' '}
        {selectedCells.size}개 셀 선택됨
      </div>

      {/* 미리보기 */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">HTML 미리보기</h4>
        <div className="bg-gray-50 p-4 rounded overflow-auto">
          <table className="border-collapse border">
            <tbody>
              {Array.from({ length: tableStructure.rows }, (_, row) => (
                <tr key={row}>
                  {Array.from({ length: tableStructure.cols }, (_, col) => {
                    const cell = tableStructure.cells.find(
                      (c) => c.rowIndex === row && c.colIndex === col
                    );
                    if (!cell) return null;
                    return (
                      <td
                        key={`${row}-${col}`}
                        rowSpan={cell.rowspan}
                        colSpan={cell.colspan}
                        className="border p-2"
                      >
                        {cell.content || `(${row + 1},${col + 1})`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**검증 기준**:
- ✅ 행/열 추가/삭제 정상 작동
- ✅ 셀 클릭으로 선택/해제
- ✅ 병합/분할 버튼 활성화 조건 정확
- ✅ 실시간 미리보기 업데이트

---

## Group 2B: TableCellMerger.tsx

**담당**: Session B
**브랜치**: `feature/phase-2b-cell-merger`
**기간**: 2일

### 작업 내용

**유틸리티 클래스**:

```typescript
// components/shared/TableCellMerger.tsx

import type { TableStructure, TableCell } from '@/types';

interface CellPosition {
  row: number;
  col: number;
}

export class TableCellMerger {
  /**
   * 셀 병합
   * @param structure 현재 테이블 구조
   * @param positions 병합할 셀 위치 배열
   * @returns 병합된 테이블 구조 (실패 시 null)
   */
  static merge(
    structure: TableStructure,
    positions: CellPosition[]
  ): TableStructure | null {
    // 검증: 최소 2개 셀
    if (positions.length < 2) {
      return null;
    }

    // 검증: 직사각형 영역인지 확인
    const rows = positions.map((p) => p.row);
    const cols = positions.map((p) => p.col);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    if (positions.length !== expectedCellCount) {
      return null; // 직사각형이 아님
    }

    // 검증: 모든 셀이 기본 상태 (이미 병합된 셀 포함 안 됨)
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = structure.cells.find(
          (cell) => cell.rowIndex === r && cell.colIndex === c
        );

        if (!cell || cell.colspan > 1 || cell.rowspan > 1) {
          return null; // 이미 병합된 셀 포함
        }
      }
    }

    // 병합 실행
    const newCells: TableCell[] = [];
    const mergedContent = positions
      .map((p) => {
        const cell = structure.cells.find(
          (c) => c.rowIndex === p.row && c.colIndex === p.col
        );
        return cell?.content || '';
      })
      .filter(Boolean)
      .join(' ');

    for (const cell of structure.cells) {
      const isInMergeArea =
        cell.rowIndex >= minRow &&
        cell.rowIndex <= maxRow &&
        cell.colIndex >= minCol &&
        cell.colIndex <= maxCol;

      if (!isInMergeArea) {
        // 병합 영역 밖의 셀은 그대로 유지
        newCells.push(cell);
      } else if (cell.rowIndex === minRow && cell.colIndex === minCol) {
        // 병합된 셀 (좌상단)
        newCells.push({
          rowIndex: minRow,
          colIndex: minCol,
          rowspan: maxRow - minRow + 1,
          colspan: maxCol - minCol + 1,
          content: mergedContent,
        });
      }
      // 나머지 셀은 제거됨 (병합됨)
    }

    return {
      ...structure,
      cells: newCells,
    };
  }

  /**
   * 셀 분할
   * @param structure 현재 테이블 구조
   * @param row 분할할 셀의 행 인덱스
   * @param col 분할할 셀의 열 인덱스
   * @returns 분할된 테이블 구조 (실패 시 null)
   */
  static split(
    structure: TableStructure,
    row: number,
    col: number
  ): TableStructure | null {
    const cell = structure.cells.find(
      (c) => c.rowIndex === row && c.colIndex === col
    );

    if (!cell || (cell.colspan === 1 && cell.rowspan === 1)) {
      return null; // 분할할 수 없음 (기본 셀)
    }

    const newCells = structure.cells.filter(
      (c) => !(c.rowIndex === row && c.colIndex === col)
    );

    // 분할된 셀들 생성
    for (let r = row; r < row + cell.rowspan; r++) {
      for (let c = col; c < col + cell.colspan; c++) {
        newCells.push({
          rowIndex: r,
          colIndex: c,
          rowspan: 1,
          colspan: 1,
          content: r === row && c === col ? cell.content : '', // 첫 셀만 내용 유지
        });
      }
    }

    return {
      ...structure,
      cells: newCells,
    };
  }

  /**
   * 테이블 구조 검증
   * @param structure 검증할 테이블 구조
   * @returns 유효 여부
   */
  static validate(structure: TableStructure): boolean {
    const { rows, cols, cells } = structure;

    // 기본 검증
    if (rows < 1 || cols < 1) return false;

    // 각 위치에 정확히 하나의 셀이 존재하는지 확인
    const grid: boolean[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(false)
    );

    for (const cell of cells) {
      const { rowIndex, colIndex, rowspan, colspan } = cell;

      // 범위 검증
      if (
        rowIndex < 0 ||
        colIndex < 0 ||
        rowIndex + rowspan > rows ||
        colIndex + colspan > cols
      ) {
        return false;
      }

      // 중복 검증
      for (let r = rowIndex; r < rowIndex + rowspan; r++) {
        for (let c = colIndex; c < colIndex + colspan; c++) {
          if (grid[r][c]) {
            return false; // 이미 다른 셀이 차지함
          }
          grid[r][c] = true;
        }
      }
    }

    // 모든 위치가 채워졌는지 확인
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c]) {
          return false; // 빈 위치 존재
        }
      }
    }

    return true;
  }
}
```

**테스트 코드**:

```typescript
// tests/unit/table-merger.test.ts

import { describe, it, expect } from 'vitest';
import { TableCellMerger } from '@/components/shared/TableCellMerger';
import type { TableStructure } from '@/types';

describe('TableCellMerger', () => {
  const create3x3Table = (): TableStructure => ({
    rows: 3,
    cols: 3,
    cells: [
      { rowIndex: 0, colIndex: 0, rowspan: 1, colspan: 1, content: 'A1' },
      { rowIndex: 0, colIndex: 1, rowspan: 1, colspan: 1, content: 'A2' },
      { rowIndex: 0, colIndex: 2, rowspan: 1, colspan: 1, content: 'A3' },
      { rowIndex: 1, colIndex: 0, rowspan: 1, colspan: 1, content: 'B1' },
      { rowIndex: 1, colIndex: 1, rowspan: 1, colspan: 1, content: 'B2' },
      { rowIndex: 1, colIndex: 2, rowspan: 1, colspan: 1, content: 'B3' },
      { rowIndex: 2, colIndex: 0, rowspan: 1, colspan: 1, content: 'C1' },
      { rowIndex: 2, colIndex: 1, rowspan: 1, colspan: 1, content: 'C2' },
      { rowIndex: 2, colIndex: 2, rowspan: 1, colspan: 1, content: 'C3' },
    ],
  });

  it('should merge 2x2 cells successfully', () => {
    const table = create3x3Table();
    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
    ]);

    expect(merged).not.toBeNull();
    expect(merged!.cells).toHaveLength(6); // 9 - 4 + 1 = 6

    const mergedCell = merged!.cells.find(
      (c) => c.rowIndex === 0 && c.colIndex === 0
    );
    expect(mergedCell?.rowspan).toBe(2);
    expect(mergedCell?.colspan).toBe(2);
  });

  it('should reject non-rectangular merge', () => {
    const table = create3x3Table();
    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      // { row: 1, col: 1 } 누락 → L자 모양
    ]);

    expect(merged).toBeNull();
  });

  it('should split merged cell', () => {
    const table = create3x3Table();
    const merged = TableCellMerger.merge(table, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ]);

    const split = TableCellMerger.split(merged!, 0, 0);

    expect(split).not.toBeNull();
    expect(split!.cells).toHaveLength(9); // 원래대로 복원
  });

  it('should validate correct table structure', () => {
    const table = create3x3Table();
    expect(TableCellMerger.validate(table)).toBe(true);
  });

  it('should reject invalid table with gaps', () => {
    const table = create3x3Table();
    table.cells = table.cells.slice(0, 8); // 마지막 셀 제거

    expect(TableCellMerger.validate(table)).toBe(false);
  });
});
```

**검증 기준**:
- ✅ 2x2 셀 병합 성공
- ✅ L자 모양 병합 거부
- ✅ 병합 후 분할 시 원래 구조 복원
- ✅ 모든 단위 테스트 통과

---

## 통합 테스트 (Day 3-4)

### Gemini 프롬프트 업데이트

```typescript
// lib/gemini.ts

function generatePrompt(boxes: Box[]): string {
  let prompt = `다음 Box 정보로 HTML을 생성하세요:\n\n`;

  boxes.forEach((box, idx) => {
    // ... 기존 코드 ...

    // === Table 레이아웃 처리 ===
    if (box.layout === 'table' && box.tableStructure) {
      const { rows, cols, cells } = box.tableStructure;
      prompt += `- 레이아웃: Table (${rows}행 × ${cols}열)\n`;
      prompt += `- 셀 정보:\n`;

      cells.forEach((cell, cellIdx) => {
        prompt += `  ${cellIdx + 1}. (${cell.rowIndex + 1},${cell.colIndex + 1})`;
        if (cell.rowspan > 1) prompt += ` rowspan=${cell.rowspan}`;
        if (cell.colspan > 1) prompt += ` colspan=${cell.colspan}`;
        prompt += `: ${cell.content}\n`;
      });

      prompt += `\n예시 HTML:\n`;
      prompt += `<table class="border-collapse border">\n`;
      prompt += `  <tbody>\n`;
      for (let r = 0; r < rows; r++) {
        prompt += `    <tr>\n`;
        for (let c = 0; c < cols; c++) {
          const cell = cells.find(
            (cell) => cell.rowIndex === r && cell.colIndex === c
          );
          if (cell) {
            prompt += `      <td`;
            if (cell.rowspan > 1) prompt += ` rowspan="${cell.rowspan}"`;
            if (cell.colspan > 1) prompt += ` colspan="${cell.colspan}"`;
            prompt += `>${cell.content}</td>\n`;
          }
        }
        prompt += `    </tr>\n`;
      }
      prompt += `  </tbody>\n`;
      prompt += `</table>\n`;
    }
  });

  return prompt;
}
```

### 통합 테스트 시나리오

**시나리오 1: 간단한 3x3 테이블**
```
Expected HTML:
<table class="border-collapse border">
  <tr>
    <td>A1</td><td>A2</td><td>A3</td>
  </tr>
  <tr>
    <td>B1</td><td>B2</td><td>B3</td>
  </tr>
</table>
```

**시나리오 2: 병합된 헤더 테이블**
```
Row 0: [헤더] (colspan=3)
Row 1: [데이터1] [데이터2] [데이터3]

Expected HTML:
<table>
  <tr>
    <td colspan="3">헤더</td>
  </tr>
  <tr>
    <td>데이터1</td><td>데이터2</td><td>데이터3</td>
  </tr>
</table>
```

### 검증 기준
- ✅ TableBuilder + TableCellMerger 통합 성공
- ✅ Gemini가 올바른 `<table>` HTML 생성
- ✅ 복잡한 병합 구조도 정확히 렌더링
- ✅ 기존 Flex, Simple 레이아웃 동작 유지

---

## 다음 단계

Phase 2 완료 후:
1. **Phase 3 시작**: UX 개선 (SizeController, BoxProperties 리팩토링)
2. **문서 업데이트**: Table Builder 사용 가이드

---

**생성일**: 2025-10-26
**담당자**: Session A, B
**상태**: ⏳ Phase 1 완료 대기
