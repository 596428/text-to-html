# Text-to-HTML 프로젝트 구현 워크플로우

## 📊 프로젝트 개요

**목표:** 자연어 설명 → LLM 기반 HTML 생성 + 반복적 수정 도구

**핵심 기능:**
- 그리드 기반 레이아웃 에디터 (12컬럼, 드래그앤드롭)
- Gemini API 기반 HTML 생성
- 실시간 시각적 프리뷰
- 챗봇을 통한 자연어 수정
- 단일 HTML 파일 다운로드

**기술 스택:** Next.js 14 + TypeScript + Gemini API
**배포:** Cloudflare Tunnel → acacia.chat
**예상 기간:** 7일 (병렬 작업)

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    공통 인터페이스 계층                   │
│  (types/, lib/store.ts) - 먼저 정의, 모든 모듈이 의존    │
└─────────────────────────────────────────────────────────┘
           ↓              ↓              ↓
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Module A │   │ Module B │   │ Module C │
    │  독립    │   │  독립    │   │  독립    │
    └──────────┘   └──────────┘   └──────────┘
```

---

## 📋 작업 단위 (Workstreams)

| Phase | 작업 내용 | 우선순위 | 예상 시간 | Dependency |
|-------|----------|----------|----------|------------|
| **P0** | 프로젝트 기반 설정 + 타입/인터페이스 정의 | 🔴 CRITICAL | 4시간 | 없음 |
| **P1-A** | 레이아웃 에디터 모듈 (좌측 패널) | 🟡 HIGH | 1.5일 | P0 |
| **P1-B** | 프리뷰 패널 모듈 (중앙 패널) | 🟡 HIGH | 1일 | P0 |
| **P1-C** | 챗봇 UI 모듈 (우측 패널) | 🟡 HIGH | 1일 | P0 |
| **P2-A** | Gemini API 통합 (Backend) | 🟠 MEDIUM | 1일 | P0 |
| **P2-B** | 버전 관리 시스템 | 🟢 LOW | 0.5일 | P0, P1-B |
| **P3** | 통합 테스트 및 배포 | 🔴 CRITICAL | 1일 | All |

---

## 🎯 P0: 프로젝트 기반 설정

**담당:** Session 1 (Main)
**예상 시간:** 4시간
**Dependency:** 없음

### 1. 프로젝트 생성

```bash
npx create-next-app@latest text-to-html \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd text-to-html

npm install @google/generative-ai zustand react-rnd
npm install -D @types/node
```

### 2. 폴더 구조

```bash
mkdir -p app/api/{generate,modify}
mkdir -p components/{LayoutEditor,PreviewPanel,ChatPanel}
mkdir -p lib
mkdir -p types
```

### 3. 파일 생성

#### `types/index.ts`

```typescript
// ============ 핵심 데이터 모델 ============

export interface Box {
  id: string;
  x: number;          // 그리드 열 위치 (0-11)
  y: number;          // Y 좌표 (px)
  width: number;      // 그리드 컬럼 수 (1-12)
  height: number;     // 높이 (px)
  content: string;    // 사용자 입력 설명
}

export interface HTMLVersion {
  version: number;
  html: string;
  prompt: string;
  timestamp: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// ============ 상태 관리 인터페이스 ============

export interface AppState {
  // 레이아웃 상태
  boxes: Box[];
  selectedBoxId: string | null;

  // 레이아웃 액션
  addBox: () => void;
  updateBox: (id: string, updates: Partial<Box>) => void;
  removeBox: (id: string) => void;
  selectBox: (id: string | null) => void;
  clearBoxes: () => void;

  // HTML 버전 관리
  htmlVersions: HTMLVersion[];
  currentVersion: number;
  addVersion: (html: string, prompt: string) => void;
  goToVersion: (version: number) => void;

  // 챗봇 상태
  chatMessages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearChat: () => void;

  // UI 상태
  isGenerating: boolean;
  setGenerating: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

// ============ API 타입 ============

export interface GenerateRequest {
  boxes: Box[];
}

export interface GenerateResponse {
  html: string;
  error?: string;
}

export interface ModifyRequest {
  currentHTML: string;
  userRequest: string;
}

export interface ModifyResponse {
  html: string;
  error?: string;
}
```

#### `lib/store.ts`

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, Box, ChatMessage, HTMLVersion } from '@/types';

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // 초기 상태
        boxes: [],
        selectedBoxId: null,
        htmlVersions: [],
        currentVersion: 0,
        chatMessages: [],
        isGenerating: false,
        error: null,

        // 레이아웃 액션
        addBox: () => set((state) => {
          const newBox: Box = {
            id: `box-${Date.now()}`,
            x: 0,
            y: state.boxes.length * 250,
            width: 6,
            height: 200,
            content: ''
          };
          return { boxes: [...state.boxes, newBox] };
        }),

        updateBox: (id, updates) => set((state) => ({
          boxes: state.boxes.map(box =>
            box.id === id ? { ...box, ...updates } : box
          )
        })),

        removeBox: (id) => set((state) => ({
          boxes: state.boxes.filter(box => box.id !== id),
          selectedBoxId: state.selectedBoxId === id ? null : state.selectedBoxId
        })),

        selectBox: (id) => set({ selectedBoxId: id }),
        clearBoxes: () => set({ boxes: [], selectedBoxId: null }),

        // HTML 버전 관리
        addVersion: (html, prompt) => set((state) => {
          const newVersion: HTMLVersion = {
            version: state.htmlVersions.length + 1,
            html,
            prompt,
            timestamp: new Date()
          };
          return {
            htmlVersions: [...state.htmlVersions, newVersion],
            currentVersion: newVersion.version
          };
        }),

        goToVersion: (version) => set({ currentVersion: version }),

        // 챗봇 액션
        addMessage: (message) => set((state) => ({
          chatMessages: [...state.chatMessages, message]
        })),

        clearChat: () => set({ chatMessages: [] }),

        // UI 상태
        setGenerating: (value) => set({ isGenerating: value }),
        setError: (error) => set({ error })
      }),
      {
        name: 'text-to-html-storage',
        partialize: (state) => ({
          boxes: state.boxes,
          htmlVersions: state.htmlVersions,
          currentVersion: state.currentVersion
        })
      }
    )
  )
);
```

#### `app/page.tsx`

```typescript
'use client';

import dynamic from 'next/dynamic';

const LayoutEditor = dynamic(() => import('@/components/LayoutEditor'), { ssr: false });
const PreviewPanel = dynamic(() => import('@/components/PreviewPanel'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Text-to-HTML Generator</h1>
          <div className="text-sm opacity-90">AI-Powered Web Design</div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section className="w-[30%] border-r border-gray-300 bg-white shadow-xl">
          <LayoutEditor />
        </section>
        <section className="w-[40%] border-r border-gray-300 bg-gray-50">
          <PreviewPanel />
        </section>
        <section className="w-[30%] bg-white shadow-xl">
          <ChatPanel />
        </section>
      </main>
    </div>
  );
}
```

#### `.env.local`

```bash
GEMINI_API_KEY_1=your_primary_key_here
GEMINI_API_KEY_2=your_backup_key_here
NEXT_PUBLIC_APP_NAME="Text-to-HTML Generator"
```

#### 컴포넌트 스텁

```typescript
// components/LayoutEditor/index.tsx
export default function LayoutEditor() {
  return <div className="p-4">Layout Editor - To be implemented</div>;
}

// components/PreviewPanel/index.tsx
export default function PreviewPanel() {
  return <div className="p-4">Preview Panel - To be implemented</div>;
}

// components/ChatPanel/index.tsx
export default function ChatPanel() {
  return <div className="p-4">Chat Panel - To be implemented</div>;
}
```

### ✅ P0 완료 기준

- [ ] `npm run dev` 실행 시 3-Panel 레이아웃 표시
- [ ] Zustand 스토어 동작 확인
- [ ] 타입 정의 완료
- [ ] Git 커밋: `feat: project foundation setup`

---

## 🔷 P1-A: 레이아웃 에디터 모듈

**담당:** Session 2
**예상 시간:** 1.5일
**Dependency:** P0 완료

### 폴더 구조

```
components/LayoutEditor/
├── index.tsx
├── GridBox.tsx
├── GridGuide.tsx
└── Toolbar.tsx
```

### 구현 파일

상세 코드는 `docs/P1-A-LAYOUT-EDITOR.md` 참조

### ✅ 완료 기준

- [ ] 박스 추가/삭제
- [ ] 드래그로 위치 이동
- [ ] 리사이즈로 크기 조정
- [ ] 12컬럼 그리드 스냅
- [ ] Git 커밋: `feat: layout editor module`

---

## 🔷 P1-B: 프리뷰 패널 모듈

**담당:** Session 3
**예상 시간:** 1일
**Dependency:** P0 완료

### 폴더 구조

```
components/PreviewPanel/
├── index.tsx
├── Toolbar.tsx
├── IframePreview.tsx
└── VersionSelector.tsx
```

### 구현 파일

상세 코드는 `docs/P1-B-PREVIEW-PANEL.md` 참조

### ✅ 완료 기준

- [ ] 생성 버튼 → API 호출
- [ ] iframe 렌더링
- [ ] 버전 선택기
- [ ] 다운로드 기능
- [ ] Git 커밋: `feat: preview panel module`

---

## 🔷 P1-C: 챗봇 UI 모듈

**담당:** Session 4
**예상 시간:** 1일
**Dependency:** P0 완료

### 폴더 구조

```
components/ChatPanel/
├── index.tsx
├── MessageList.tsx
├── MessageInput.tsx
└── Message.tsx
```

### 구현 파일

상세 코드는 `docs/P1-C-CHATBOT.md` 참조

### ✅ 완료 기준

- [ ] 메시지 입력/전송
- [ ] 사용자/AI 구분 표시
- [ ] 자동 스크롤
- [ ] Enter 키 전송
- [ ] Git 커밋: `feat: chatbot UI module`

---

## 🔶 P2-A: Gemini API 통합

**담당:** Session 5
**예상 시간:** 1일
**Dependency:** P0 완료

### 구현 파일

- `lib/gemini.ts`
- `app/api/generate/route.ts`
- `app/api/modify/route.ts`

상세 코드는 `docs/P2-A-GEMINI-API.md` 참조

### ✅ 완료 기준

- [ ] `/api/generate` 동작
- [ ] `/api/modify` 동작
- [ ] API 키 순환
- [ ] Git 커밋: `feat: Gemini API integration`

---

## 🔶 P2-B: 버전 관리 시스템

**담당:** Session 6
**예상 시간:** 0.5일
**Dependency:** P0, P1-B 완료

### 구현 파일

- `components/PreviewPanel/VersionCompare.tsx` (Optional)

상세 코드는 `docs/P2-B-VERSION-MANAGEMENT.md` 참조

### ✅ 완료 기준

- [ ] 버전 히스토리 표시
- [ ] 버전 간 이동
- [ ] LocalStorage 영속화
- [ ] Git 커밋: `feat: version management enhancements`

---

## 🔷 P3: 통합 테스트 및 배포

**담당:** Session 1 (Main)
**예상 시간:** 1일
**Dependency:** All

### E2E 테스트 체크리스트

```
1. [ ] 박스 추가/삭제/이동/리사이즈
2. [ ] 박스 텍스트 입력
3. [ ] HTML 생성 → 프리뷰
4. [ ] 챗봇 수정 요청 → 반영
5. [ ] 버전 전환
6. [ ] HTML 다운로드
7. [ ] 새로고침 시 상태 유지
```

### 배포 절차

```bash
# 빌드
npm run build

# Cloudflare Tunnel
cloudflared tunnel create text-to-html
cloudflared tunnel route dns text-to-html acacia.chat
cloudflared tunnel run text-to-html
```

### ✅ 완료 기준

- [ ] 프로덕션 빌드 성공
- [ ] acacia.chat 연결
- [ ] E2E 테스트 통과
- [ ] Git 커밋: `chore: production deployment`

---

## 📊 병렬 작업 타임라인

```
Day 1-2:  [Session 1] P0 기반 설정 ████████
Day 3-4:  [Session 2] P1-A 레이아웃 에디터 ████████
          [Session 3] P1-B 프리뷰 패널 ████████
          [Session 4] P1-C 챗봇 UI ████████
Day 5-6:  [Session 5] P2-A Gemini API ████████
          [Session 6] P2-B 버전 관리 ████
Day 7:    [Session 1] P3 통합 테스트 ████████
```

---

## 🎯 세션별 할당

| Session | Phase | 파일 위치 |
|---------|-------|----------|
| Session 1 | P0, P3 | 이 문서 |
| Session 2 | P1-A | `docs/P1-A-LAYOUT-EDITOR.md` |
| Session 3 | P1-B | `docs/P1-B-PREVIEW-PANEL.md` |
| Session 4 | P1-C | `docs/P1-C-CHATBOT.md` |
| Session 5 | P2-A | `docs/P2-A-GEMINI-API.md` |
| Session 6 | P2-B | `docs/P2-B-VERSION-MANAGEMENT.md` |

---

## 📝 참고 문서

- **프로젝트 요구사항**: `/mnt/c/CodePracticeProject/TexttoHtml/README.md`
- **샘플 이미지**: `/mnt/c/CodePracticeProject/TexttoHtml/test_1015/01.png`
- **참고 HTML**: `/mnt/c/CodePracticeProject/TexttoHtml/test_1015/construction_management.html`
