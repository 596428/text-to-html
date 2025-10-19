'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import PreviewToolbar from './PreviewToolbar';
import IframePreview from './IframePreview';
import VersionSelector from './VersionSelector';
import GridBox from './GridBox';
import GridGuide from './GridGuide';

export default function CanvasPreview() {
  const [showBoxes, setShowBoxes] = useState(false);
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <PreviewToolbar />

      <div className="flex-1 flex flex-col p-6 overflow-auto">
        {/* 버전 선택기 + 박스 편집 토글 */}
        <div className="mb-4 flex items-center justify-between">
          <VersionSelector />

          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showBoxes
                ? 'bg-blue-600 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            {showBoxes ? '📐 박스 숨기기' : '📐 박스 편집'}
          </button>
        </div>

        {/* HTML 프리뷰 + 박스 오버레이 */}
        <div className="flex-1 bg-white rounded-lg shadow-2xl overflow-hidden relative">
          {/* iframe 프리뷰 */}
          <div className={`absolute inset-0 ${showBoxes ? 'opacity-50' : 'opacity-100'} transition-opacity`}>
            <IframePreview />
          </div>

          {/* 박스 편집 오버레이 */}
          {showBoxes && (
            <div className="absolute inset-0 overflow-auto">
              <div className="relative" style={{ minHeight: '2000px', width: '100%' }}>
                <GridGuide />
                {boxes.map((box) => (
                  <GridBox key={box.id} box={box} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
