'use client';

import { useState, useMemo } from 'react';
import type { Box, ChildElement } from '@/types';
import { ChildElementEditor } from './ChildElementEditor';

interface FlexLayoutEditorProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

export function FlexLayoutEditor({ box, onUpdate }: FlexLayoutEditorProps) {
  const children = box.children || [];
  const flexDirection = box.flexDirection || 'row';
  const flexAlign = box.flexAlign || 'left';

  // 공간 비율 합계 계산
  const totalRatio = useMemo(() => {
    return children.reduce((sum, child) => sum + (child.spaceRatio || 0), 0);
  }, [children]);

  // 빈칸 체크
  const hasEmptyRatio = useMemo(() => {
    return children.some(child => !child.spaceRatio || child.spaceRatio <= 0);
  }, [children]);

  // 검증 상태
  const isValid = !hasEmptyRatio && totalRatio <= 100;

  // 자식 요소 추가
  const addChild = () => {
    const newChild: ChildElement = {
      id: `child-${Date.now()}`,
      content: '',
      spaceRatio: 0
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
    onUpdate({ children: filtered });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* Flex 방향 설정 */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 w-24">
          정렬 방향:
        </label>
        <select
          value={flexDirection}
          onChange={(e) => onUpdate({ flexDirection: e.target.value as 'row' | 'column' })}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="row">가로 (1×N)</option>
          <option value="column">세로 (N×1)</option>
        </select>
        <span className="text-xs text-gray-500">
          자식 요소를 나열할 방향
        </span>
      </div>

      {/* 정렬 방식 설정 (가로일 때만) */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 w-24">
          정렬 방식:
        </label>
        <select
          value={flexAlign}
          onChange={(e) => onUpdate({ flexAlign: e.target.value as 'left' | 'right' | 'center' })}
          disabled={flexDirection === 'column'}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="left">왼쪽 정렬</option>
          <option value="right">오른쪽 정렬</option>
          <option value="center">가운데 정렬</option>
        </select>
        {flexDirection === 'column' && (
          <span className="text-xs text-gray-500">
            세로 방향은 항상 위쪽 정렬
          </span>
        )}
      </div>

      {/* 검증 상태 표시 */}
      {children.length > 0 && (
        <div className={`p-3 rounded-md ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              공간 비율 합계:
            </span>
            <span className={`text-sm font-bold ${totalRatio > 100 ? 'text-red-600' : totalRatio === 100 ? 'text-green-600' : 'text-blue-600'}`}>
              {totalRatio}% / 100%
            </span>
          </div>
          {hasEmptyRatio && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ 모든 자식 요소의 공간 비율을 입력해주세요
            </p>
          )}
          {!hasEmptyRatio && totalRatio > 100 && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ 공간 비율 합계가 100%를 초과할 수 없습니다
            </p>
          )}
          {isValid && totalRatio < 100 && (
            <p className="text-xs text-gray-600 mt-1">
              ✓ 남은 공간 {100 - totalRatio}%는 정렬 방식에 따라 배치됩니다
            </p>
          )}
        </div>
      )}

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
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
