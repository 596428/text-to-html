# Phase 1: Flex 레이아웃 에디터

**목표**: 박스 내부 자식 요소를 드래그 앤 드롭으로 재배치
**예상 기간**: 5일 (병렬 작업으로 단축)
**브랜치 전략**: `feature/phase-1-flex-editor` (통합), 3개 하위 브랜치
**병렬 세션**: 3개 (Session A, B, C)

---

## 병렬 작업 분할

```
Phase 1 (5일) → 병렬 3개 세션
├─ Group 1A (Session A): FlexLayoutEditor.tsx - 2일
├─ Group 1B (Session B): ChildElementEditor.tsx - 2일
└─ Group 1C (Session C): DraggableItem.tsx - 2일
+ 통합 및 테스트: 1일
```

---

## Group 1A: FlexLayoutEditor.tsx

**담당**: Session A
**브랜치**: `feature/phase-1a-flex-layout`
**기간**: 2일

### 작업 내용

**컴포넌트 구조**:

```typescript
// components/Canvas/FlexLayoutEditor.tsx

import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Box, ChildElement } from '@/types';
import { DraggableItem } from '@/components/shared/DraggableItem';
import { ChildElementEditor } from './ChildElementEditor';

interface FlexLayoutEditorProps {
  box: Box;
  onUpdate: (updates: Partial<Box>) => void;
}

export function FlexLayoutEditor({ box, onUpdate }: FlexLayoutEditorProps) {
  const [direction, setDirection] = useState<'row' | 'column'>('row');
  const children = box.children || [];

  // 드래그 앤 드롭으로 순서 변경
  const moveChild = (dragIndex: number, hoverIndex: number) => {
    const reordered = [...children];
    const [removed] = reordered.splice(dragIndex, 1);
    reordered.splice(hoverIndex, 0, removed);

    // order 재정렬
    const updated = reordered.map((child, idx) => ({
      ...child,
      order: idx,
    }));

    onUpdate({ children: updated });
  };

  // 자식 요소 추가
  const addChild = (type: ChildElementType) => {
    const newChild = createDefaultChildElement(type, children.length);
    onUpdate({ children: [...children, newChild] });
  };

  // 자식 요소 업데이트
  const updateChild = (id: string, updates: Partial<ChildElement>) => {
    const updated = children.map((child) =>
      child.id === id ? { ...child, ...updates } : child
    );
    onUpdate({ children: updated });
  };

  // 자식 요소 삭제
  const deleteChild = (id: string) => {
    const filtered = children.filter((c) => c.id !== id);
    const reordered = filtered.map((child, idx) => ({
      ...child,
      order: idx,
    }));
    onUpdate({ children: reordered });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-4">
        {/* 방향 전환 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Flex Direction:</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'row' | 'column')}
            className="px-2 py-1 border rounded"
          >
            <option value="row">수평 (Row)</option>
            <option value="column">수직 (Column)</option>
          </select>
        </div>

        {/* 자식 요소 추가 버튼 */}
        <div className="flex gap-2">
          <button onClick={() => addChild('text')} className="btn-sm">
            + 텍스트
          </button>
          <button onClick={() => addChild('input')} className="btn-sm">
            + 입력창
          </button>
          <button onClick={() => addChild('button')} className="btn-sm">
            + 버튼
          </button>
          <button onClick={() => addChild('image')} className="btn-sm">
            + 이미지
          </button>
        </div>

        {/* 자식 요소 리스트 */}
        <div
          className={`flex ${direction === 'column' ? 'flex-col' : 'flex-row'} gap-2 p-4 border-2 border-dashed rounded min-h-[200px]`}
        >
          {children.length === 0 ? (
            <div className="text-gray-400 text-center w-full">
              자식 요소를 추가하세요
            </div>
          ) : (
            children
              .sort((a, b) => a.order - b.order)
              .map((child, index) => (
                <DraggableItem
                  key={child.id}
                  id={child.id}
                  index={index}
                  onMove={moveChild}
                >
                  <ChildElementEditor
                    element={child}
                    onUpdate={(updates) => updateChild(child.id, updates)}
                    onDelete={() => deleteChild(child.id)}
                  />
                </DraggableItem>
              ))
          )}
        </div>

        {/* 프리뷰 */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">미리보기</h4>
          <div className={`flex ${direction === 'column' ? 'flex-col' : 'flex-row'} gap-2 p-4 bg-gray-50 rounded`}>
            {children.map((child) => (
              <div
                key={child.id}
                style={{
                  flexGrow: child.flexGrow || 0,
                  flexShrink: child.flexShrink || 1,
                  flexBasis: child.flexBasis || 'auto',
                  width: child.width ? `${child.width}px` : undefined,
                  height: child.height ? `${child.height}px` : undefined,
                }}
                className="border p-2 bg-white rounded"
              >
                {child.type}: {child.content || '(내용 없음)'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
```

**검증 기준**:
- ✅ 자식 요소 드래그로 순서 변경 가능
- ✅ 수평/수직 방향 전환 시 레이아웃 즉시 반영
- ✅ 실시간 미리보기 정상 작동
- ✅ 빈 상태에서도 에러 없음

---

## Group 1B: ChildElementEditor.tsx

**담당**: Session B
**브랜치**: `feature/phase-1b-child-editor`
**기간**: 2일

### 작업 내용

**컴포넌트 구조**:

```typescript
// components/Canvas/ChildElementEditor.tsx

import { useState } from 'react';
import type { ChildElement, ChildElementType } from '@/types';

interface ChildElementEditorProps {
  element: ChildElement;
  onUpdate: (updates: Partial<ChildElement>) => void;
  onDelete: () => void;
}

export function ChildElementEditor({
  element,
  onUpdate,
  onDelete,
}: ChildElementEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeIcons: Record<ChildElementType, string> = {
    text: '📝',
    input: '✏️',
    button: '🔘',
    image: '🖼️',
    custom: '⚙️',
  };

  return (
    <div className="border rounded p-3 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{typeIcons[element.type]}</span>
          <span className="font-medium capitalize">{element.type}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isExpanded ? '접기' : '펼치기'}
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 간단한 내용 */}
      <input
        type="text"
        value={element.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        placeholder="내용 입력..."
        className="w-full px-2 py-1 border rounded text-sm"
      />

      {/* 상세 설정 */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Flex 속성 */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-600">Flex Grow</label>
              <input
                type="number"
                min="0"
                value={element.flexGrow || 0}
                onChange={(e) => onUpdate({ flexGrow: parseInt(e.target.value) })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Flex Shrink</label>
              <input
                type="number"
                min="0"
                value={element.flexShrink || 1}
                onChange={(e) => onUpdate({ flexShrink: parseInt(e.target.value) })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Flex Basis</label>
              <input
                type="text"
                value={element.flexBasis || 'auto'}
                onChange={(e) => onUpdate({ flexBasis: e.target.value })}
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>

          {/* 크기 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Width (px)</label>
              <input
                type="number"
                value={element.width || ''}
                onChange={(e) =>
                  onUpdate({ width: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="auto"
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Height (px)</label>
              <input
                type="number"
                value={element.height || ''}
                onChange={(e) =>
                  onUpdate({ height: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="auto"
                className="w-full px-2 py-1 border rounded text-sm"
              />
            </div>
          </div>

          {/* 타입별 추가 옵션 */}
          {element.type === 'input' && (
            <div>
              <label className="text-xs text-gray-600">Input Type</label>
              <select
                value={element.customStyles?.inputType || 'text'}
                onChange={(e) =>
                  onUpdate({
                    customStyles: { ...element.customStyles, inputType: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="text">Text</option>
                <option value="email">Email</option>
                <option value="password">Password</option>
                <option value="number">Number</option>
              </select>
            </div>
          )}

          {element.type === 'button' && (
            <div>
              <label className="text-xs text-gray-600">Button Style</label>
              <select
                value={element.customStyles?.buttonStyle || 'primary'}
                onChange={(e) =>
                  onUpdate({
                    customStyles: { ...element.customStyles, buttonStyle: e.target.value },
                  })
                }
                className="w-full px-2 py-1 border rounded text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="danger">Danger</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**검증 기준**:
- ✅ 각 타입별 편집 UI 정상 작동
- ✅ flexGrow, width, height 조절 반영
- ✅ 삭제 버튼 클릭 시 확인 없이 즉시 삭제
- ✅ 상세 설정 펼치기/접기 애니메이션

---

## Group 1C: DraggableItem.tsx

**담당**: Session C
**브랜치**: `feature/phase-1c-draggable`
**기간**: 2일

### 작업 내용

**컴포넌트 구조**:

```typescript
// components/shared/DraggableItem.tsx

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { Identifier, XYCoord } from 'dnd-core';

const ItemType = 'CHILD_ELEMENT';

interface DraggableItemProps {
  id: string;
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
}

interface DragItem {
  id: string;
  index: number;
}

export function DraggableItem({
  id,
  index,
  onMove,
  children,
}: DraggableItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // 같은 위치면 무시
      if (dragIndex === hoverIndex) {
        return;
      }

      // 마우스 위치 계산
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // 드래그 방향 확인 (아래로만 또는 위로만)
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // 실제 순서 변경
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex; // 무한 루프 방지
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => ({ id, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      data-handler-id={handlerId}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
      className={`
        transition-opacity
        ${isDragging ? 'scale-105 shadow-lg' : ''}
      `}
    >
      {children}
    </div>
  );
}
```

**검증 기준**:
- ✅ 드래그 시 반투명 효과 표시
- ✅ Drop zone 하이라이트
- ✅ 부드러운 순서 변경 (무한 루프 없음)
- ✅ 터치 디바이스에서도 작동 (선택사항)

---

## 통합 테스트 (Day 5)

**담당**: Session A (Master)
**브랜치**: `feature/phase-1-flex-editor`

### 통합 작업
1. 3개 브랜치 머지 (1a, 1b, 1c → phase-1)
2. 컴포넌트 간 인터페이스 검증
3. 통합 테스트 실행
4. Gemini 프롬프트에 children 전달 로직 추가

### Gemini 프롬프트 업데이트

```typescript
// lib/gemini.ts

function generatePrompt(boxes: Box[]): string {
  let prompt = `다음 Box 정보로 HTML을 생성하세요:\n\n`;

  boxes.forEach((box, idx) => {
    prompt += `Box ${idx + 1}:\n`;
    prompt += `- 위치: Grid Column ${box.x}, Y ${box.y}px\n`;
    prompt += `- 크기: ${box.width} columns, ${box.height}px\n`;
    prompt += `- 설명: ${box.content}\n`;

    // === Flex 레이아웃 처리 ===
    if (box.layout === 'flex' && box.children) {
      prompt += `- 레이아웃: Flex (${box.children.length}개 자식 요소)\n`;
      box.children
        .sort((a, b) => a.order - b.order)
        .forEach((child, childIdx) => {
          prompt += `  ${childIdx + 1}. ${child.type}: ${child.content}\n`;
          prompt += `     - flexGrow: ${child.flexGrow || 0}\n`;
          if (child.width) prompt += `     - width: ${child.width}px\n`;
          if (child.height) prompt += `     - height: ${child.height}px\n`;
        });
    }

    prompt += `\n`;
  });

  return prompt;
}
```

### 통합 테스트 시나리오

**시나리오 1: 간단한 Flex 레이아웃**
```
Box 1 (Flex):
- Child 1: text "제목"
- Child 2: button "클릭"
- Child 3: input "이메일 입력"

Expected HTML:
<div class="flex flex-row gap-2">
  <p>제목</p>
  <button>클릭</button>
  <input type="email" placeholder="이메일 입력" />
</div>
```

**시나리오 2: FlexGrow 비율**
```
Box 1 (Flex):
- Child 1: text (flexGrow: 1)
- Child 2: button (flexGrow: 2)

Expected HTML:
<div class="flex">
  <div class="flex-grow">텍스트</div>
  <button class="flex-grow-2">버튼</button>
</div>
```

### 검증 기준
- ✅ 3개 컴포넌트 머지 충돌 없음
- ✅ Flex 레이아웃 → HTML 생성 성공
- ✅ 드래그 앤 드롭 → 순서 반영 확인
- ✅ 기존 Simple 레이아웃 동작 유지

---

## 다음 단계

Phase 1 완료 후:
1. **Phase 2 시작**: Table Builder 개발
2. **병렬 작업**: Session A (TableBuilder), Session B (CellMerger)
3. **문서 업데이트**: Flex 레이아웃 사용 가이드

---

**생성일**: 2025-10-26
**담당자**: Session A, B, C
**상태**: ⏳ Phase 0 완료 대기
