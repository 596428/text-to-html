'use client';

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Box, ChildElement } from '@/types';
import { ChildElementEditor } from './ChildElementEditor';

interface FlexLayoutEditorProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

export function FlexLayoutEditor({ box, onUpdate }: FlexLayoutEditorProps) {
  const children = box.children || [];

  // 자식 요소 추가
  const addChild = () => {
    const newChild: ChildElement = {
      id: `child-${Date.now()}`,
      content: '',
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
      order: children.length
    };
    onUpdate({ children: [...children, newChild] });
  };

  // 자식 요소 업데이트
  const updateChild = (id: string, updates: Partial<ChildElement>) => {
    const updated = children.map((child) =>
      child.id === id ? { ...child, ...updates } : child
    );
    onUpdate({ children: updated });
  };

  // 자식 요소 삭제
  const deleteChild = (id: string) => {
    const filtered = children.filter((c) => c.id !== id);
    const reordered = filtered.map((child, idx) => ({
      ...child,
      order: idx
    }));
    onUpdate({ children: reordered });
  };

  // 자식 요소 순서 변경
  const moveChild = (dragIndex: number, hoverIndex: number) => {
    const reordered = [...children];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(hoverIndex, 0, removed);

    const updated = reordered.map((child, idx) => ({
      ...child,
      order: idx
    }));

    onUpdate({ children: updated });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        {/* Flex 방향 설정 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            정렬 방향:
          </label>
          <select
            value={box.flexDirection || 'row'}
            onChange={(e) => onUpdate({ flexDirection: e.target.value as 'row' | 'column' })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="row">가로 (Row)</option>
            <option value="column">세로 (Column)</option>
          </select>
        </div>

        {/* Flex Wrap 설정 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            줄바꿈:
          </label>
          <select
            value={box.flexWrap || 'nowrap'}
            onChange={(e) => onUpdate({ flexWrap: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="nowrap">줄바꿈 안함</option>
            <option value="wrap">줄바꿈</option>
            <option value="wrap-reverse">역순 줄바꿈</option>
          </select>
        </div>

        {/* Justify Content 설정 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            가로 정렬:
          </label>
          <select
            value={box.justifyContent || 'flex-start'}
            onChange={(e) => onUpdate({ justifyContent: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="flex-start">시작</option>
            <option value="flex-end">끝</option>
            <option value="center">중앙</option>
            <option value="space-between">양끝 정렬</option>
            <option value="space-around">균등 분배 (외곽 여백)</option>
            <option value="space-evenly">균등 분배</option>
          </select>
        </div>

        {/* Align Items 설정 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            세로 정렬:
          </label>
          <select
            value={box.alignItems || 'stretch'}
            onChange={(e) => onUpdate({ alignItems: e.target.value as any })}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="flex-start">시작</option>
            <option value="flex-end">끝</option>
            <option value="center">중앙</option>
            <option value="stretch">늘임</option>
            <option value="baseline">기준선</option>
          </select>
        </div>

        {/* Gap 설정 */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            요소 간격 (px):
          </label>
          <input
            type="number"
            value={box.gap || 0}
            onChange={(e) => onUpdate({ gap: parseInt(e.target.value) || 0 })}
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        {/* 자식 요소 목록 */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-700">
              자식 요소 ({children.length})
            </h4>
            <button
              onClick={addChild}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              + 요소 추가
            </button>
          </div>

          <div className="space-y-3">
            {children.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                자식 요소가 없습니다. "+ 요소 추가" 버튼을 클릭하세요.
              </p>
            ) : (
              children.map((child, index) => (
                <ChildElementEditor
                  key={child.id}
                  child={child}
                  index={index}
                  onUpdate={(updates) => updateChild(child.id, updates)}
                  onDelete={() => deleteChild(child.id)}
                  onMove={moveChild}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
