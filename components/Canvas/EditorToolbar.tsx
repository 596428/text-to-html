'use client';

import { useStore } from '@/lib/store';
import { ERROR_MESSAGES } from '@/lib/constants';

export default function EditorToolbar() {
  const boxes = useStore((state) => state.boxes);
  const addBox = useStore((state) => state.addBox);
  const clearBoxes = useStore((state) => state.clearBoxes);
  const setCanvasMode = useStore((state) => state.setCanvasMode);
  const isGenerating = useStore((state) => state.isGenerating);
  const setGenerating = useStore((state) => state.setGenerating);
  const addVersion = useStore((state) => state.addVersion);
  const setError = useStore((state) => state.setError);
  const htmlVersions = useStore((state) => state.htmlVersions);

  const hasGeneratedHTML = htmlVersions.length > 0;

  const handleGenerate = async () => {
    if (boxes.length === 0) {
      setError(ERROR_MESSAGES.NO_BOXES);
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxes })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        const prompt = boxes.map((b) => `[${b.width}컬럼] ${b.content}`).join('\n');
        addVersion(data.html, prompt);
        setCanvasMode('preview'); // 자동으로 프리뷰 모드로 전환
      }
    } catch (error) {
      console.error('Generate error:', error);
      setError('HTML 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="space-y-2">
        <button
          onClick={handleGenerate}
          disabled={boxes.length === 0 || isGenerating}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold
                     py-3 px-4 rounded-lg shadow-md transition-all hover:shadow-lg
                     disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              HTML 생성 중...
            </span>
          ) : (
            '🚀 HTML 생성'
          )}
        </button>

        {hasGeneratedHTML && (
          <button
            onClick={() => setCanvasMode('preview')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold
                       py-2.5 px-4 rounded-lg shadow-md transition-all hover:shadow-lg"
          >
            👁️ 프리뷰 보기
          </button>
        )}

        <button
          onClick={addBox}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     py-2.5 px-4 rounded-lg shadow-md transition-all hover:shadow-lg"
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

        <div className="text-xs text-gray-600 mt-2 p-2 bg-white rounded border border-blue-200">
          💡 <strong>Tip:</strong> 박스를 그리고 설명을 작성한 후 "HTML 생성"을 클릭하세요
        </div>
      </div>
    </div>
  );
}
