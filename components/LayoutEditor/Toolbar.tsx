'use client';

import { useStore } from '@/lib/store';

export default function Toolbar() {
  const addBox = useStore((state) => state.addBox);
  const clearBoxes = useStore((state) => state.clearBoxes);
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
      <div className="space-y-2">
        <button
          onClick={addBox}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     py-3 px-4 rounded-lg shadow-md transition-all hover:shadow-lg"
        >
          ➕ 박스 추가
        </button>

        {boxes.length > 0 && (
          <button
            onClick={clearBoxes}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold
                       py-2 px-4 rounded-lg text-sm transition-all"
          >
            🗑️ 전체 삭제
          </button>
        )}

        <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded">
          💡 <strong>Tip:</strong> 드래그로 이동, 모서리로 크기 조절
        </div>
      </div>
    </div>
  );
}
