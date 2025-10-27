'use client';

import { useStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';
import { Box } from '@/types';

interface IframePreviewProps {
  onBoxClick?: (box: Box) => void;
  enableBoxClick?: boolean;
}

export default function IframePreview({ onBoxClick, enableBoxClick = false }: IframePreviewProps) {
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const error = useStore((state) => state.error);
  const boxes = useStore((state) => state.boxes);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);

  const currentHTML = htmlVersions.find((v) => v.version === currentVersion)?.html || '';

  // Iframe에 HTML 주입
  useEffect(() => {
    if (!iframeRef.current || !currentHTML) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (doc) {
      doc.open();
      doc.write(currentHTML);
      doc.close();
    }
  }, [currentHTML]);

  // 박스 클릭 기능 추가
  useEffect(() => {
    if (!iframeRef.current || !enableBoxClick || boxes.length === 0 || !currentHTML) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !doc.body) return; // body가 로드될 때까지 대기

    // 이미 오버레이가 있으면 제거 (중복 방지)
    const existingOverlay = doc.getElementById('box-overlay-container');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // 각 박스 위치에 클릭 가능한 오버레이 추가
    const overlayContainer = doc.createElement('div');
    overlayContainer.id = 'box-overlay-container';
    overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    `;

    boxes.forEach((box) => {
      // data-section-id를 사용해서 실제 렌더링된 요소 찾기 (UUID)
      const sectionId = box.sectionId;
      const sectionElement = doc.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement;

      if (!sectionElement) {
        console.warn(`Section element with id="${sectionId}" not found`);
        return;
      }

      // 실제 요소의 위치와 크기 가져오기
      const rect = sectionElement.getBoundingClientRect();
      const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop;
      const scrollLeft = doc.documentElement.scrollLeft || doc.body.scrollLeft;

      const overlay = doc.createElement('div');
      overlay.setAttribute('data-box-id', box.id);
      overlay.style.cssText = `
        position: absolute;
        left: ${rect.left + scrollLeft}px;
        top: ${rect.top + scrollTop}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px dashed transparent;
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.2s;
        background-color: transparent;
      `;

      // 호버 효과
      overlay.addEventListener('mouseenter', () => {
        overlay.style.border = '2px dashed #3b82f6';
        overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        setHoveredBoxId(box.id);
      });

      overlay.addEventListener('mouseleave', () => {
        overlay.style.border = '2px dashed transparent';
        overlay.style.backgroundColor = 'transparent';
        setHoveredBoxId(null);
      });

      // 클릭 이벤트
      overlay.addEventListener('click', () => {
        onBoxClick?.(box);
      });

      // 툴팁 추가
      const tooltip = doc.createElement('div');
      tooltip.style.cssText = `
        position: absolute;
        top: 4px;
        left: 4px;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        opacity: 0;
        transition: opacity 0.2s;
        pointer-events: none;
        font-family: sans-serif;
      `;
      tooltip.textContent = `${box.layoutType === 'loaded' ? '📚' : '📦'} 박스 ${box.id.slice(-4)} (${box.width}칸 × ${box.height}px)`;

      overlay.addEventListener('mouseenter', () => {
        tooltip.style.opacity = '1';
      });

      overlay.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });

      overlay.appendChild(tooltip);
      overlayContainer.appendChild(overlay);
    });

    doc.body.appendChild(overlayContainer);

    // 클린업 - 의존성 변경 시 오버레이 제거
    return () => {
      const overlay = doc.getElementById('box-overlay-container');
      if (overlay) {
        overlay.remove();
      }
    };
  }, [currentHTML, enableBoxClick, boxes, onBoxClick]);

  // 에러 표시
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-red-50">
        <div className="text-center p-6">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-semibold text-lg">{error}</p>
        </div>
      </div>
    );
  }

  // HTML 없을 때 안내
  if (!currentHTML) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-500 font-medium text-lg">No HTML generated yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Add boxes in the Layout Editor and click &quot;Generate HTML&quot;
          </p>
        </div>
      </div>
    );
  }

  // HTML 프리뷰
  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-scripts allow-same-origin"
      className="w-full h-full border-0"
      title="HTML Preview"
    />
  );
}
