'use client';

import { useStore } from '@/lib/store';
import GridBox from './GridBox';
import GridGuide from './GridGuide';
import Toolbar from './Toolbar';

export default function LayoutEditor() {
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="h-full flex flex-col">
      <Toolbar />

      {/* 캔버스 */}
      <div className="flex-1 relative overflow-auto bg-gray-50" style={{ minHeight: '800px' }}>
        <GridGuide />

        {/* 박스들 */}
        <div className="relative z-10">
          {boxes.map((box) => (
            <GridBox key={box.id} box={box} />
          ))}
        </div>

        {/* 빈 상태 */}
        {boxes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">📐</div>
              <p className="text-lg font-semibold">박스를 추가하여 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
