'use client';

import Toolbar from './Toolbar';
import IframePreview from './IframePreview';
import VersionSelector from './VersionSelector';

export default function PreviewPanel() {
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 상단 툴바 - HTML 생성/다운로드 */}
      <Toolbar />

      {/* 중앙 프리뷰 영역 - Iframe */}
      <IframePreview />

      {/* 하단 버전 셀렉터 - 히스토리 네비게이션 */}
      <VersionSelector />
    </div>
  );
}
