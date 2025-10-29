'use client';

import { useState } from 'react';
import type { Box, TableStructure, TableCell } from '@/types';

interface TableLayoutEditorProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

export function TableLayoutEditor({ box, onUpdate }: TableLayoutEditorProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{row: number, col: number} | null>(null);

  // 초기 테이블 구조 생성
  const initializeTable = (rows: number, cols: number): TableStructure => {
    const cells: TableCell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: TableCell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          content: '',
          rowSpan: 1,
          colSpan: 1,
          isHeader: r === 0 // 첫 행은 헤더로 설정
        });
      }
      cells.push(row);
    }
    return { rows, cols, cells, hasHeader: true };
  };

  const tableStructure = box.tableStructure || initializeTable(3, 3);

  // 테이블 크기 변경
  const resizeTable = (rows: number, cols: number) => {
    const newTable = initializeTable(Math.max(1, rows), Math.max(1, cols));

    // 기존 데이터 복사
    for (let r = 0; r < Math.min(tableStructure.rows, rows); r++) {
      for (let c = 0; c < Math.min(tableStructure.cols, cols); c++) {
        if (tableStructure.cells[r] && tableStructure.cells[r][c]) {
          newTable.cells[r][c] = { ...tableStructure.cells[r][c] };
        }
      }
    }

    onUpdate({ tableStructure: newTable });
  };

  // 셀 내용 업데이트
  const updateCell = (rowIndex: number, colIndex: number, updates: Partial<TableCell>) => {
    const newCells = tableStructure.cells.map((row, r) =>
      row.map((cell, c) => {
        if (r === rowIndex && c === colIndex) {
          return { ...cell, ...updates };
        }
        return cell;
      })
    );

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cells: newCells
      }
    });
  };

  // 셀 선택/해제
  const toggleCellSelection = (rowIndex: number, colIndex: number) => {
    const cellId = `${rowIndex}-${colIndex}`;
    const newSelected = new Set(selectedCells);

    if (newSelected.has(cellId)) {
      newSelected.delete(cellId);
    } else {
      newSelected.add(cellId);
    }

    setSelectedCells(newSelected);
  };

  // 드래그 시작
  const handleDragStart = (rowIndex: number, colIndex: number) => {
    setIsDragging(true);
    setDragStart({ row: rowIndex, col: colIndex });
    setSelectedCells(new Set([`${rowIndex}-${colIndex}`]));
  };

  // 드래그 중
  const handleDragOver = (rowIndex: number, colIndex: number) => {
    if (!isDragging || !dragStart) return;

    // 드래그 영역 계산
    const minRow = Math.min(dragStart.row, rowIndex);
    const maxRow = Math.max(dragStart.row, rowIndex);
    const minCol = Math.min(dragStart.col, colIndex);
    const maxCol = Math.max(dragStart.col, colIndex);

    // 선택 영역의 모든 셀 추가
    const newSelected = new Set<string>();
    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        // 병합으로 숨겨진 셀은 제외
        if (tableStructure.cells[r] && tableStructure.cells[r][c] && tableStructure.cells[r][c].content !== undefined) {
          newSelected.add(`${r}-${c}`);
        }
      }
    }

    setSelectedCells(newSelected);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 선택된 셀 병합
  const mergeCells = () => {
    if (selectedCells.size < 2) return;

    const cellPositions = Array.from(selectedCells).map(id => {
      const [r, c] = id.split('-').map(Number);
      return { row: r, col: c };
    });

    // 병합 영역 계산
    const minRow = Math.min(...cellPositions.map(p => p.row));
    const maxRow = Math.max(...cellPositions.map(p => p.row));
    const minCol = Math.min(...cellPositions.map(p => p.col));
    const maxCol = Math.max(...cellPositions.map(p => p.col));

    const rowSpan = maxRow - minRow + 1;
    const colSpan = maxCol - minCol + 1;

    // 병합된 셀의 내용 결합
    let mergedContent = '';
    cellPositions.forEach(({ row, col }) => {
      const content = tableStructure.cells[row][col].content;
      if (content) {
        mergedContent += (mergedContent ? ' ' : '') + content;
      }
    });

    const newCells = tableStructure.cells.map((row, r) =>
      row.map((cell, c) => {
        // 병합의 시작 셀
        if (r === minRow && c === minCol) {
          return {
            ...cell,
            rowSpan,
            colSpan,
            content: mergedContent
          };
        }
        // 병합에 포함되는 다른 셀들은 숨김 처리 (content를 undefined로)
        if (r >= minRow && r <= maxRow && c >= minCol && c <= maxCol) {
          return {
            ...cell,
            content: undefined as any // 병합된 셀은 렌더링 안함
          };
        }
        return cell;
      })
    );

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cells: newCells
      }
    });

    setSelectedCells(new Set());
  };

  // 셀 병합 해제
  const unmergeCells = () => {
    if (selectedCells.size !== 1) return;

    const [cellId] = Array.from(selectedCells);
    const [rowIndex, colIndex] = cellId.split('-').map(Number);
    const cell = tableStructure.cells[rowIndex][colIndex];

    if (cell.rowSpan === 1 && cell.colSpan === 1) return;

    const newCells = tableStructure.cells.map((row, r) =>
      row.map((c, col) => {
        // 병합 해제할 셀
        if (r === rowIndex && col === colIndex) {
          return {
            ...c,
            rowSpan: 1,
            colSpan: 1
          };
        }
        // 병합으로 숨겨진 셀들 복원
        if (
          r >= rowIndex &&
          r < rowIndex + (cell.rowSpan || 1) &&
          col >= colIndex &&
          col < colIndex + (cell.colSpan || 1)
        ) {
          return {
            ...c,
            content: c.content === undefined ? '' : c.content,
            rowSpan: 1,
            colSpan: 1
          };
        }
        return c;
      })
    );

    onUpdate({
      tableStructure: {
        ...tableStructure,
        cells: newCells
      }
    });

    setSelectedCells(new Set());
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* 테이블 크기 설정 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">행:</label>
          <input
            type="number"
            value={tableStructure.rows}
            onChange={(e) => resizeTable(parseInt(e.target.value) || 1, tableStructure.cols)}
            className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="20"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">열:</label>
          <input
            type="number"
            value={tableStructure.cols}
            onChange={(e) => resizeTable(tableStructure.rows, parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="20"
          />
        </div>
      </div>

      {/* 헤더 행 토글 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hasHeader"
          checked={tableStructure.hasHeader || false}
          onChange={(e) => {
            const hasHeader = e.target.checked;
            const newCells = tableStructure.cells.map((row, r) =>
              row.map(cell => ({
                ...cell,
                isHeader: r === 0 && hasHeader
              }))
            );
            onUpdate({
              tableStructure: {
                ...tableStructure,
                hasHeader,
                cells: newCells
              }
            });
          }}
          className="w-4 h-4"
        />
        <label htmlFor="hasHeader" className="text-sm font-medium text-gray-700">
          첫 행을 헤더로 사용
        </label>
      </div>

      {/* 추가 설명 입력 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          추가 설명 (선택사항)
        </label>
        <textarea
          value={box.tableDescription || ''}
          onChange={(e) => onUpdate({ tableDescription: e.target.value })}
          placeholder="예: 입력값이 있는 셀은 연한 하늘색, 빈 셀은 텍스트 박스로 채워주세요"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-500">
          💡 팁: 테이블 스타일, 색상, 입력 필드 등 추가 요청사항을 작성하세요
        </p>
      </div>

      {/* 병합 컨트롤 */}
      <div className="flex gap-2">
        <button
          onClick={mergeCells}
          disabled={selectedCells.size < 2}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          셀 병합 ({selectedCells.size}개 선택)
        </button>
        <button
          onClick={unmergeCells}
          disabled={selectedCells.size !== 1}
          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-md hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          병합 해제
        </button>
        <button
          onClick={() => setSelectedCells(new Set())}
          disabled={selectedCells.size === 0}
          className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          선택 해제
        </button>
      </div>

      {/* 테이블 미리보기 및 편집 */}
      <div className="overflow-auto max-h-96 border rounded-md bg-white">
        <table className="w-full border-collapse">
          <tbody>
            {tableStructure.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  // 병합으로 숨겨진 셀은 렌더링 안함
                  if (cell.content === undefined) return null;

                  const cellId = `${rowIndex}-${colIndex}`;
                  const isSelected = selectedCells.has(cellId);

                  return (
                    <td
                      key={colIndex}
                      rowSpan={cell.rowSpan || 1}
                      colSpan={cell.colSpan || 1}
                      className={`border border-gray-300 p-2 ${
                        isSelected ? 'bg-blue-100' : cell.isHeader ? 'bg-gray-100' : 'bg-white'
                      } cursor-pointer hover:bg-gray-50 select-none`}
                      onClick={() => toggleCellSelection(rowIndex, colIndex)}
                      onMouseDown={() => handleDragStart(rowIndex, colIndex)}
                      onMouseEnter={() => handleDragOver(rowIndex, colIndex)}
                      onMouseUp={handleDragEnd}
                    >
                      <textarea
                        value={cell.content || ''}
                        onChange={(e) => updateCell(rowIndex, colIndex, { content: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseMove={(e) => e.stopPropagation()}
                        placeholder={`셀 (${rowIndex + 1}, ${colIndex + 1})`}
                        className="w-full min-h-[60px] p-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded resize-none"
                      />
                      {(cell.rowSpan && cell.rowSpan > 1) || (cell.colSpan && cell.colSpan > 1) ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {cell.rowSpan && cell.rowSpan > 1 && `행병합: ${cell.rowSpan}`}
                          {cell.colSpan && cell.colSpan > 1 && ` 열병합: ${cell.colSpan}`}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        💡 팁: 셀을 드래그하여 여러 셀을 한번에 선택하거나, 클릭으로 개별 선택할 수 있습니다. 선택 후 병합 버튼을 클릭하세요.
      </p>
    </div>
  );
}
