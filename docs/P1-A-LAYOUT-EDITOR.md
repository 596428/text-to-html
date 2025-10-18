# P1-A: 레이아웃 에디터 모듈 상세 구현 가이드

**담당:** Session 2
**예상 시간:** 1.5일
**Dependency:** P0 완료

---

## 폴더 구조

```
components/LayoutEditor/
├── index.tsx           # 메인 컴포넌트
├── GridBox.tsx         # 드래그 가능한 개별 박스
├── GridGuide.tsx       # 12컬럼 그리드 가이드라인
└── Toolbar.tsx         # 상단 툴바 (박스 추가 등)
```

---

## 1. GridBox.tsx

**역할:** 드래그, 리사이즈 가능한 개별 박스

```typescript
'use client';

import { Rnd } from 'react-rnd';
import { useStore } from '@/lib/store';
import { Box } from '@/types';

interface GridBoxProps {
  box: Box;
}

const GRID_UNIT = 100; // 1컬럼 = 100px

export default function GridBox({ box }: GridBoxProps) {
  const updateBox = useStore((state) => state.updateBox);
  const removeBox = useStore((state) => state.removeBox);
  const selectBox = useStore((state) => state.selectBox);
  const selectedBoxId = useStore((state) => state.selectedBoxId);

  const isSelected = selectedBoxId === box.id;

  return (
    <Rnd
      position={{ x: box.x * GRID_UNIT, y: box.y }}
      size={{ width: box.width * GRID_UNIT, height: box.height }}
      onDragStop={(e, d) => {
        updateBox(box.id, {
          x: Math.round(d.x / GRID_UNIT),
          y: d.y
        });
      }}
      onResizeStop={(e, dir, ref, delta, position) => {
        updateBox(box.id, {
          width: Math.max(1, Math.round(parseInt(ref.style.width) / GRID_UNIT)),
          height: parseInt(ref.style.height),
          x: Math.round(position.x / GRID_UNIT),
          y: position.y
        });
      }}
      grid={[GRID_UNIT, 20]}
      bounds="parent"
      minWidth={GRID_UNIT}
      minHeight={100}
      className={`
        border-2 rounded-lg shadow-lg transition-all
        ${isSelected ? 'border-blue-500 ring-4 ring-blue-200' : 'border-gray-300'}
      `}
      onClick={() => selectBox(box.id)}
    >
      <div className="h-full flex flex-col p-3 bg-white">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-2 pb-2 border-b">
          <span className="text-xs font-semibold text-gray-600">
            📐 {box.width}/12 cols
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBox(box.id);
            }}
            className="text-red-500 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* 텍스트 입력 */}
        <textarea
          value={box.content}
          onChange={(e) => updateBox(box.id, { content: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="이 영역에 대한 설명을 입력하세요...&#10;예: '상단 헤더 - 로고와 네비게이션 메뉴'"
          className="flex-1 w-full p-2 border border-gray-200 rounded resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
      </div>
    </Rnd>
  );
}
```

**핵심 기능:**
- `react-rnd` 사용하여 드래그앤드롭 + 리사이즈
- 그리드 스냅: `grid={[GRID_UNIT, 20]}`
- 선택 상태 시각화: `ring-4 ring-blue-200`
- 박스 내 textarea로 설명 입력

---

## 2. GridGuide.tsx

**역할:** 12컬럼 그리드 가이드라인 표시

```typescript
export default function GridGuide() {
  return (
    <div className="absolute inset-0 grid grid-cols-12 gap-0 pointer-events-none z-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="border-r border-dashed border-gray-300 opacity-30"
        />
      ))}
    </div>
  );
}
```

**핵심 기능:**
- `pointer-events-none`: 클릭 이벤트 무시
- `opacity-30`: 반투명 가이드라인

---

## 3. Toolbar.tsx

**역할:** 박스 추가, 전체 삭제 버튼

```typescript
'use client';

import { useStore } from '@/lib/store';

export default function Toolbar() {
  const addBox = useStore((state) => state.addBox);
  const clearBoxes = useStore((state) => state.clearBoxes);
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
      <div className="space-y-2">
        <button
          onClick={addBox}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold
                     py-3 px-4 rounded-lg shadow-md transition-all hover:shadow-lg"
        >
          ➕ 박스 추가
        </button>

        {boxes.length > 0 && (
          <button
            onClick={clearBoxes}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold
                       py-2 px-4 rounded-lg text-sm transition-all"
          >
            🗑️ 전체 삭제
          </button>
        )}

        <div className="text-xs text-gray-600 mt-2 p-2 bg-blue-50 rounded">
          💡 <strong>Tip:</strong> 드래그로 이동, 모서리로 크기 조절
        </div>
      </div>
    </div>
  );
}
```

---

## 4. index.tsx (메인)

**역할:** 전체 레이아웃 에디터 통합

```typescript
'use client';

import { useStore } from '@/lib/store';
import GridBox from './GridBox';
import GridGuide from './GridGuide';
import Toolbar from './Toolbar';

export default function LayoutEditor() {
  const boxes = useStore((state) => state.boxes);

  return (
    <div className="h-full flex flex-col">
      <Toolbar />

      {/* 캔버스 */}
      <div className="flex-1 relative overflow-auto bg-gray-50" style={{ minHeight: '800px' }}>
        <GridGuide />

        {/* 박스들 */}
        <div className="relative z-10">
          {boxes.map((box) => (
            <GridBox key={box.id} box={box} />
          ))}
        </div>

        {/* 빈 상태 */}
        {boxes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <div className="text-6xl mb-4">📐</div>
              <p className="text-lg font-semibold">박스를 추가하여 시작하세요</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## ✅ 완료 기준

테스트 체크리스트:

- [ ] "박스 추가" 버튼 클릭 → 새 박스 생성
- [ ] 박스 드래그 → 그리드에 스냅되며 이동
- [ ] 박스 모서리 드래그 → 크기 조정
- [ ] 박스 내 textarea 클릭 → 텍스트 입력 가능
- [ ] 박스 선택 시 파란색 링 표시
- [ ] "✕" 버튼 클릭 → 박스 삭제
- [ ] "전체 삭제" → 모든 박스 제거
- [ ] 12컬럼 그리드 가이드라인 표시

---

## Git 커밋

```bash
git add components/LayoutEditor/
git commit -m "feat: layout editor module with drag-and-drop grid system"
```

---

## 다음 단계

P1-A 완료 후 메인 워크플로우에 완료 표시:
- [ ] `WORKFLOW.md`에서 P1-A 체크
- [ ] 다른 세션(P1-B, P1-C)과 병렬 진행 가능
