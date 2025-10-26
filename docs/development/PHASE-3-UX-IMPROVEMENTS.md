# Phase 3: UX 개선

**목표**: 세밀한 크기 조절 및 사용성 개선
**예상 기간**: 3일 (병렬 작업)
**브랜치 전략**: `feature/phase-3-ux` (통합), 2개 하위 브랜치
**병렬 세션**: 2개 (Session A, B)

---

## 병렬 작업 분할

```
Phase 3 (3일) → 병렬 2개 세션
├─ Group 3A (Session A): SizeController.tsx - 1.5일
└─ Group 3B (Session B): BoxProperties.tsx 리팩토링 - 1.5일
+ 통합 및 테스트: 1일 (일부 겹침)
```

---

## Group 3A: SizeController.tsx

**담당**: Session A
**브랜치**: `feature/phase-3a-size-control`
**기간**: 1.5일

### 작업 내용

**컴포넌트 구조**:

```typescript
// components/Canvas/SizeController.tsx

import { useState } from 'react';
import type { Box } from '@/types';

interface SizeControllerProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

type SizePreset = 'full' | 'half' | 'third' | 'quarter' | 'custom';

export function SizeController({ box, onUpdate }: SizeControllerProps) {
  const [lockAspectRatio, setLockAspectRatio] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(box.width / box.height);

  const gridColWidth = 100; // 가정: 각 그리드 열은 100px

  // 프리셋 크기
  const presets: Record<SizePreset, { width: number; height: number }> = {
    full: { width: 12, height: 400 },
    half: { width: 6, height: 300 },
    third: { width: 4, height: 250 },
    quarter: { width: 3, height: 200 },
    custom: { width: box.width, height: box.height },
  };

  // 프리셋 적용
  const applyPreset = (preset: SizePreset) => {
    const size = presets[preset];
    onUpdate({
      width: size.width,
      height: size.height,
    });

    if (lockAspectRatio) {
      setAspectRatio(size.width / size.height);
    }
  };

  // Width 변경 (그리드 기반)
  const handleWidthChange = (newWidth: number) => {
    if (lockAspectRatio) {
      const newHeight = Math.round(newWidth / aspectRatio);
      onUpdate({ width: newWidth, height: newHeight });
    } else {
      onUpdate({ width: newWidth });
    }
  };

  // Height 변경 (Pixel 기반)
  const handleHeightChange = (newHeight: number) => {
    if (lockAspectRatio) {
      const newWidth = Math.round(newHeight * aspectRatio);
      onUpdate({ width: newWidth, height: newHeight });
    } else {
      onUpdate({ height: newHeight });
    }
  };

  // Pixel 단위 width/height (children 전용)
  const handlePixelWidthChange = (pixelWidth: number) => {
    onUpdate({ width: pixelWidth }); // 그리드 무시, pixel 저장
  };

  const handlePixelHeightChange = (pixelHeight: number) => {
    onUpdate({ height: pixelHeight });
  };

  return (
    <div className="space-y-4">
      {/* 프리셋 버튼 */}
      <div>
        <label className="block text-sm font-medium mb-2">빠른 크기 설정</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => applyPreset('full')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Full Width
          </button>
          <button
            onClick={() => applyPreset('half')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Half (1/2)
          </button>
          <button
            onClick={() => applyPreset('third')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Third (1/3)
          </button>
          <button
            onClick={() => applyPreset('quarter')}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
          >
            Quarter (1/4)
          </button>
        </div>
      </div>

      {/* 비율 고정 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="lock-aspect"
          checked={lockAspectRatio}
          onChange={(e) => {
            setLockAspectRatio(e.target.checked);
            if (e.target.checked) {
              setAspectRatio(box.width / box.height);
            }
          }}
          className="rounded"
        />
        <label htmlFor="lock-aspect" className="text-sm cursor-pointer">
          비율 고정 {lockAspectRatio && `(${aspectRatio.toFixed(2)})`}
        </label>
      </div>

      {/* 그리드 기반 크기 조절 (기본 Box용) */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Width (Grid Columns: 1-12)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="12"
              value={box.width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value))}
              className="flex-grow"
            />
            <input
              type="number"
              min="1"
              max="12"
              value={box.width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value))}
              className="w-16 px-2 py-1 border rounded text-sm"
            />
            <span className="text-xs text-gray-500">
              ≈ {box.width * gridColWidth}px
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Height (Pixels)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="100"
              max="800"
              step="10"
              value={box.height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value))}
              className="flex-grow"
            />
            <input
              type="number"
              min="100"
              max="2000"
              step="10"
              value={box.height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
            <span className="text-xs">px</span>
          </div>
        </div>
      </div>

      {/* Pixel 단위 조절 (Flex/Table 자식 요소용) */}
      {(box.layout === 'flex' || box.layout === 'table') && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            정밀 크기 조절 (Pixel 단위)
          </h4>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              정확한 Width (px)
            </label>
            <input
              type="number"
              min="50"
              max="2000"
              step="1"
              value={box.width}
              onChange={(e) => handlePixelWidthChange(parseInt(e.target.value))}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">
              정확한 Height (px)
            </label>
            <input
              type="number"
              min="50"
              max="2000"
              step="1"
              value={box.height}
              onChange={(e) => handlePixelHeightChange(parseInt(e.target.value))}
              className="w-full px-2 py-1 border rounded text-sm"
            />
          </div>
        </div>
      )}

      {/* 현재 크기 정보 */}
      <div className="bg-gray-50 p-3 rounded text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-gray-600">현재 Width:</span>
            <span className="font-medium ml-2">
              {box.width} {box.layout === 'simple' ? 'cols' : 'px'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">현재 Height:</span>
            <span className="font-medium ml-2">{box.height}px</span>
          </div>
          {box.layout === 'simple' && (
            <div className="col-span-2">
              <span className="text-gray-600">실제 Width:</span>
              <span className="font-medium ml-2">
                ≈ {box.width * gridColWidth}px
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**검증 기준**:
- ✅ 프리셋 버튼 클릭 시 즉시 크기 변경
- ✅ 비율 고정 시 width/height 연동
- ✅ 그리드 기반/Pixel 기반 모드 자동 전환
- ✅ 슬라이더와 숫자 입력 동기화

---

## Group 3B: BoxProperties.tsx 리팩토링

**담당**: Session B
**브랜치**: `feature/phase-3b-properties`
**기간**: 1.5일

### 작업 내용

**대폭 수정된 컴포넌트**:

```typescript
// components/Sidebar/BoxProperties.tsx

import { useState } from 'react';
import type { Box, LayoutType } from '@/types';
import { FlexLayoutEditor } from '@/components/Canvas/FlexLayoutEditor';
import { TableBuilder } from '@/components/Canvas/TableBuilder';
import { SizeController } from '@/components/Canvas/SizeController';

interface BoxPropertiesProps {
  box: Box | null;
  onUpdate: (id: string, updates: Partial<Box>) => void;
  onDelete: (id: string) => void;
}

type Tab = 'basic' | 'layout' | 'children' | 'size' | 'popup';

export function BoxProperties({ box, onUpdate, onDelete }: BoxPropertiesProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  if (!box) {
    return (
      <div className="p-4 text-gray-500 text-center">
        박스를 선택하세요
      </div>
    );
  }

  const currentLayout = box.layout || 'simple';

  const handleLayoutChange = (newLayout: LayoutType) => {
    const updates: Partial<Box> = { layout: newLayout };

    // Layout 전환 시 초기화
    if (newLayout === 'simple') {
      updates.children = undefined;
      updates.tableStructure = undefined;
    } else if (newLayout === 'flex') {
      updates.children = [];
      updates.tableStructure = undefined;
    } else if (newLayout === 'table') {
      updates.children = undefined;
      updates.tableStructure = createDefaultTableStructure(3, 3);
    }

    onUpdate(box.id, updates);
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'basic', label: '기본', icon: '📝' },
    { key: 'layout', label: '레이아웃', icon: '🏗️' },
    { key: 'children', label: '자식 요소', icon: '📦' },
    { key: 'size', label: '크기', icon: '📏' },
    { key: 'popup', label: '팝업', icon: '💬' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* 탭 헤더 */}
      <div className="flex border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              px-4 py-2 text-sm font-medium whitespace-nowrap
              ${activeTab === tab.key
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="flex-grow overflow-y-auto p-4">
        {/* 기본 탭 */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Box ID</label>
              <input
                type="text"
                value={box.id}
                disabled
                className="w-full px-2 py-1 bg-gray-100 border rounded text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={box.content}
                onChange={(e) => onUpdate(box.id, { content: e.target.value })}
                rows={4}
                className="w-full px-2 py-1 border rounded text-sm"
                placeholder="이 박스에 대한 설명을 입력하세요..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">X (Column)</label>
                <input
                  type="number"
                  min="0"
                  max="11"
                  value={box.x}
                  onChange={(e) => onUpdate(box.id, { x: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Y (px)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={box.y}
                  onChange={(e) => onUpdate(box.id, { y: parseInt(e.target.value) })}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('이 박스를 삭제하시겠습니까?')) {
                  onDelete(box.id);
                }
              }}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ 박스 삭제
            </button>
          </div>
        )}

        {/* 레이아웃 탭 */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">레이아웃 타입</label>
              <div className="grid grid-cols-3 gap-2">
                {(['simple', 'flex', 'table'] as LayoutType[]).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => handleLayoutChange(layout)}
                    className={`
                      px-3 py-2 rounded text-sm font-medium
                      ${currentLayout === layout
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                      }
                    `}
                  >
                    {layout === 'simple' && '📝 Simple'}
                    {layout === 'flex' && '📦 Flex'}
                    {layout === 'table' && '📊 Table'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium mb-2">
                {currentLayout === 'simple' && '📝 Simple 레이아웃'}
                {currentLayout === 'flex' && '📦 Flex 레이아웃'}
                {currentLayout === 'table' && '📊 Table 레이아웃'}
              </p>
              <p className="text-gray-600 text-xs">
                {currentLayout === 'simple' &&
                  '텍스트 설명만으로 HTML을 생성합니다. 가장 간단한 방식입니다.'}
                {currentLayout === 'flex' &&
                  '자식 요소를 드래그 앤 드롭으로 배치할 수 있습니다.'}
                {currentLayout === 'table' &&
                  '병합된 셀을 포함한 복잡한 테이블을 생성할 수 있습니다.'}
              </p>
            </div>

            {currentLayout !== 'simple' && (
              <div className="border-t pt-4">
                <p className="text-sm text-orange-600">
                  ⚠️ 레이아웃을 변경하면 현재 {currentLayout === 'flex' ? '자식 요소' : '테이블 구조'}가
                  초기화됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 자식 요소 탭 (Flex/Table만) */}
        {activeTab === 'children' && (
          <div>
            {currentLayout === 'simple' && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">Simple 레이아웃에서는 사용할 수 없습니다.</p>
                <p className="text-sm">Flex 또는 Table 레이아웃으로 전환하세요.</p>
              </div>
            )}

            {currentLayout === 'flex' && (
              <FlexLayoutEditor
                box={box}
                onUpdate={(updates) => onUpdate(box.id, updates)}
              />
            )}

            {currentLayout === 'table' && (
              <TableBuilder
                box={box}
                onUpdate={(updates) => onUpdate(box.id, updates)}
              />
            )}
          </div>
        )}

        {/* 크기 탭 */}
        {activeTab === 'size' && (
          <SizeController
            box={box}
            onUpdate={(updates) => onUpdate(box.id, updates)}
          />
        )}

        {/* 팝업 탭 */}
        {activeTab === 'popup' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-popup"
                checked={box.hasPopup || false}
                onChange={(e) => onUpdate(box.id, { hasPopup: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="has-popup" className="text-sm font-medium cursor-pointer">
                팝업 활성화
              </label>
            </div>

            {box.hasPopup && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    팝업 트리거 텍스트
                  </label>
                  <input
                    type="text"
                    value={box.popupTriggerText || ''}
                    onChange={(e) =>
                      onUpdate(box.id, { popupTriggerText: e.target.value })
                    }
                    placeholder="예: 자세히 보기"
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    팝업 내용
                  </label>
                  <textarea
                    value={box.popupContent || ''}
                    onChange={(e) =>
                      onUpdate(box.id, { popupContent: e.target.value })
                    }
                    rows={6}
                    placeholder="팝업에 표시될 내용을 입력하세요..."
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**검증 기준**:
- ✅ 탭 전환 시 적절한 컴포넌트 표시
- ✅ Layout 변경 시 경고 메시지 표시
- ✅ Simple 레이아웃에서 자식 요소 탭 비활성화
- ✅ 각 탭의 기능이 독립적으로 작동

---

## 통합 테스트 (Day 3)

### 검증 시나리오

**시나리오 1: Simple → Flex 전환**
```
1. Simple Box 생성 후 내용 입력
2. Layout을 Flex로 변경
3. 자식 요소 3개 추가
4. 드래그 앤 드롭으로 순서 변경
5. Size 탭에서 정밀 크기 조절
6. HTML 생성 → Flex 레이아웃 확인
```

**시나리오 2: Flex → Table 전환**
```
1. Flex Box에 자식 요소 5개 추가
2. 경고 확인 후 Table로 전환
3. 자식 요소가 초기화됨 확인
4. 3x3 테이블 생성 및 셀 병합
5. HTML 생성 → Table 구조 확인
```

**시나리오 3: 비율 고정 크기 조절**
```
1. Box 생성 (width: 6, height: 300)
2. 비율 고정 체크
3. Width를 12로 변경
4. Height가 자동으로 600으로 조절됨 확인
5. HTML 생성 → 크기 반영 확인
```

### 검증 기준
- ✅ 모든 Layout 타입 간 전환 가능
- ✅ 전환 시 데이터 초기화 경고 표시
- ✅ 각 Layout에서 HTML 정상 생성
- ✅ 비율 고정 크기 조절 정확

---

## 다음 단계

Phase 3 완료 후:
1. **Phase 4 시작**: 성능 및 안정성 개선
2. **문서 업데이트**: 새로운 UI 사용 가이드

---

**생성일**: 2025-10-26
**담당자**: Session A, B
**상태**: ⏳ Phase 2 완료 대기
