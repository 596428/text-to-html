'use client';

import { useStore } from '@/lib/store';
import { ERROR_MESSAGES } from '@/lib/constants';

export default function PreviewToolbar() {
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const setError = useStore((state) => state.setError);
  const setCanvasMode = useStore((state) => state.setCanvasMode);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // 편집 모드로 돌아가기
  const handleBackToEdit = () => {
    setCanvasMode('edit');
  };

  // HTML 다운로드
  const handleDownload = () => {
    if (!currentHTML) {
      setError(ERROR_MESSAGES.NO_HTML);
      return;
    }

    const blob = new Blob([currentHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layout-v${currentVersion}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700 to-gray-800 border-b border-gray-600">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBackToEdit}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          ← 편집으로 돌아가기
        </button>
        <h2 className="text-lg font-semibold text-white">HTML 프리뷰</h2>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={!currentHTML}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          💾 다운로드
        </button>
      </div>
    </div>
  );
}
