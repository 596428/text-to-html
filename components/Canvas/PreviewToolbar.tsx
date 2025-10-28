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
  const selectedSectionId = useStore((state) => state.selectedSectionId);
  const setSelectedSectionId = useStore((state) => state.setSelectedSectionId);
  const previewScale = useStore((state) => state.previewScale);
  const setPreviewScale = useStore((state) => state.setPreviewScale);
  const addVersion = useStore((state) => state.addVersion);
  const [filename, setFilename] = useState(`layout-v${currentVersion}`);
  const [showFilenameInput, setShowFilenameInput] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isEditingScale, setIsEditingScale] = useState(false);
  const [scaleInputValue, setScaleInputValue] = useState('');

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // 선택된 섹션의 박스 찾기
  const selectedBox = boxes.find(b => b.sectionId === selectedSectionId);

  // 숫자 입력 모드 핸들러
  const handleScaleClick = () => {
    setIsEditingScale(true);
    setScaleInputValue(previewScale.toString());
  };

  const handleScaleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 허용
    if (value === '' || /^\d+$/.test(value)) {
      setScaleInputValue(value);
    }
  };

  const handleScaleInputBlur = () => {
    const numValue = parseInt(scaleInputValue);
    if (!isNaN(numValue)) {
      // 범위 제한 (25% ~ 300%)
      const clampedValue = Math.max(25, Math.min(300, numValue));
      setPreviewScale(clampedValue);
    }
    setIsEditingScale(false);
  };

  const handleScaleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScaleInputBlur();
    } else if (e.key === 'Escape') {
      setIsEditingScale(false);
    }
  };

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
        sectionId: box.sectionId, // UUID 저장
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

  // 섹션 재생성 핸들러
  const handleRegenerateSection = async () => {
    if (!selectedBox || !currentHTML) return;

    setRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxId: selectedBox.id,
          scalePercentage: previewScale,
          boxes,
          currentHTML
        })
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // 새 HTML을 버전 히스토리에 추가
        const prompt = `[배율 ${previewScale}%] ${selectedBox.layoutType} 레이아웃 재생성`;
        addVersion(data.html, prompt);

        // 선택 해제 및 스케일 초기화
        setSelectedSectionId(null);
        setPreviewScale(100);

        alert(`✅ 섹션이 ${previewScale}% 배율로 재생성되었습니다!`);
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      setError('섹션 재생성 중 오류가 발생했습니다.');
    } finally {
      setRegenerating(false);
    }
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
        {/* 섹션 선택 시 배율 조정 UI */}
        {selectedBox && (
          <div className="flex items-center gap-4 px-4 py-2 bg-blue-600 rounded-lg">
            <span className="text-white text-sm font-medium">
              📐 선택: 영역 {boxes.findIndex(b => b.id === selectedBox.id) + 1}
            </span>
            <span className="text-white text-xs">|</span>
            <div className="flex items-center gap-3">
              <span className="text-white text-sm">배율:</span>
              <input
                type="range"
                min="25"
                max="300"
                step="1"
                value={previewScale}
                onChange={(e) => setPreviewScale(Number(e.target.value))}
                className="w-48 h-2 bg-blue-400 rounded-lg appearance-none cursor-pointer accent-white"
              />
              {isEditingScale ? (
                <input
                  type="text"
                  value={scaleInputValue}
                  onChange={handleScaleInputChange}
                  onBlur={handleScaleInputBlur}
                  onKeyDown={handleScaleInputKeyDown}
                  autoFocus
                  className="w-16 px-2 py-1 text-sm font-bold text-center bg-white text-gray-900 rounded border-2 border-blue-300 focus:outline-none focus:border-blue-500"
                />
              ) : (
                <span
                  onClick={handleScaleClick}
                  className="text-white text-sm font-bold min-w-[3.5rem] cursor-pointer hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                  title="클릭하여 직접 입력"
                >
                  {previewScale}%
                </span>
              )}
            </div>
            <button
              onClick={handleRegenerateSection}
              disabled={regenerating}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {regenerating ? '🔄 생성 중...' : '🔄 재생성'}
            </button>
            <button
              onClick={() => {
                setSelectedSectionId(null);
                setPreviewScale(100);
              }}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        )}

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
