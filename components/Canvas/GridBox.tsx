'use client';

import { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useStore } from '@/lib/store';
import { Box, LayoutType } from '@/types';
import { GRID_UNIT, GRID_SNAP_Y, MIN_BOX_WIDTH, MIN_BOX_HEIGHT, PLACEHOLDERS } from '@/lib/constants';
import PopupEditor from './PopupEditor';
import { FlexLayoutEditor } from './FlexLayoutEditor';
import { TableLayoutEditor } from './TableLayoutEditor';
import ComponentLibrary from './ComponentLibrary';

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
  const [tempWidth, setTempWidth] = useState(box.width);
  const [isComponentLibraryOpen, setIsComponentLibraryOpen] = useState(false);

  // box.width가 변경되면 tempWidth도 동기화
  useEffect(() => {
    setTempWidth(box.width);
  }, [box.width]);

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
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              {box.width}칸 × {box.height}px
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* 분수 입력 프리셋 */}
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempWidth}
                onChange={(e) => {
                  e.stopPropagation();
                  const value = Math.max(1, Math.min(24, parseInt(e.target.value) || 1));
                  setTempWidth(value);
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-10 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                min="1"
                max="24"
              />
              <span className="text-xs text-gray-500">/24</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateBox(box.id, { width: tempWidth });
                }}
                className="text-xs px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded"
                title="너비 적용"
              >
                적용
              </button>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeBox(box.id);
              }}
              className="text-red-500 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 세밀한 크기 조절 */}
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              너비 (칸)
            </label>
            <input
              type="number"
              value={box.width}
              onChange={(e) => {
                e.stopPropagation();
                updateBox(box.id, { width: Math.max(1, Math.min(24, parseInt(e.target.value) || 1)) });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="1"
              max="24"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              높이 (px)
            </label>
            <input
              type="number"
              value={box.height}
              onChange={(e) => {
                e.stopPropagation();
                updateBox(box.id, { height: Math.max(50, parseInt(e.target.value) || 50) });
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="50"
            />
          </div>
        </div>

        {/* Layout Type 선택 */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            레이아웃 타입
          </label>
          <select
            value={box.layoutType || 'simple'}
            onChange={(e) => {
              e.stopPropagation();
              const newType = e.target.value as LayoutType;

              if (newType === 'loaded') {
                // 불러오기 선택 시 라이브러리 열기
                setIsComponentLibraryOpen(true);
              } else {
                updateBox(box.id, { layoutType: newType });
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded
                     focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="simple">Simple (단순)</option>
            <option value="flex">Flex (플렉스박스)</option>
            <option value="table">Table (테이블)</option>
            <option value="loaded">📚 불러오기</option>
          </select>
        </div>

        {/* Simple 레이아웃: 텍스트 입력 */}
        {(!box.layoutType || box.layoutType === 'simple') && (
          <textarea
            value={box.content}
            onChange={(e) => updateBox(box.id, { content: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder={PLACEHOLDERS.BOX_CONTENT}
            className="flex-1 w-full p-2 border border-gray-200 rounded resize-none
                       focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        )}

        {/* Flex 레이아웃: FlexLayoutEditor */}
        {box.layoutType === 'flex' && (
          <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <FlexLayoutEditor
              box={box}
              onUpdate={(updates) => updateBox(box.id, updates)}
            />
          </div>
        )}

        {/* Table 레이아웃: TableLayoutEditor */}
        {box.layoutType === 'table' && (
          <div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <TableLayoutEditor
              box={box}
              onUpdate={(updates) => updateBox(box.id, updates)}
            />
          </div>
        )}

        {/* 불러오기 레이아웃: 저장된 컴포넌트 표시 */}
        {box.layoutType === 'loaded' && (
          <div className="flex-1 p-4 bg-green-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-700 text-sm font-medium">
                📚 저장된 컴포넌트 사용 중
              </span>
            </div>

            {box.loadedComponentId ? (
              <div className="space-y-3">
                <div className="bg-white p-3 rounded border border-green-200">
                  <p className="text-xs text-gray-600 mb-2">미리보기:</p>
                  <div
                    className="bg-gray-100 rounded p-2"
                    style={{ maxHeight: '200px', overflow: 'auto' }}
                  >
                    <iframe
                      srcDoc={box.loadedHtml || ''}
                      className="w-full border-0"
                      style={{ minHeight: '150px' }}
                      title={`loaded-preview-${box.id}`}
                    />
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsComponentLibraryOpen(true);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded transition-colors"
                >
                  다른 컴포넌트 선택
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">컴포넌트를 선택해주세요</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsComponentLibraryOpen(true);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded transition-colors"
                >
                  컴포넌트 선택
                </button>
              </div>
            )}
          </div>
        )}

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

      {/* 컴포넌트 라이브러리 모달 */}
      {isComponentLibraryOpen && (
        <ComponentLibrary
          onSelect={(component) => {
            updateBox(box.id, {
              layoutType: 'loaded',
              loadedComponentId: component.id,
              loadedHtml: component.html,
              width: component.width,
              height: component.height,
            });
            setIsComponentLibraryOpen(false);
          }}
          onClose={() => setIsComponentLibraryOpen(false)}
        />
      )}
    </Rnd>
  );
}
