'use client';

import type { ChildElement } from '@/types';

interface ChildElementEditorProps {
  child: ChildElement;
  index: number;
  onUpdate: (updates: Partial<ChildElement>) => void;
  onDelete: () => void;
}

export function ChildElementEditor({
  child,
  index,
  onUpdate,
  onDelete
}: ChildElementEditorProps) {
  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono bg-blue-100 px-2 py-1 rounded font-semibold text-blue-700">
          자식 요소 #{index + 1}
        </span>
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
            내용 설명 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={child.content}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="이 요소의 내용을 설명하세요 (예: 제목, 본문 텍스트, 이미지 등)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        {/* 공간 비율 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            공간 비율 (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={child.spaceRatio || ''}
            onChange={(e) => onUpdate({ spaceRatio: parseInt(e.target.value) || 0 })}
            placeholder="0 ~ 100"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
          />
          <p className="text-xs text-gray-500 mt-1">
            부모의 너비/높이에서 이 요소가 차지할 비율
          </p>
        </div>
      </div>
    </div>
  );
}
