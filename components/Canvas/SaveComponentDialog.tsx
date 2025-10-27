'use client';

import { useState } from 'react';
import { saveComponent } from '@/lib/componentLibrary';

interface SaveComponentDialogProps {
  html: string;
  boxWidth: number;
  boxHeight: number;
  onClose: () => void;
  onSaved?: () => void;
}

export default function SaveComponentDialog({
  html,
  boxWidth,
  boxHeight,
  onClose,
  onSaved,
}: SaveComponentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('컴포넌트 이름을 입력해주세요');
      return;
    }

    setIsSaving(true);

    try {
      await saveComponent({
        name: name.trim(),
        description: description.trim(),
        html,
        width: boxWidth,
        height: boxHeight,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      });

      alert('컴포넌트가 저장되었습니다!');
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-11/12 max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">컴포넌트 저장</h2>

        <div className="space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 검색바 v1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 검진일/접수번호 검색 기능"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 검색, 입력, 폼"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 크기 정보 */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              <span className="font-medium">크기:</span> {boxWidth}칸 × {boxHeight}px
            </p>
            <p className="text-xs text-gray-500 mt-1">
              HTML 크기: {(html.length / 1024).toFixed(2)} KB
            </p>
          </div>

          {/* HTML 미리보기 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              미리보기
            </label>
            <div className="border border-gray-300 rounded-md" style={{ height: '200px', overflow: 'auto' }}>
              <iframe
                srcDoc={html}
                className="w-full h-full border-0"
                title="preview"
                style={{ minHeight: '200px' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ⚠️ 전체 페이지가 보인다면, 현재는 박스별 HTML 분리가 불완전합니다.
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isSaving}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            disabled={isSaving}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
