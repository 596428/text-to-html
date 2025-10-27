'use client';

import { useState } from 'react';
import { migrateFromLocalStorage, getLocalStorageComponents } from '@/lib/componentLibrary';

interface MigrationDialogProps {
  onClose: () => void;
  onMigrated?: () => void;
}

export default function MigrationDialog({ onClose, onMigrated }: MigrationDialogProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  } | null>(null);

  const localComponents = getLocalStorageComponents();

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateFromLocalStorage();
      setMigrationResult(result);
      if (result.success && result.migratedCount > 0) {
        onMigrated?.();
      }
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      setMigrationResult({
        success: false,
        migratedCount: 0,
        errors: [String(error)],
      });
    } finally {
      setIsMigrating(false);
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
        <h2 className="text-xl font-bold mb-4">localStorage → MongoDB 마이그레이션</h2>

        {!migrationResult ? (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">
                📦 localStorage에 저장된 컴포넌트: <strong>{localComponents.length}개</strong>
              </p>
              <p className="text-xs text-blue-600 mt-2">
                이 컴포넌트들을 MongoDB Atlas로 마이그레이션합니다.
              </p>
            </div>

            {localComponents.length === 0 && (
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-600">
                  마이그레이션할 데이터가 없습니다.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                disabled={isMigrating}
              >
                취소
              </button>
              <button
                onClick={handleMigrate}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={isMigrating || localComponents.length === 0}
              >
                {isMigrating ? '마이그레이션 중...' : '마이그레이션 시작'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {migrationResult.success ? (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-800 font-semibold">
                  ✅ 마이그레이션 성공!
                </p>
                <p className="text-xs text-green-600 mt-2">
                  {migrationResult.migratedCount}개의 컴포넌트가 MongoDB로 이동되었습니다.
                </p>
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-800 font-semibold">
                  ❌ 마이그레이션 실패
                </p>
                <p className="text-xs text-red-600 mt-2">
                  {migrationResult.errors.join(', ')}
                </p>
              </div>
            )}

            {migrationResult.errors.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-md max-h-40 overflow-y-auto">
                <p className="text-sm text-yellow-800 font-semibold mb-2">
                  ⚠️ 오류 목록:
                </p>
                <ul className="text-xs text-yellow-700 space-y-1">
                  {migrationResult.errors.map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
