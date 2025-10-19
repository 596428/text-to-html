'use client';

import { useState } from 'react';

interface PopupEditorProps {
  boxId: string;
  popupContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export default function PopupEditor({ boxId, popupContent, onSave, onClose }: PopupEditorProps) {
  const [content, setContent] = useState(popupContent || '');

  const handleSave = () => {
    onSave(content);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-11/12 max-w-4xl max-h-5/6 flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">팝업 내용 편집</h3>
              <p className="text-xs text-gray-600 mt-1">
                팝업창에 표시될 내용을 입력하세요. Gemini가 자동으로 HTML로 변환합니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                💾 저장
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>

        {/* 텍스트 입력 영역 */}
        <div className="flex-1 p-6 overflow-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="예시:&#10;&#10;사업장 조회 팝업&#10;&#10;검색 조건:&#10;- 사업장명 입력 필드&#10;- 검색 버튼 (파란색)&#10;- 결과 개수 표시&#10;&#10;검색 결과 테이블:&#10;- 헤더: 사업장 코드, 사업장명, 등록번호, 대표자, 주소, 검색여부, 검색항목&#10;- 샘플 데이터 1행 포함&#10;&#10;하단 버튼:&#10;- 확인 버튼 (파란색)&#10;- 취소 버튼 (회색)"
            className="w-full h-full min-h-96 p-4 border border-gray-300 rounded-lg resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        {/* 하단 도움말 */}
        <div className="bg-gray-50 border-t border-gray-200 p-3">
          <p className="text-xs text-gray-600">
            💡 <strong>Tip:</strong> 내용, 디자인, 색상 등을 자유롭게 설명하세요.
            예: "제목은 큰 글씨로", "파란색 버튼", "테이블 3행 5열" 등
          </p>
        </div>
      </div>
    </div>
  );
}
