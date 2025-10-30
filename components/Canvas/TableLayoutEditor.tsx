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
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  // Fill handle states
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillStart, setFillStart] = useState<{row: number, col: number} | null>(null);
  const [fillDirection, setFillDirection] = useState<'row' | 'col' | null>(null);
  const [fillRange, setFillRange] = useState<Set<string>>(new Set());

  // Copy-paste states
  const [copiedData, setCopiedData] = useState<{row: number, col: number, content: string}[] | null>(null);

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

  // Fill handle functions
  const isNaturalNumber = (value: string): boolean => {
    const num = parseInt(value);
    return !isNaN(num) && Number.isInteger(num) && num >= 0 && value === num.toString();
  };

  const handleFillStart = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFillDragging(true);
    setFillStart({ row: rowIndex, col: colIndex });
    setFillDirection(null);
    setFillRange(new Set([`${rowIndex}-${colIndex}`]));
  };

  const handleFillOver = (rowIndex: number, colIndex: number) => {
    if (!isFillDragging || !fillStart) return;

    // 첫 움직임으로 방향 결정
    if (!fillDirection) {
      const rowDiff = Math.abs(rowIndex - fillStart.row);
      const colDiff = Math.abs(colIndex - fillStart.col);

      if (rowDiff === 0 && colDiff === 0) return;

      setFillDirection(colDiff > rowDiff ? 'row' : 'col');
    }

    // 방향에 따라 범위 계산
    const newRange = new Set<string>();
    if (fillDirection === 'row') {
      const minCol = Math.min(fillStart.col, colIndex);
      const maxCol = Math.max(fillStart.col, colIndex);
      for (let c = minCol; c <= maxCol; c++) {
        newRange.add(`${fillStart.row}-${c}`);
      }
    } else if (fillDirection === 'col') {
      const minRow = Math.min(fillStart.row, rowIndex);
      const maxRow = Math.max(fillStart.row, rowIndex);
      for (let r = minRow; r <= maxRow; r++) {
        newRange.add(`${r}-${fillStart.col}`);
      }
    }

    setFillRange(newRange);
  };

  const handleFillEnd = () => {
    if (!isFillDragging || !fillStart || fillRange.size <= 1) {
      setIsFillDragging(false);
      setFillStart(null);
      setFillDirection(null);
      setFillRange(new Set());
      return;
    }

    const cells = Array.from(fillRange)
      .map(id => {
        const [r, c] = id.split('-').map(Number);
        return { row: r, col: c, content: tableStructure.cells[r][c].content };
      })
      .sort((a, b) => {
        if (fillDirection === 'row') return a.col - b.col;
        return a.row - b.row;
      });

    // 단순 복사 (1개 셀)
    if (selectedCells.size === 1) {
      const sourceContent = cells[0].content || '';

      // 자연수 체크
      if (!isNaturalNumber(sourceContent)) {
        alert('빈칸 채우기는 자연수(0 포함)만 가능합니다.');
        setIsFillDragging(false);
        setFillStart(null);
        setFillDirection(null);
        setFillRange(new Set());
        return;
      }

      // 복사 실행
      const newCells = tableStructure.cells.map((row, r) =>
        row.map((cell, c) => {
          if (fillRange.has(`${r}-${c}`) && !(r === cells[0].row && c === cells[0].col)) {
            return { ...cell, content: sourceContent };
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
    }
    // 패턴 채우기 (2개 셀)
    else if (selectedCells.size === 2) {
      const selectedArray = Array.from(selectedCells).map(id => {
        const [r, c] = id.split('-').map(Number);
        return { row: r, col: c };
      }).sort((a, b) => {
        // 같은 행이면 col로, 같은 열이면 row로 정렬
        if (a.row === b.row) return a.col - b.col;
        return a.row - b.row;
      });

      // 같은 행 또는 열인지 확인
      const sameRow = selectedArray[0].row === selectedArray[1].row;
      const sameCol = selectedArray[0].col === selectedArray[1].col;

      if (!sameRow && !sameCol) {
        alert('패턴 채우기는 같은 행 또는 열의 셀만 가능합니다.');
        setIsFillDragging(false);
        setFillStart(null);
        setFillDirection(null);
        setFillRange(new Set());
        return;
      }

      const val1 = tableStructure.cells[selectedArray[0].row][selectedArray[0].col].content || '';
      const val2 = tableStructure.cells[selectedArray[1].row][selectedArray[1].col].content || '';

      // 자연수 체크
      if (!isNaturalNumber(val1) || !isNaturalNumber(val2)) {
        alert('패턴 채우기는 두 셀 모두 자연수(0 포함)여야 합니다.');
        setIsFillDragging(false);
        setFillStart(null);
        setFillDirection(null);
        setFillRange(new Set());
        return;
      }

      const num1 = parseInt(val1);
      const num2 = parseInt(val2);
      const diff = num2 - num1;

      // 등차수열로 채우기
      const newCells = tableStructure.cells.map(row => [...row]);

      // fillRange에서 선택된 2개 셀을 제외한 나머지 셀들만 채우기
      const selectedSet = new Set(Array.from(selectedCells));
      const fillTargets = cells.filter(cell => !selectedSet.has(`${cell.row}-${cell.col}`));

      let currentValue = num2;
      fillTargets.forEach(cell => {
        currentValue += diff;
        if (currentValue >= 0) { // 자연수 범위 유지
          newCells[cell.row][cell.col] = {
            ...newCells[cell.row][cell.col],
            content: currentValue.toString()
          };
        }
      });

      onUpdate({
        tableStructure: {
          ...tableStructure,
          cells: newCells
        }
      });
    }

    setIsFillDragging(false);
    setFillStart(null);
    setFillDirection(null);
    setFillRange(new Set());
  };

  // Copy-paste functions
  const handleCopy = async () => {
    if (selectedCells.size === 0) return;

    const cellsData = Array.from(selectedCells).map(cellId => {
      const [row, col] = cellId.split('-').map(Number);
      return {
        row,
        col,
        content: tableStructure.cells[row][col].content || ''
      };
    });

    setCopiedData(cellsData);

    // 시스템 클립보드에도 복사 (탭/개행 형식)
    try {
      // 셀들을 행/열 순서대로 정렬
      const minRow = Math.min(...cellsData.map(c => c.row));
      const maxRow = Math.max(...cellsData.map(c => c.row));
      const minCol = Math.min(...cellsData.map(c => c.col));
      const maxCol = Math.max(...cellsData.map(c => c.col));

      // 2D 배열 생성
      const clipboardText: string[][] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const rowData: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          const cell = cellsData.find(cell => cell.row === r && cell.col === c);
          rowData.push(cell?.content || '');
        }
        clipboardText.push(rowData);
      }

      // 탭/개행 형식으로 변환
      const textToCopy = clipboardText.map(row => row.join('\t')).join('\n');
      await navigator.clipboard.writeText(textToCopy);

      console.log(`[Copy] ${cellsData.length} cells copied to clipboard`);
    } catch (err) {
      console.log(`[Copy] ${cellsData.length} cells copied (clipboard write failed, using internal storage)`);
    }
  };

  const handlePaste = async () => {
    // 시작점 찾기 (선택된 셀 중 가장 왼쪽 위)
    const selectedArray = Array.from(selectedCells);
    if (selectedArray.length === 0) {
      alert('붙여넣을 위치를 선택하세요.');
      return;
    }

    const startCells = selectedArray.map(id => {
      const [r, c] = id.split('-').map(Number);
      return { row: r, col: c };
    }).sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col);

    const startRow = startCells[0].row;
    const startCol = startCells[0].col;

    try {
      // 1. 클립보드에서 텍스트 읽기 (외부 복사 - Excel 등)
      const clipboardText = await navigator.clipboard.readText();

      if (clipboardText && clipboardText.trim()) {
        // 탭/개행으로 파싱
        const rows = clipboardText.split('\n')
          .filter(row => row.trim())
          .map(row => row.split('\t'));

        const newCells = tableStructure.cells.map(row => [...row]);
        let pastedCount = 0;

        rows.forEach((rowData, r) => {
          rowData.forEach((value, c) => {
            const targetRow = startRow + r;
            const targetCol = startCol + c;

            if (targetRow < tableStructure.rows && targetCol < tableStructure.cols) {
              newCells[targetRow][targetCol] = {
                ...newCells[targetRow][targetCol],
                content: value.trim()
              };
              pastedCount++;
            }
          });
        });

        if (pastedCount > 0) {
          onUpdate({
            tableStructure: {
              ...tableStructure,
              cells: newCells
            }
          });
          console.log(`[Paste from clipboard] ${pastedCount} cells pasted`);
          return;
        }
      }
    } catch (err) {
      // 클립보드 읽기 실패 시 내부 복사 데이터 사용
      console.log('[Paste] Using internal copied data');
    }

    // 2. 내부 복사 데이터 사용
    if (!copiedData || copiedData.length === 0) {
      alert('붙여넣을 데이터가 없습니다.');
      return;
    }

    // 복사된 셀들의 상대 위치 계산
    const minRow = Math.min(...copiedData.map(c => c.row));
    const minCol = Math.min(...copiedData.map(c => c.col));

    const newCells = tableStructure.cells.map(row => [...row]);
    let pastedCount = 0;

    copiedData.forEach(cell => {
      const offsetRow = cell.row - minRow;
      const offsetCol = cell.col - minCol;
      const targetRow = startRow + offsetRow;
      const targetCol = startCol + offsetCol;

      if (targetRow < tableStructure.rows && targetCol < tableStructure.cols) {
        newCells[targetRow][targetCol] = {
          ...newCells[targetRow][targetCol],
          content: cell.content
        };
        pastedCount++;
      }
    });

    if (pastedCount > 0) {
      onUpdate({
        tableStructure: {
          ...tableStructure,
          cells: newCells
        }
      });
      console.log(`[Paste internal] ${pastedCount} cells pasted`);
    }
  };

  const handleDelete = () => {
    if (selectedCells.size === 0) return;

    const newCells = tableStructure.cells.map((row, r) =>
      row.map((cell, c) => {
        const cellId = `${r}-${c}`;
        if (selectedCells.has(cellId)) {
          return { ...cell, content: '' };
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

    console.log(`[Delete] ${selectedCells.size} cells cleared`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Delete/Backspace: 선택된 셀들 내용 삭제
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 텍스트박스 포커스 상태가 아닐 때만 작동
      if (document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleDelete();
      }
      return;
    }

    // Ctrl+C, Ctrl+V
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleCopy();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handlePaste();
      }
    }
  };

  return (
    <div
      className="space-y-4 p-4 bg-gray-50 rounded-lg outline-none"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onClick={(e) => {
        // 텍스트박스가 아닌 영역 클릭 시에만 포커스
        if (!(e.target as HTMLElement).closest('textarea')) {
          (e.currentTarget as HTMLDivElement).focus();
        }
      }}
    >
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
      <div
        className="overflow-auto max-h-96 border rounded-md bg-white"
        onMouseUp={() => {
          handleDragEnd();
          handleFillEnd();
        }}
        onMouseLeave={() => {
          handleDragEnd();
          handleFillEnd();
        }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {tableStructure.cells.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  // 병합으로 숨겨진 셀은 렌더링 안함
                  if (cell.content === undefined) return null;

                  const cellId = `${rowIndex}-${colIndex}`;
                  const isSelected = selectedCells.has(cellId);

                  const isFillTarget = fillRange.has(cellId);

                  return (
                    <td
                      key={colIndex}
                      rowSpan={cell.rowSpan || 1}
                      colSpan={cell.colSpan || 1}
                      className={`relative border border-gray-300 p-2 h-[76px] ${
                        isFillTarget ? 'bg-blue-200' : isSelected ? 'bg-blue-100' : cell.isHeader ? 'bg-gray-100 hover:bg-gray-50' : 'bg-white hover:bg-gray-50'
                      } cursor-pointer select-none align-top`}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          e.stopPropagation();
                          toggleCellSelection(rowIndex, colIndex);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Ctrl+클릭은 드래그 시작하지 않음
                        if (!e.ctrlKey && !e.metaKey) {
                          handleDragStart(rowIndex, colIndex);
                        }
                      }}
                      onMouseOver={() => {
                        handleDragOver(rowIndex, colIndex);
                        handleFillOver(rowIndex, colIndex);
                      }}
                    >
                      <textarea
                        value={cell.content || ''}
                        onChange={(e) => updateCell(rowIndex, colIndex, { content: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseMove={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onFocus={() => setFocusedCell(cellId)}
                        onBlur={() => setFocusedCell(null)}
                        placeholder={`셀 (${rowIndex + 1}, ${colIndex + 1})`}
                        style={{
                          height: focusedCell === cellId ? '90%' : '50%'
                        }}
                        className="w-full p-1 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded resize-none transition-all"
                      />
                      {(cell.rowSpan && cell.rowSpan > 1) || (cell.colSpan && cell.colSpan > 1) ? (
                        <div className="text-xs text-gray-500 mt-1">
                          {cell.rowSpan && cell.rowSpan > 1 && `행병합: ${cell.rowSpan}`}
                          {cell.colSpan && cell.colSpan > 1 && ` 열병합: ${cell.colSpan}`}
                        </div>
                      ) : null}

                      {/* Fill handle - Excel style */}
                      {isSelected && (
                        <div
                          className="absolute bottom-0 right-0 w-[6px] h-[6px] bg-blue-600 cursor-crosshair hover:bg-blue-700"
                          style={{ transform: 'translate(50%, 50%)' }}
                          onMouseDown={(e) => handleFillStart(rowIndex, colIndex, e)}
                          onMouseUp={handleFillEnd}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        💡 팁: 드래그로 영역 선택 | Ctrl+클릭으로 개별 셀 선택/해제 | 선택 후 병합 버튼 클릭 | 우하단 파란 사각형 드래그로 빈칸 채우기 (Excel 스타일) | Ctrl+C/V로 복사-붙여넣기 (Excel 호환) | Delete로 선택 셀 내용 삭제
      </p>
    </div>
  );
}
