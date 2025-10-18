'use client';

import { useStore } from '@/lib/store';
import { ERROR_MESSAGES } from '@/lib/constants';

export default function Toolbar() {
  const boxes = useStore((state) => state.boxes);
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const isGenerating = useStore((state) => state.isGenerating);
  const setGenerating = useStore((state) => state.setGenerating);
  const setError = useStore((state) => state.setError);
  const addVersion = useStore((state) => state.addVersion);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // HTML 생성 요청
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
        const prompt = boxes.map((b) => `[${b.width}col] ${b.content}`).join('\n');
        addVersion(data.html, prompt);
        setError(null);
      }
    } catch (error) {
      setError(ERROR_MESSAGES.GENERATION_FAILED);
      console.error('Generate error:', error);
    } finally {
      setGenerating(false);
    }
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
    <div className="flex items-center justify-between p-4 bg-white border-b border-gray-300">
      <h2 className="text-lg font-semibold text-gray-800">HTML Preview</h2>

      <div className="flex gap-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || boxes.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            '🚀 Generate HTML'
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={!currentHTML}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          💾 Download
        </button>
      </div>
    </div>
  );
}
