'use client';

import { useState, useEffect } from 'react';
import { getAllComponents, deleteComponent } from '@/lib/componentLibrary';
import type { SavedComponent } from '@/types';

interface ComponentLibraryProps {
  onSelect: (component: SavedComponent) => void;
  onClose: () => void;
}

export default function ComponentLibrary({ onSelect, onClose }: ComponentLibraryProps) {
  const [components, setComponents] = useState<SavedComponent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    const all = await getAllComponents();
    setComponents(all);
  };

  const filteredComponents = components.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.tags && c.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`"${name}" 컴포넌트를 삭제하시겠습니까?`)) {
      await deleteComponent(id);
      await loadComponents();
    }
  };

  const handlePreview = (html: string, name: string) => {
    setPreviewHtml(html);
    setPreviewName(name);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-11/12 max-w-4xl h-5/6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold">저장된 컴포넌트</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* 검색 */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 이름, 설명, 태그로 검색..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <p className="text-sm text-gray-500 mt-2">
            총 {components.length}개 컴포넌트 저장됨
          </p>
        </div>

        {/* 컴포넌트 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredComponents.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              {searchQuery ? '검색 결과가 없습니다' : '저장된 컴포넌트가 없습니다'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredComponents.map((comp) => (
                <div
                  key={comp.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                >
                  {/* 미리보기 영역 */}
                  <div
                    className="bg-gray-100 rounded-md mb-3 p-2 cursor-pointer hover:bg-gray-200"
                    style={{ height: '120px', overflow: 'hidden' }}
                    onClick={() => handlePreview(comp.html, comp.name)}
                  >
                    <iframe
                      srcDoc={comp.html}
                      className="w-full h-full border-0 pointer-events-none"
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
                      title={`preview-${comp.id}`}
                    />
                  </div>

                  {/* 정보 */}
                  <h3 className="font-bold text-sm mb-1 truncate" title={comp.name}>
                    {comp.name}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2 h-8">
                    {comp.description || '설명 없음'}
                  </p>

                  {/* 태그 */}
                  {comp.tags && comp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {comp.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 크기 정보 */}
                  <p className="text-xs text-gray-500 mb-2">
                    {comp.width}칸 × {comp.height}px
                  </p>

                  {/* 잘못 저장된 컴포넌트 경고 */}
                  {(() => {
                    // 메타데이터의 boxCount로 판단 (2개 이상이면 전체 페이지)
                    // 메타데이터가 없는 경우(구버전) fallback: data-section-id 개수로 판단
                    const boxCount = comp.metadata?.boxCount;
                    const fallbackCount = (comp.html.match(/data-section-id=/g) || []).length;
                    const actualCount = boxCount !== undefined ? boxCount : fallbackCount;

                    return actualCount > 1 && (
                      <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                        ⚠️ 전체 페이지 저장됨 ({actualCount}개 박스)
                      </p>
                    );
                  })()}

                  {/* 버튼 */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelect(comp)}
                      className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      선택
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id, comp.name)}
                      className="bg-red-500 text-white text-sm px-3 py-1.5 rounded-md hover:bg-red-600 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 미리보기 모달 */}
      {previewHtml && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60"
          onClick={() => setPreviewHtml(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-11/12 h-5/6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">{previewName} - 미리보기</h3>
              <button
                onClick={() => setPreviewHtml(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="preview-modal"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
