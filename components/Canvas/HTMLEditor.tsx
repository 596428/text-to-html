'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { generateSectionId } from '@/lib/uuid';

interface HTMLEditorProps {
  onComplete: () => void;
}

export default function HTMLEditor({ onComplete }: HTMLEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [debugInfo, setDebugInfo] = useState<string>('초기화 중...');
  const [isReady, setIsReady] = useState(false);

  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const addVersion = useStore((state) => state.addVersion);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // iframe 로드 핸들러
  const handleIframeLoad = () => {
    if (!iframeRef.current) {
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;

    if (!doc || !win) {
      setDebugInfo('❌ iframe 접근 실패');
      return;
    }

    // 팝업 오버레이를 편집 모드에서 표시 (hidden 클래스 제거)
    doc.querySelectorAll('.popup-overlay').forEach(overlay => {
      (overlay as HTMLElement).classList.remove('hidden');
      (overlay as HTMLElement).style.position = 'relative';  // 편집 모드에서는 relative
      (overlay as HTMLElement).style.opacity = '0.9';        // 살짝 투명하게
    });

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

    // 그리드 기반 이동을 위한 헬퍼 함수
    const getColStart = (el: HTMLElement): number => {
      const match = el.className.match(/col-start-(\d+)/);
      return match ? parseInt(match[1]) : 1;
    };

    const getColSpan = (el: HTMLElement): number => {
      const match = el.className.match(/col-span-(\d+)/);
      return match ? parseInt(match[1]) : 1;
    };

    const getRowStart = (el: HTMLElement): number => {
      const match = el.className.match(/row-start-(\d+)/);
      return match ? parseInt(match[1]) : 1;
    };

    const setColStart = (el: HTMLElement, value: number) => {
      el.className = el.className.replace(/col-start-\d+/, `col-start-${value}`);
    };

    const setRowStart = (el: HTMLElement, value: number) => {
      // 기존 row-start 클래스 제거 후 추가
      el.className = el.className.replace(/row-start-\d+/g, '').trim();
      el.className += ` row-start-${value}`;
    };

    const getGridContainer = (): HTMLElement | null => {
      return doc.querySelector('.grid.grid-cols-24') as HTMLElement;
    };

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

      // 위치 설정
      if (position.includes('n')) handle.style.top = '-5px';
      if (position.includes('s')) handle.style.bottom = '-5px';
      if (position.includes('w')) handle.style.left = '-5px';
      if (position.includes('e')) handle.style.right = '-5px';

      // 커서 설정
      if (position === 'nw' || position === 'se') handle.style.cursor = 'nwse-resize';
      if (position === 'ne' || position === 'sw') handle.style.cursor = 'nesw-resize';

      // 리사이즈 시작
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

      // 리사이즈 핸들 4개 추가
      const positions = ['nw', 'ne', 'sw', 'se'];
      positions.forEach(pos => {
        element.appendChild(createResizeHandle(pos));
      });

      // 삭제 버튼 추가
      element.appendChild(createDeleteButton());
    };

    // 모든 요소에 편집 가능 설정
    let editableCount = 0;
    allElements.forEach((element, index) => {
      const el = element as HTMLElement;

      if (el.tagName === 'SCRIPT') return;

      el.setAttribute('data-editable', 'true');

      // 기존 data-section-id가 있으면 보존, 없으면 UUID 생성
      if (!el.hasAttribute('data-section-id')) {
        el.setAttribute('data-section-id', generateSectionId());
      }

      const currentPosition = win.getComputedStyle(el).position;
      if (currentPosition === 'static') {
        el.style.position = 'relative';
      }

      // 현재 크기를 명시적으로 설정 (가로 방향 리사이즈 가능하게)
      const computedStyle = win.getComputedStyle(el);
      if (!el.style.width) {
        el.style.width = computedStyle.width;
        // max-width 제약 제거 (리사이즈 가능하게)
        el.style.maxWidth = 'none';
      }
      if (!el.style.height) {
        el.style.height = computedStyle.height;
        el.style.maxHeight = 'none';
      }
      // box-sizing 명시
      el.style.boxSizing = 'border-box';

      el.style.cursor = 'move';
      el.style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
      el.style.outlineOffset = '2px';

      // mousedown - 드래그 시작
      el.addEventListener('mousedown', (e: MouseEvent) => {
        // 리사이즈 핸들이나 삭제 버튼 클릭이면 무시
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle') || target.classList.contains('delete-btn')) {
          return;
        }

        // 텍스트 편집 중이면 드래그 무시
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

        // 선택 강조
        allElements.forEach(elem => {
          (elem as HTMLElement).style.outline = '2px dashed rgba(59, 130, 246, 0.5)';
        });
        el.style.outline = '3px solid rgb(59, 130, 246)';
        el.style.zIndex = '9999';

        // 컨트롤 표시
        showControls(el);

        setDebugInfo(`✅ 선택: ${el.getAttribute('data-section-id')}`);
      });

      // dblclick - 텍스트 편집 시작
      el.addEventListener('dblclick', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;

        // 핸들이나 버튼 더블클릭은 무시
        if (target.classList.contains('resize-handle') || target.classList.contains('delete-btn')) {
          return;
        }


        isEditingText = true;

        // contentEditable 활성화
        el.contentEditable = 'true';
        el.style.cursor = 'text';

        // 대화형 요소들만 보호 (input, select, textarea, button만)
        const interactiveElements = el.querySelectorAll('input, select, textarea, button, a');
        interactiveElements.forEach(child => {
          (child as HTMLElement).contentEditable = 'false';
          (child as HTMLElement).setAttribute('data-protected', 'true');
        });

        el.focus();

        // 전체 콘텐츠 선택
        const range = doc.createRange();
        const selection = win.getSelection();

        try {
          range.selectNodeContents(el);
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } catch (error) {
        }

        setDebugInfo(`✏️ 텍스트 편집 중: ${el.getAttribute('data-section-id')}`);

        // Enter 키로 편집 종료
        const handleKeyDown = (ke: KeyboardEvent) => {
          if (ke.key === 'Enter' && !ke.shiftKey) {
            ke.preventDefault();
            el.blur();
          }
        };

        // 포커스 아웃 시 편집 종료
        const handleBlur = () => {
          isEditingText = false;
          el.contentEditable = 'false';
          el.style.cursor = 'move';

          // 자식 요소 보호 속성 제거
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

    // mousemove - 드래그 또는 리사이즈
    doc.addEventListener('mousemove', (e: MouseEvent) => {
      // 드래그 중 - 2D 그리드 자유 배치
      if (draggedElement && !resizingElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const gridContainer = getGridContainer();
        if (!gridContainer) return;

        const containerWidth = gridContainer.offsetWidth;
        const gridWidth = containerWidth / 24; // 24그리드

        // 좌우 이동: 그리드 단위로 계산
        const gridsMoved = Math.round(deltaX / gridWidth);
        const currentColStart = getColStart(draggedElement);
        const currentColSpan = getColSpan(draggedElement);
        const newColStart = Math.max(1, Math.min(24 - currentColSpan + 1, currentColStart + gridsMoved));

        // 상하 이동: 행 단위로 계산
        // 박스 높이를 기준으로 행 이동 계산
        const boxHeight = draggedElement.offsetHeight;
        const rowsMoved = Math.round(deltaY / (boxHeight + 16)); // 16px는 gap-4
        const currentRowStart = getRowStart(draggedElement);
        const newRowStart = Math.max(1, currentRowStart + rowsMoved);

        // 시각적 피드백을 위해 임시로 transform 사용 (저장 시 제거됨)
        const actualGridsMoved = newColStart - currentColStart;
        const visualOffsetX = actualGridsMoved * gridWidth;
        const visualOffsetY = (newRowStart - currentRowStart) * (boxHeight + 16);

        draggedElement.style.transform = `translate(${visualOffsetX}px, ${visualOffsetY}px)`;

        // 이동 중 투명도 효과
        if (Math.abs(gridsMoved) > 0 || Math.abs(rowsMoved) > 0) {
          draggedElement.style.opacity = '0.7';
        } else {
          draggedElement.style.opacity = '1';
        }
      }

      // 리사이즈 중
      if (resizingElement && resizeDirection) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (resizeDirection.includes('e')) newWidth = startWidth + deltaX;
        if (resizeDirection.includes('w')) newWidth = startWidth - deltaX;
        if (resizeDirection.includes('s')) newHeight = startHeight + deltaY;
        if (resizeDirection.includes('n')) newHeight = startHeight - deltaY;

        // 최소 크기 제한
        newWidth = Math.max(50, newWidth);
        newHeight = Math.max(50, newHeight);

        resizingElement.style.width = `${newWidth}px`;
        resizingElement.style.height = `${newHeight}px`;
      }
    });

    // mouseup - 드래그/리사이즈 종료
    doc.addEventListener('mouseup', (e: MouseEvent) => {
      if (draggedElement) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const gridContainer = getGridContainer();
        if (gridContainer) {
          const containerWidth = gridContainer.offsetWidth;
          const gridWidth = containerWidth / 24;

          // 좌우 이동: col-start 값 변경
          const gridsMoved = Math.round(deltaX / gridWidth);
          const currentColStart = getColStart(draggedElement);
          const currentColSpan = getColSpan(draggedElement);
          const newColStart = Math.max(1, Math.min(24 - currentColSpan + 1, currentColStart + gridsMoved));

          // 상하 이동: row-start 값 변경
          const boxHeight = draggedElement.offsetHeight;
          const rowsMoved = Math.round(deltaY / (boxHeight + 16));
          const currentRowStart = getRowStart(draggedElement);
          const newRowStart = Math.max(1, currentRowStart + rowsMoved);

          // 변경사항 적용
          let moved = false;
          if (newColStart !== currentColStart) {
            setColStart(draggedElement, newColStart);
            moved = true;
          }
          if (newRowStart !== currentRowStart) {
            setRowStart(draggedElement, newRowStart);
            moved = true;
          }

          if (moved) {
            setDebugInfo(`✅ 이동 완료: 그리드(${newColStart}, ${newRowStart})`);
          }
        }

        // 시각적 피드백 제거
        draggedElement.style.transform = '';
        draggedElement.style.opacity = '1';
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

  const handleApplyChanges = () => {
    if (!iframeRef.current) return;

    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    // 1. 컨트롤 제거 (핸들, 삭제 버튼)
    doc.querySelectorAll('.resize-handle, .delete-btn').forEach(el => el.remove());

    // 2. 편집용 스타일만 제거 (사용자가 변경한 크기/위치는 유지)
    doc.querySelectorAll('[data-editable="true"]').forEach(el => {
      const element = el as HTMLElement;

      // 편집 UI 스타일만 제거
      element.style.outline = '';
      element.style.outlineOffset = '';
      element.style.cursor = '';
      if (element.style.zIndex === '9999') {
        element.style.zIndex = '';
      }

      // 편집 중에만 필요했던 제약 제거 (사용자 변경사항은 유지)
      element.style.maxWidth = '';
      element.style.maxHeight = '';
      element.style.boxSizing = '';

      // 브라우저 zoom 호환성: left/top 픽셀 오프셋 제거
      // (Tailwind grid의 col-start/col-span이 비율 기반이므로)
      element.style.left = '';
      element.style.top = '';

      // 그리드 기반 이동 시 사용된 임시 스타일 제거
      element.style.transform = '';
      element.style.opacity = '';

      // width, height은 유지 (사용자가 변경한 크기)
      // position: relative도 유지

      // contentEditable 속성 제거
      element.contentEditable = 'false';
      element.removeAttribute('contenteditable');
    });

    // 3. 보호된 자식 요소 속성 제거
    doc.querySelectorAll('[data-protected="true"]').forEach(el => {
      el.removeAttribute('data-protected');
      el.removeAttribute('contenteditable');
    });

    // 4. 팝업 오버레이 복원 (hidden 클래스 추가, 스타일 제거)
    doc.querySelectorAll('.popup-overlay').forEach(overlay => {
      const element = overlay as HTMLElement;
      element.classList.add('hidden');
      element.style.position = '';
      element.style.opacity = '';
    });

    const updatedHTML = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    addVersion(updatedHTML, '사용자가 HTML 요소를 직접 편집함 (이동/크기조정/삭제/텍스트수정/팝업편집)');
    onComplete();
  };

  if (!currentHTML) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        생성된 HTML이 없습니다
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 편집 도구 바 */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <strong>편집 모드</strong>: 클릭(선택) → 드래그(이동) | 모서리핸들(크기) | X버튼(삭제) | 더블클릭(텍스트편집)
            <br />
            <span className="text-xs text-gray-600">상태: {debugInfo}</span>
          </div>

          <button
            onClick={handleApplyChanges}
            disabled={!isReady}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400"
          >
            💾 변경사항 저장
          </button>
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
          title="HTML Editor"
        />
      </div>
    </div>
  );
}
