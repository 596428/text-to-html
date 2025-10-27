'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { ERROR_MESSAGES } from '@/lib/constants';

export default function PreviewToolbar() {
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const boxes = useStore((state) => state.boxes);
  const setError = useStore((state) => state.setError);
  const setCanvasMode = useStore((state) => state.setCanvasMode);
  const [filename, setFilename] = useState(`layout-v${currentVersion}`);
  const [showFilenameInput, setShowFilenameInput] = useState(false);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // 편집 모드로 돌아가기
  const handleBackToEdit = () => {
    setCanvasMode('edit');
  };

  // HTML 다운로드 (메타데이터 포함)
  const handleDownload = () => {
    if (!currentHTML) {
      setError(ERROR_MESSAGES.NO_HTML);
      return;
    }

    // 메타데이터 생성 (모든 박스 데이터 포함)
    const metadata = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      boxes: boxes.map(box => ({
        id: box.id,
        position: { x: box.x, y: box.y },
        size: { width: box.width, height: box.height },
        content: box.content,

        // 레이아웃 타입
        layoutType: box.layoutType,

        // Flex 레이아웃 관련
        ...(box.layoutType === 'flex' && {
          flexDirection: box.flexDirection,
          flexWrap: box.flexWrap,
          justifyContent: box.justifyContent,
          alignItems: box.alignItems,
          gap: box.gap,
          children: box.children
        }),

        // 테이블 레이아웃 관련
        ...(box.layoutType === 'table' && {
          tableStructure: box.tableStructure,
          tableDescription: box.tableDescription
        }),

        // 불러오기 레이아웃 관련 (제외 - 사용자 요청)
        // loadedComponentId, loadedHtml은 저장하지 않음

        // 팝업 관련
        hasPopup: box.hasPopup || false,
        popupContent: box.popupContent || '',
        popupTriggerText: box.popupTriggerText || ''
      }))
    };

    // HTML에 메타데이터 삽입
    const htmlWithMetadata = currentHTML.replace(
      '</head>',
      `  <script type="application/json" id="layout-metadata">
${JSON.stringify(metadata, null, 2)}
  </script>
</head>`
    );

    const blob = new Blob([htmlWithMetadata], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);

    setShowFilenameInput(false);
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

      <div className="flex items-center gap-2">
        {showFilenameInput && (
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="파일명 입력"
            className="px-3 py-2 rounded-lg border border-gray-500 bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
        )}
        <button
          onClick={() => {
            if (showFilenameInput) {
              handleDownload();
            } else {
              setShowFilenameInput(true);
            }
          }}
          disabled={!currentHTML}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          💾 {showFilenameInput ? '다운로드 확인' : '다운로드'}
        </button>
        {showFilenameInput && (
          <button
            onClick={() => setShowFilenameInput(false)}
            className="px-3 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-500 transition-colors"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
