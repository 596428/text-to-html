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
    <div className="px-4 py-3 border-b border-gray-300 bg-gray-50">
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={boxes.length === 0 || isGenerating}
          className="bg-gray-700 hover:bg-gray-800 text-white font-semibold
                     py-2 px-4 rounded-md shadow-sm transition-all
                     disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              HTML 생성 중...
            </span>
          ) : (
            'HTML 생성'
          )}
        </button>

        {hasGeneratedHTML && (
          <button
            onClick={() => setCanvasMode('preview')}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium
                       py-2 px-4 rounded-md shadow-sm transition-all"
          >
            프리뷰 보기
          </button>
        )}

        <button
          onClick={addBox}
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium
                     py-2 px-4 rounded-md shadow-sm transition-all"
        >
          박스 추가
        </button>

        {boxes.length > 0 && (
          <button
            onClick={clearBoxes}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium
                       py-2 px-4 rounded-md shadow-sm transition-all"
          >
            전체 삭제
          </button>
        )}

        <div className="ml-auto text-xs text-gray-600">
          <strong>Tip:</strong> 박스를 그리고 설명을 작성한 후 "HTML 생성"을 클릭하세요
        </div>
      </div>
    </div>
  );
}
