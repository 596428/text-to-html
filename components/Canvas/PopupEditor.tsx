'use client';

import { useRef, useState, useEffect } from 'react';

interface PopupEditorProps {
  boxId: string;
  popupContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export default function PopupEditor({ boxId, popupContent, onSave, onClose }: PopupEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>('초기화 중...');
  const [isReady, setIsReady] = useState(false);
  const [currentHTML, setCurrentHTML] = useState(popupContent);

  // 팝업 컨텐츠가 없으면 기본 템플릿 제공
  useEffect(() => {
    if (!popupContent) {
      setCurrentHTML(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    .popup-container {
      max-width: 600px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="popup-container" data-editable="true">
    <h2>팝업 제목</h2>
    <p>여기에 팝업 내용을 입력하세요.</p>
  </div>
</body>
</html>`);
    } else {
      setCurrentHTML(popupContent);
    }
  }, [popupContent]);

  // iframe 로드 핸들러 (HTMLEditor.tsx와 동일한 로직)
  const handleIframeLoad = () => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    if (!doc || !win) {
      setDebugInfo('❌ iframe 접근 실패');
      return;
    }

    // 편집 가능한 요소 찾기
    let allElements = doc.querySelectorAll('[data-editable="true"]');

    if (allElements.length === 0) {
      const selectors = [
        'body > div > *',
        'main > *',
        'section',
        'article',
        'header',
        'footer',
        'nav',
        'aside',
        '[class*="container"] > *',
        '[class*="section"]',
        '[class*="card"]',
        '[class*="panel"]',
        'div[class]:not([class=""])'
      ];

      const elementsSet = new Set<Element>();
      selectors.forEach(selector => {
        try {
          doc.querySelectorAll(selector).forEach(el => elementsSet.add(el));
        } catch (e) {
          // 선택자 오류 무시
        }
      });

      allElements = Array.from(elementsSet) as any;
    }

    if (allElements.length === 0) {
      setDebugInfo('❌ 편집 가능한 요소를 찾을 수 없습니다');
      return;
    }

    // 드래그/리사이즈 변수
    let draggedElement: HTMLElement | null = null;
    let resizingElement: HTMLElement | null = null;
    let resizeDirection: string | null = null;
    let isEditingText: boolean = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let startHeight = 0;

    // 현재 선택된 요소의 컨트롤 제거
    const removeControls = () => {
      doc.querySelectorAll('.resize-handle, .delete-btn').forEach(el => el.remove());
    };

    // 리사이즈 핸들 생성
    const createResizeHandle = (position: string) => {
      const handle = doc.createElement('div');
      handle.className = 'resize-handle';
      handle.style.position = 'absolute';
      handle.style.width = '10px';
      handle.style.height = '10px';
      handle.style.background = '#3b82f6';
      handle.style.border = '1px solid white';
      handle.style.zIndex = '10000';
      handle.dataset.position = position;

      if (position.includes('n')) handle.style.top = '-5px';
      if (position.includes('s')) handle.style.bottom = '-5px';
      if (position.includes('w')) handle.style.left = '-5px';
      if (position.includes('e')) handle.style.right = '-5px';

      if (position === 'nw' || position === 'se') handle.style.cursor = 'nwse-resize';
      if (position === 'ne' || position === 'sw') handle.style.cursor = 'nesw-resize';

      handle.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizingElement = handle.parentElement as HTMLElement;
        resizeDirection = position;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = resizingElement.offsetWidth;
        startHeight = resizingElement.offsetHeight;
      });

      return handle;
    };

    // 삭제 버튼 생성
    const createDeleteButton = () => {
      const btn = doc.createElement('button');
      btn.className = 'delete-btn';
      btn.innerHTML = '✕';
      btn.style.position = 'absolute';
      btn.style.top = '-10px';
      btn.style.right = '-10px';
      btn.style.width = '24px';
      btn.style.height = '24px';
      btn.style.background = '#ef4444';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '50%';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '14px';
      btn.style.fontWeight = 'bold';
      btn.style.zIndex = '10000';
      btn.title = '요소 삭제 (숨기기)';

      btn.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = btn.parentElement as HTMLElement;
        target.style.display = 'none';
        removeControls();
        setDebugInfo('✅ 요소 삭제됨 (display: none)');
      });

      return btn;
    };

    // 선택된 요소에 컨트롤 추가
    const showControls = (element: HTMLElement) => {
      removeControls();

      const positions = ['nw', 'ne', 'sw', 'se'];
      positions.forEach(pos => {
        element.appendChild(createResizeHandle(pos));
      });

      element.appendChild(createDeleteButton());
    };

    // 모든 요소에 편집 가능 설정
    let editableCount = 0;
    allElements.forEach((element, index) => {
      const el = element as HTMLElement;

      if (el.tagName === 'SCRIPT') return;

      el.setAttribute('data-editable', 'true');
      el.setAttribute('data-section-id', `section-${index}`);

      const currentPosition = win.getComputedStyle(el).position;
      if (currentPosition === 'static') {
        el.style.position = 'relative';
      }

      const computedStyle = win.getComputedStyle(el);
      if (!el.style.width) {
        el.style.width = computedStyle.width;
        el.style.maxWidth = 'none';
      }
      if (!el.style.height) {
        el.style.height = computedStyle.height;
        el.style.maxHeight = 'none';
      }
      el.style.boxSizing = 'border-box';

      el.style.cursor = 'move';
      el.style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
      el.style.outlineOffset = '2px';

      el.addEventListener('mousedown', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle') || target.classList.contains('delete-btn')) {
          return;
        }

        if (isEditingText) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        draggedElement = el;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(el.style.left || '0');
        startTop = parseInt(el.style.top || '0');

        allElements.forEach(elem => {
          (elem as HTMLElement).style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
        });
        el.style.outline = '3px solid rgb(59, 130, 246)';
        el.style.zIndex = '9999';

        showControls(el);

        setDebugInfo(`✅ 선택: ${el.getAttribute('data-section-id')}`);
      });

      el.addEventListener('dblclick', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;

        if (target.classList.contains('resize-handle') || target.classList.contains('delete-btn')) {
          return;
        }

        isEditingText = true;

        el.contentEditable = 'true';
        el.style.cursor = 'text';

        const interactiveElements = el.querySelectorAll('input, select, textarea, button, a');
        interactiveElements.forEach(child => {
          (child as HTMLElement).contentEditable = 'false';
          (child as HTMLElement).setAttribute('data-protected', 'true');
        });

        el.focus();

        const range = doc.createRange();
        const selection = win.getSelection();

        try {
          range.selectNodeContents(el);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
          // 선택 오류 무시
        }

        setDebugInfo(`✏️ 텍스트 편집 중: ${el.getAttribute('data-section-id')}`);

        const handleKeyDown = (ke: KeyboardEvent) => {
          if (ke.key === 'Enter' && !ke.shiftKey) {
            ke.preventDefault();
            el.blur();
          }
        };

        const handleBlur = () => {
          isEditingText = false;
          el.contentEditable = 'false';
          el.style.cursor = 'move';

          const protectedChildren = el.querySelectorAll('[data-protected="true"]');
          protectedChildren.forEach(child => {
            child.removeAttribute('data-protected');
          });

          el.removeEventListener('keydown', handleKeyDown);
          el.removeEventListener('blur', handleBlur);

          setDebugInfo(`✅ 텍스트 편집 완료: ${el.getAttribute('data-section-id')}`);
        };

        el.addEventListener('keydown', handleKeyDown);
        el.addEventListener('blur', handleBlur);
      });

      editableCount++;
    });

    setDebugInfo(`✅ 편집 가능한 요소: ${editableCount}개`);

    doc.addEventListener('mousemove', (e: MouseEvent) => {
      if (draggedElement && !resizingElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        draggedElement.style.left = `${startLeft + deltaX}px`;
        draggedElement.style.top = `${startTop + deltaY}px`;
      }

      if (resizingElement && resizeDirection) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (resizeDirection.includes('e')) newWidth = startWidth + deltaX;
        if (resizeDirection.includes('w')) newWidth = startWidth - deltaX;
        if (resizeDirection.includes('s')) newHeight = startHeight + deltaY;
        if (resizeDirection.includes('n')) newHeight = startHeight - deltaY;

        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);

        resizingElement.style.width = `${newWidth}px`;
        resizingElement.style.height = `${newHeight}px`;
      }
    });

    doc.addEventListener('mouseup', () => {
      if (draggedElement) {
        const sectionId = draggedElement.getAttribute('data-section-id');
        setDebugInfo(`✅ 이동 완료: ${sectionId} → (${draggedElement.style.left}, ${draggedElement.style.top})`);
        draggedElement = null;
      }

      if (resizingElement) {
        const sectionId = resizingElement.getAttribute('data-section-id');
        setDebugInfo(`✅ 크기 변경 완료: ${sectionId} → (${resizingElement.style.width}, ${resizingElement.style.height})`);
        resizingElement = null;
        resizeDirection = null;
      }
    });

    setIsReady(true);
  };

  const handleSave = () => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // 컨트롤 제거
    doc.querySelectorAll('.resize-handle, .delete-btn').forEach(el => el.remove());

    // 편집용 스타일 제거
    doc.querySelectorAll('[data-editable="true"]').forEach(el => {
      const element = el as HTMLElement;
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.cursor = '';
      if (element.style.zIndex === '9999') {
        element.style.zIndex = '';
      }
      element.contentEditable = 'false';
      element.removeAttribute('contenteditable');
    });

    // 보호된 자식 요소 속성 제거
    doc.querySelectorAll('[data-protected="true"]').forEach(el => {
      el.removeAttribute('data-protected');
      el.removeAttribute('contenteditable');
    });

    const updatedHTML = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    onSave(updatedHTML);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
         onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-11/12 h-5/6 flex flex-col"
           onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">팝업 내용 편집</h3>
              <p className="text-xs text-gray-600 mt-1">
                클릭(선택) → 드래그(이동) | 모서리핸들(크기) | X버튼(삭제) | 더블클릭(텍스트편집)
              </p>
              <p className="text-xs text-gray-500">상태: {debugInfo}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!isReady}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
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

        {/* iframe 편집 영역 */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <iframe
            ref={iframeRef}
            srcDoc={currentHTML}
            onLoad={handleIframeLoad}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
            title="Popup Content Editor"
          />
        </div>
      </div>
    </div>
  );
}
