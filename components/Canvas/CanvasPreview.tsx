'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import PreviewToolbar from './PreviewToolbar';
import IframePreview from './IframePreview';
import HTMLEditor from './HTMLEditor';
import VersionSelector from './VersionSelector';

export default function CanvasPreview() {
  const [editMode, setEditMode] = useState<'view' | 'edit'>('view');

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <PreviewToolbar />

      <div className="flex-1 flex flex-col p-6 overflow-auto">
        {/* 버전 선택기 + HTML 편집 토글 */}
        <div className="mb-4 flex items-center justify-between">
          <VersionSelector />

          <button
            onClick={() => setEditMode(editMode === 'view' ? 'edit' : 'view')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              editMode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            {editMode === 'edit' ? '✅ 편집 완료' : '✏️ HTML 편집'}
          </button>
        </div>

        {/* HTML 프리뷰 또는 편집 모드 */}
        <div className="flex-1 bg-white rounded-lg shadow-2xl overflow-hidden">
          {editMode === 'view' ? (
            <IframePreview />
          ) : (
            <HTMLEditor onComplete={() => setEditMode('view')} />
          )}
        </div>
      </div>
    </div>
  );
}
