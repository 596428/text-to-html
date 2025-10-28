'use client';

import { useStore } from '@/lib/store';

export default function VersionSelector() {
  const htmlVersions = useStore((state) => state.htmlVersions);
  const currentVersion = useStore((state) => state.currentVersion);
  const goToVersion = useStore((state) => state.goToVersion);

  if (htmlVersions.length === 0) {
    return null;
  }

  // 버전 번호의 최소값과 최대값 계산
  const minVersion = Math.min(...htmlVersions.map(v => v.version));
  const maxVersion = Math.max(...htmlVersions.map(v => v.version));

  const canGoPrev = currentVersion > minVersion;
  const canGoNext = currentVersion < maxVersion;

  const currentVersionData = htmlVersions.find((v) => v.version === currentVersion);

  const handlePrev = () => {
    if (canGoPrev) {
      goToVersion(currentVersion - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      goToVersion(currentVersion + 1);
    }
  };

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-300">
      <div className="flex items-center justify-between">
        {/* 버전 정보 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              Version {currentVersion} / {htmlVersions.length}
            </span>
            {currentVersionData && (
              <span className="text-xs text-gray-500">
                {new Date(currentVersionData.timestamp).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
          {currentVersionData?.prompt && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {currentVersionData.prompt}
            </p>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Previous version"
          >
            ← Prev
          </button>

          <select
            value={currentVersion}
            onChange={(e) => goToVersion(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 cursor-pointer"
          >
            {htmlVersions.map((v) => (
              <option key={v.version} value={v.version}>
                v{v.version}
              </option>
            ))}
          </select>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next version"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
