'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store';
import { ERROR_MESSAGES } from '@/lib/constants';
import { Box } from '@/types';

export default function EditorToolbar() {
  const boxes = useStore((state) => state.boxes);
  const addBox = useStore((state) => state.addBox);
  const clearBoxes = useStore((state) => state.clearBoxes);
  const setBoxes = useStore((state) => state.setBoxes);
  const setCanvasMode = useStore((state) => state.setCanvasMode);
  const isGenerating = useStore((state) => state.isGenerating);
  const setGenerating = useStore((state) => state.setGenerating);
  const addVersion = useStore((state) => state.addVersion);
  const setError = useStore((state) => state.setError);
  const htmlVersions = useStore((state) => state.htmlVersions);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasGeneratedHTML = htmlVersions.length > 0;

  const handleGenerate = async () => {
    if (boxes.length === 0) {
      setError(ERROR_MESSAGES.NO_BOXES);
      return;
    }

    setGenerating(true);
    setError(null);

    const startTime = performance.now();

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
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅ HTML 생성 완료 - 소요시간: ${duration}초`);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html = await file.text();

      // HTML 파싱
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 메타데이터 추출
      const metadataScript = doc.getElementById('layout-metadata');

      if (!metadataScript) {
        setError('레이아웃 메타데이터를 찾을 수 없습니다. 메타데이터가 포함된 HTML 파일인지 확인해주세요.');
        return;
      }

      const metadata = JSON.parse(metadataScript.textContent || '{}');

      // Box 복원 (모든 레이아웃 타입 지원)
      const restoredBoxes: Box[] = metadata.boxes.map((box: any) => ({
        id: box.id,
        x: box.position.x,
        y: box.position.y,
        width: box.size.width,
        height: box.size.height,
        content: box.content,

        // 레이아웃 타입
        layoutType: box.layoutType || 'simple',

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

        // 팝업 관련
        hasPopup: box.hasPopup,
        popupContent: box.popupContent,
        popupTriggerText: box.popupTriggerText
      }));

      // Store 업데이트
      setBoxes(restoredBoxes);

      // HTML 버전 추가 (메타데이터 제거)
      const htmlWithoutMetadata = html.replace(
        /<script type="application\/json" id="layout-metadata">[\s\S]*?<\/script>\n?/,
        ''
      );
      const prompt = restoredBoxes.map(b => `[${b.width}컬럼] ${b.content}`).join('\n');
      addVersion(htmlWithoutMetadata, prompt);

      // 프리뷰 모드로 전환
      setCanvasMode('preview');
      setError(null);

      alert(`✅ 레이아웃 복원 완료!\n- Box ${restoredBoxes.length}개\n- 생성일: ${new Date(metadata.createdAt).toLocaleString()}`);

    } catch (error) {
      console.error('복원 실패:', error);
      setError('레이아웃 복원에 실패했습니다. 올바른 파일인지 확인해주세요.');
    }

    // 파일 input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

        <input
          type="file"
          accept=".html"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          ref={fileInputRef}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium
                     py-2 px-4 rounded-md shadow-sm transition-all"
        >
          📂 레이아웃 복구
        </button>

        <div className="ml-auto text-xs text-gray-600">
          <strong>Tip:</strong> 박스를 그리고 설명을 작성한 후 "HTML 생성"을 클릭하세요
        </div>
      </div>
    </div>
  );
}
