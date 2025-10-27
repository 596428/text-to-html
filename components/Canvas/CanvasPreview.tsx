'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Box } from '@/types';
import PreviewToolbar from './PreviewToolbar';
import IframePreview from './IframePreview';
import HTMLEditor from './HTMLEditor';
import VersionSelector from './VersionSelector';
import SaveComponentDialog from './SaveComponentDialog';

export default function CanvasPreview() {
  const [editMode, setEditMode] = useState<'view' | 'edit'>('view');
  const [showSaveButtons, setShowSaveButtons] = useState(false);
  const [savingBoxId, setSavingBoxId] = useState<string | null>(null);

  const boxes = useStore((state) => state.boxes);
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // 개별 박스의 HTML 추출 (CSS 포함)
  const getBoxHTML = (boxId: string) => {
    // 박스 인덱스 찾기 (boxes 배열에서의 순서)
    const boxIndex = boxes.findIndex(b => b.id === boxId);
    if (boxIndex === -1) return currentHTML;

    // data-section-id를 사용해서 해당 박스의 HTML만 추출
    const parser = new DOMParser();
    const doc = parser.parseFromString(currentHTML, 'text/html');

    // section-{N} 형태로 찾기 (N은 1부터 시작)
    const sectionId = `section-${boxIndex + 1}`;
    const sectionElement = doc.querySelector(`[data-section-id="${sectionId}"]`);

    if (sectionElement) {
      // <head>의 CSS와 함께 완전한 HTML로 래핑
      const headContent = doc.head.innerHTML;
      const bodyContent = sectionElement.outerHTML;

      const completeHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component</title>
  ${headContent}
</head>
<body>
  ${bodyContent}
</body>
</html>`;

      return completeHTML;
    }

    // data-section-id가 없으면 전체 HTML 반환 (fallback)
    console.warn(`박스 ${boxId}의 data-section-id="${sectionId}"를 찾을 수 없습니다. 전체 HTML을 사용합니다.`);
    return currentHTML;
  };

  const handleSaveBox = (boxOrId: Box | string) => {
    const boxId = typeof boxOrId === 'string' ? boxOrId : boxOrId.id;
    setSavingBoxId(boxId);
  };

  const handleCloseSaveDialog = () => {
    setSavingBoxId(null);
  };

  const savingBox = boxes.find(b => b.id === savingBoxId);

  return (
    <div className="h-full flex flex-col bg-gray-800">
      <PreviewToolbar />

      <div className="flex-1 flex flex-col p-6 overflow-auto">
        {/* 버전 선택기 + HTML 편집 토글 + 저장 버튼 표시 토글 */}
        <div className="mb-4 flex items-center justify-between">
          <VersionSelector />

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveButtons(!showSaveButtons)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showSaveButtons
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
            >
              {showSaveButtons ? '✅ 저장 완료' : '💾 컴포넌트 저장'}
            </button>

            <button
              onClick={() => setEditMode(editMode === 'view' ? 'edit' : 'view')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                editMode === 'edit'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-white hover:bg-gray-500'
              }`}
            >
              {editMode === 'edit' ? '✅ 편집 완료' : '✏️ HTML 편집'}
            </button>
          </div>
        </div>

        {/* 박스별 저장 버튼 영역 */}
        {showSaveButtons && boxes.length > 0 && (
          <div className="mb-4 bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">💾 박스별 저장</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {boxes.map((box) => (
                <button
                  key={box.id}
                  onClick={() => handleSaveBox(box.id)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-sm transition-colors flex flex-col items-start"
                >
                  <div className="font-medium">
                    {box.layoutType === 'loaded' ? '📚' : '📦'} 박스 {box.id.slice(-4)}
                  </div>
                  <div className="text-xs text-gray-300">
                    {box.width}칸 × {box.height}px
                  </div>
                  {box.layoutType === 'loaded' && (
                    <div className="text-xs text-green-300">
                      불러온 컴포넌트
                    </div>
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              💡 팁: 위의 버튼을 클릭하거나, 아래 프리뷰에서 직접 박스를 클릭하여 저장할 수 있습니다.
            </p>
            <p className="text-xs text-gray-400">
              🖱️ 프리뷰에서 박스에 마우스를 올리면 파란색 테두리가 표시됩니다.
            </p>
          </div>
        )}

        {/* HTML 프리뷰 또는 편집 모드 */}
        <div className="flex-1 bg-white rounded-lg shadow-2xl overflow-hidden">
          {editMode === 'view' ? (
            <IframePreview
              enableBoxClick={showSaveButtons}
              onBoxClick={handleSaveBox}
            />
          ) : (
            <HTMLEditor onComplete={() => setEditMode('view')} />
          )}
        </div>
      </div>

      {/* 저장 다이얼로그 */}
      {savingBoxId && savingBox && (
        <SaveComponentDialog
          html={getBoxHTML(savingBoxId)}
          boxWidth={savingBox.width}
          boxHeight={savingBox.height}
          onClose={handleCloseSaveDialog}
          onSaved={() => {
            handleCloseSaveDialog();
            setShowSaveButtons(false);
          }}
        />
      )}
    </div>
  );
}
