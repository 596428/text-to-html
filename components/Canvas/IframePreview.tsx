'use client';

import { useStore } from '@/lib/store';
import { useEffect, useRef } from 'react';

export default function IframePreview() {
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const error = useStore((state) => state.error);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
