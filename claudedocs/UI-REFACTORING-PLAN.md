# UI 리팩토링 계획 - 2패널 레이아웃

## 📋 현재 상태 vs 목표 상태

### 현재 (3패널)
```
┌─────────────────┬──────────────────┬─────────────────┐
│  LayoutEditor   │  PreviewPanel    │   ChatPanel     │
│  (텍스트 입력)   │  (HTML 프리뷰)   │   (채팅)        │
│                 │                  │                 │
│  - 박스 추가    │  - iframe 프리뷰 │   - 메시지      │
│  - 박스 배치    │  - 버전 관리     │   - 수정 요청   │
│  - 내용 작성    │  - 다운로드      │                 │
└─────────────────┴──────────────────┴─────────────────┘
```

### 목표 (2패널)
```
┌────────────────────────────────────┬─────────────────┐
│           Canvas                   │   ChatPanel     │
│    (PowerPoint 스타일)              │   (채팅)        │
│                                    │                 │
│  [편집 모드]                        │   - 메시지      │
│  - Grid 기반 사각형 그리기          │   - 수정 요청   │
│  - 각 박스 안에 텍스트 설명 작성     │                 │
│  - 드래그/리사이즈                  │                 │
│  - "HTML 생성" 버튼                │                 │
│                                    │                 │
│  [프리뷰 모드] (HTML 생성 후)        │                 │
│  - iframe으로 HTML 미리보기         │                 │
│  - 버전 관리 UI                    │                 │
│  - 다운로드 버튼                    │                 │
│  - "편집으로 돌아가기" 버튼          │                 │
└────────────────────────────────────┴─────────────────┘
```

## 🎯 핵심 개선 사항

### 1. Canvas 컴포넌트 (왼쪽 패널)
- **편집 모드**: 기존 LayoutEditor 기능 유지 + PowerPoint 스타일 UI
- **프리뷰 모드**: 기존 PreviewPanel의 iframe 프리뷰 통합
- **상태 전환**: HTML 생성 전후로 모드 자동 전환

### 2. 사용자 경험 개선
- **시각적 예측**: 사각형을 그리면서 최종 결과를 미리 상상 가능
- **직관적 인터페이스**: PowerPoint와 유사한 친숙한 UX
- **공간 효율**: 3패널 → 2패널로 화면 공간 최적화

## 🏗️ 구현 계획

### Phase 1: Canvas 컴포넌트 설계
- [ ] `components/Canvas/` 디렉토리 생성
- [ ] `CanvasEditor.tsx` - 편집 모드 (기존 LayoutEditor 기반)
- [ ] `CanvasPreview.tsx` - 프리뷰 모드 (기존 PreviewPanel 기반)
- [ ] `Canvas.tsx` - 모드 전환 로직 포함한 컨테이너

### Phase 2: Store 상태 추가
- [ ] `canvasMode: 'edit' | 'preview'` 추가
- [ ] `setCanvasMode()` 액션 추가
- [ ] HTML 생성 시 자동으로 preview 모드로 전환

### Phase 3: 레이아웃 통합
- [ ] `app/page.tsx` - 2패널 레이아웃으로 변경
- [ ] Canvas (70% 너비) + ChatPanel (30% 너비)
- [ ] 반응형 디자인 적용

### Phase 4: 기존 컴포넌트 제거
- [ ] `components/LayoutEditor/` 제거 (Canvas로 대체됨)
- [ ] `components/PreviewPanel/` 제거 (Canvas로 통합됨)
- [ ] 사용하지 않는 import 정리

## 📐 상세 설계

### Canvas 컴포넌트 구조
```typescript
// components/Canvas/Canvas.tsx
export default function Canvas() {
  const canvasMode = useStore((state) => state.canvasMode);

  return (
    <div className="canvas-container">
      {canvasMode === 'edit' ? (
        <CanvasEditor />  // 편집 모드
      ) : (
        <CanvasPreview /> // 프리뷰 모드
      )}
    </div>
  );
}

// components/Canvas/CanvasEditor.tsx
export default function CanvasEditor() {
  return (
    <div className="canvas-editor">
      <Toolbar />  // "HTML 생성", "박스 추가" 등
      <GridCanvas>
        {boxes.map(box => <GridBox key={box.id} box={box} />)}
      </GridCanvas>
    </div>
  );
}

// components/Canvas/CanvasPreview.tsx
export default function CanvasPreview() {
  return (
    <div className="canvas-preview">
      <PreviewToolbar />  // "편집으로 돌아가기", "다운로드", 버전 선택
      <IframePreview />
    </div>
  );
}
```

### Store 상태 업데이트
```typescript
// lib/store.ts
interface Store {
  // ... 기존 상태
  canvasMode: 'edit' | 'preview';
  setCanvasMode: (mode: 'edit' | 'preview') => void;
}

// HTML 생성 시 자동 전환
const handleGenerateHTML = async () => {
  const html = await generateHTML(boxes);
  addVersion(html, description);
  setCanvasMode('preview'); // 자동으로 프리뷰 모드로 전환
};
```

### 레이아웃 구조
```typescript
// app/page.tsx
export default function Home() {
  return (
    <div className="flex h-screen">
      {/* Canvas: 70% */}
      <div className="w-[70%] border-r border-gray-200">
        <Canvas />
      </div>

      {/* ChatPanel: 30% */}
      <div className="w-[30%]">
        <ChatPanel />
      </div>
    </div>
  );
}
```

## 🎨 UI/UX 개선 포인트

### 편집 모드 (CanvasEditor)
- **배경**: 흰색 캔버스, 격자선 표시 (PowerPoint 스타일)
- **박스**: 파란색 테두리, 드래그/리사이즈 핸들
- **텍스트**: 박스 내부에 직접 입력 가능
- **툴바**: 상단에 "HTML 생성", "박스 추가", "모두 삭제" 버튼

### 프리뷰 모드 (CanvasPreview)
- **배경**: 어두운 회색 (iframe 강조)
- **iframe**: 흰색 배경, 그림자 효과
- **툴바**: "편집으로 돌아가기", "다운로드", 버전 선택 드롭다운
- **트랜지션**: 편집 ↔ 프리뷰 전환 시 부드러운 애니메이션

## 🚀 구현 순서

1. **Phase 1**: Canvas 컴포넌트 파일 생성 및 기본 구조 작성
2. **Phase 2**: Store에 canvasMode 상태 추가
3. **Phase 3**: CanvasEditor 구현 (LayoutEditor 코드 이동 + UI 개선)
4. **Phase 4**: CanvasPreview 구현 (PreviewPanel 코드 이동)
5. **Phase 5**: app/page.tsx 레이아웃 변경 (3패널 → 2패널)
6. **Phase 6**: 기존 LayoutEditor, PreviewPanel 컴포넌트 제거
7. **Phase 7**: 통합 테스트 및 버그 수정

## ✅ 완료 기준

- [ ] Canvas 편집 모드에서 박스 추가/수정/삭제 가능
- [ ] HTML 생성 버튼 클릭 시 프리뷰 모드로 자동 전환
- [ ] 프리뷰 모드에서 생성된 HTML이 iframe에 표시됨
- [ ] "편집으로 돌아가기" 버튼으로 편집 모드 복귀 가능
- [ ] ChatPanel에서 수정 요청 시 Canvas 프리뷰가 업데이트됨
- [ ] 버전 관리 기능 정상 작동
- [ ] 다운로드 기능 정상 작동
- [ ] 반응형 디자인 적용 (모바일/태블릿/데스크톱)

## 📝 참고 자료

- 레이아웃 샘플: `layout_sample.png`
- 기존 LayoutEditor: `components/LayoutEditor/`
- 기존 PreviewPanel: `components/PreviewPanel/`
- Store 정의: `lib/store.ts`
