'use client';

import { useStore } from '@/lib/store';
import GridBox from './GridBox';
import GridGuide from './GridGuide';
import EditorToolbar from './EditorToolbar';

export default function CanvasEditor() {
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="h-full flex flex-col bg-white">
      <EditorToolbar />

      {/* 캔버스 - PowerPoint 스타일 */}
      <div className="flex-1 relative overflow-auto bg-gray-100" style={{ minHeight: '800px' }}>
        {/* 캔버스 내부 컨테이너 - 충분한 높이 확보 */}
        <div className="relative" style={{ minHeight: '2000px', width: '100%' }}>
          <GridGuide />

          {/* 박스들 */}
          {boxes.map((box) => (
            <GridBox key={box.id} box={box} />
          ))}
        </div>

        {/* 빈 상태 */}
        {boxes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">📐</div>
              <p className="text-lg font-semibold">박스를 추가하여 레이아웃을 그려보세요</p>
              <p className="text-sm mt-2">PowerPoint처럼 사각형을 그리고 설명을 작성하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
