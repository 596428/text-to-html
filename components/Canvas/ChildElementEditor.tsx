'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { ChildElement } from '@/types';

interface ChildElementEditorProps {
  child: ChildElement;
  index: number;
  onUpdate: (updates: Partial<ChildElement>) => void;
  onDelete: () => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

export function ChildElementEditor({
  child,
  index,
  onUpdate,
  onDelete,
  onMove
}: ChildElementEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 드래그 설정
  const [{ isDragging }, drag] = useDrag({
    type: 'CHILD_ELEMENT',
    item: () => ({ id: child.id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  // 드롭 설정
  const [, drop] = useDrop<DragItem>({
    accept: 'CHILD_ELEMENT',
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    }
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`border rounded-lg p-3 bg-white ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ cursor: 'move' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            #{index + 1}
          </span>
          <span className="text-xs text-gray-500">
            드래그하여 순서 변경
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          삭제
        </button>
      </div>

      <div className="space-y-3">
        {/* 내용 설명 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            내용 설명
          </label>
          <textarea
            value={child.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="이 요소의 내용을 설명하세요 (예: 제목, 본문 텍스트, 이미지 등)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {/* Flex 속성 */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              확장 비율
            </label>
            <input
              type="number"
              value={child.flexGrow ?? 1}
              onChange={(e) => onUpdate({ flexGrow: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              title="Flex Grow: 남은 공간을 차지하는 비율"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              축소 비율
            </label>
            <input
              type="number"
              value={child.flexShrink ?? 1}
              onChange={(e) => onUpdate({ flexShrink: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              title="Flex Shrink: 공간이 부족할 때 축소되는 비율"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              기본 크기
            </label>
            <input
              type="text"
              value={child.flexBasis ?? 'auto'}
              onChange={(e) => onUpdate({ flexBasis: e.target.value })}
              placeholder="auto, 100px, 50%"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Flex Basis: 요소의 기본 크기"
            />
          </div>
        </div>

        {/* Order */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            표시 순서
          </label>
          <input
            type="number"
            value={child.order ?? index}
            onChange={(e) => onUpdate({ order: parseInt(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Order: 작은 숫자가 먼저 표시됩니다"
          />
          <p className="text-xs text-gray-500 mt-1">
            작은 숫자가 먼저 표시됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
