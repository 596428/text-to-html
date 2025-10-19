'use client';

import { useState } from 'react';
import { Rnd } from 'react-rnd';
import { useStore } from '@/lib/store';
import { Box } from '@/types';
import { GRID_UNIT, GRID_SNAP_Y, MIN_BOX_WIDTH, MIN_BOX_HEIGHT, PLACEHOLDERS } from '@/lib/constants';
import PopupEditor from './PopupEditor';

interface GridBoxProps {
  box: Box;
}

export default function GridBox({ box }: GridBoxProps) {
  const updateBox = useStore((state) => state.updateBox);
  const removeBox = useStore((state) => state.removeBox);
  const selectBox = useStore((state) => state.selectBox);
  const selectedBoxId = useStore((state) => state.selectedBoxId);
  const setBoxPopup = useStore((state) => state.setBoxPopup);

  const [isPopupEditorOpen, setIsPopupEditorOpen] = useState(false);

  const isSelected = selectedBoxId === box.id;

  return (
    <Rnd
      position={{ x: box.x * GRID_UNIT, y: box.y }}
      size={{ width: box.width * GRID_UNIT, height: box.height }}
      onDragStop={(e, d) => {
        updateBox(box.id, {
          x: Math.round(d.x / GRID_UNIT),
          y: d.y
        });
      }}
      onResizeStop={(e, dir, ref, delta, position) => {
        updateBox(box.id, {
          width: Math.max(MIN_BOX_WIDTH, Math.round(parseInt(ref.style.width) / GRID_UNIT)),
          height: parseInt(ref.style.height),
          x: Math.round(position.x / GRID_UNIT),
          y: position.y
        });
      }}
      grid={[GRID_UNIT, GRID_SNAP_Y]}
      bounds="parent"
      minWidth={GRID_UNIT}
      minHeight={MIN_BOX_HEIGHT}
      className={`
        border-2 rounded-lg shadow-lg transition-all
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-300'}
      `}
      onClick={() => selectBox(box.id)}
    >
      <div className="h-full flex flex-col p-3 bg-white">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-2 pb-2 border-b">
          <span className="text-xs font-medium text-gray-500">
            너비: {box.width}칸
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBox(box.id);
            }}
            className="text-red-500 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* 텍스트 입력 */}
        <textarea
          value={box.content}
          onChange={(e) => updateBox(box.id, { content: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder={PLACEHOLDERS.BOX_CONTENT}
          className="flex-1 w-full p-2 border border-gray-200 rounded resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />

        {/* 팝업 설정 UI */}
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`popup-${box.id}`}
              checked={box.hasPopup || false}
              onChange={(e) => {
                e.stopPropagation();
                updateBox(box.id, { hasPopup: e.target.checked });
              }}
              className="w-4 h-4 cursor-pointer"
            />
            <label htmlFor={`popup-${box.id}`} className="text-xs text-gray-700 cursor-pointer">
              팝업 사용
            </label>
          </div>

          {box.hasPopup && (
            <div className="space-y-2">
              <input
                type="text"
                value={box.popupTriggerText || ''}
                onChange={(e) => {
                  e.stopPropagation();
                  updateBox(box.id, { popupTriggerText: e.target.value });
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="버튼 텍스트 (예: 상세보기)"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPopupEditorOpen(true);
                }}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded transition-colors"
              >
                {box.popupContent ? '팝업 내용 수정' : '팝업 내용 편집'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 팝업 에디터 모달 */}
      {isPopupEditorOpen && (
        <PopupEditor
          boxId={box.id}
          popupContent={box.popupContent || ''}
          onSave={(content) => {
            setBoxPopup(box.id, content);
            setIsPopupEditorOpen(false);
          }}
          onClose={() => setIsPopupEditorOpen(false)}
        />
      )}
    </Rnd>
  );
}
