# 병렬 작업 규칙 (Parallel Work Rules)

## 🎯 하이브리드 병렬 작업 전략

**핵심 원칙**: 인터페이스 동결 + 구현 분리 + 브랜치 격리

---

## 📋 작업 할당 및 파일 권한

### Session 2: P1-A (레이아웃 에디터)

**브랜치**: `feature/p1-a-layout-editor`

**허용 파일** (수정 가능):
```
✅ components/LayoutEditor/**/*
✅ components/LayoutEditor/index.tsx
✅ components/LayoutEditor/GridBox.tsx
✅ components/LayoutEditor/GridGuide.tsx
✅ components/LayoutEditor/Toolbar.tsx
```

**읽기 전용** (참조만 가능):
```
👁️ lib/store.ts
👁️ lib/constants.ts
👁️ types/index.ts
```

**금지 파일** (절대 수정 금지):
```
❌ components/PreviewPanel/**/*
❌ components/ChatPanel/**/*
❌ app/page.tsx
❌ lib/gemini.ts
```

---

### Session 3: P1-B (프리뷰 패널)

**브랜치**: `feature/p1-b-preview-panel`

**허용 파일**:
```
✅ components/PreviewPanel/**/*
✅ components/PreviewPanel/index.tsx
✅ components/PreviewPanel/Toolbar.tsx
✅ components/PreviewPanel/IframePreview.tsx
✅ components/PreviewPanel/VersionSelector.tsx
```

**읽기 전용**:
```
👁️ lib/store.ts
👁️ lib/constants.ts
👁️ types/index.ts
```

**금지 파일**:
```
❌ components/LayoutEditor/**/*
❌ components/ChatPanel/**/*
❌ app/page.tsx
```

---

### Session 4: P1-C (챗봇 UI)

**브랜치**: `feature/p1-c-chatbot`

**허용 파일**:
```
✅ components/ChatPanel/**/*
✅ components/ChatPanel/index.tsx
✅ components/ChatPanel/MessageList.tsx
✅ components/ChatPanel/MessageInput.tsx
✅ components/ChatPanel/Message.tsx
```

**읽기 전용**:
```
👁️ lib/store.ts
👁️ lib/constants.ts
👁️ types/index.ts
```

**금지 파일**:
```
❌ components/LayoutEditor/**/*
❌ components/PreviewPanel/**/*
❌ app/page.tsx
```

---

## 🔄 작업 플로우

### 1단계: 브랜치 생성 및 작업 시작

```bash
# Session 2
git checkout main
git pull origin main
git checkout -b feature/p1-a-layout-editor
# P1-A 작업...

# Session 3
git checkout main
git pull origin main
git checkout -b feature/p1-b-preview-panel
# P1-B 작업...

# Session 4
git checkout main
git pull origin main
git checkout -b feature/p1-c-chatbot
# P1-C 작업...
```

### 2단계: 작업 완료 후 푸시

```bash
# 각 세션에서
git add components/[자신의폴더]/
git commit -m "feat: P1-X 구현 완료

- 주요 기능 설명
- 구현 내용

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feature/p1-x-xxx
```

### 3단계: Session 1이 순차 병합

```bash
# Session 1 (메인 세션)
git checkout main

# 순서대로 병합 (충돌 최소화)
git merge feature/p1-a-layout-editor
git merge feature/p1-b-preview-panel
git merge feature/p1-c-chatbot

# 충돌 발생 시 해결
# 통합 테스트
npm run dev

# 푸시
git push origin main
```

---

## ⚠️ 충돌 방지 규칙

### 규칙 1: 공통 파일 수정 금지

**절대 수정하지 말 것**:
- `lib/store.ts`
- `lib/constants.ts`
- `types/index.ts`
- `app/page.tsx`

→ 필요하면 Session 1에게 요청

### 규칙 2: 자기 폴더만 수정

각 세션은 **자신의 컴포넌트 폴더 내부만** 수정:
- Session 2: `components/LayoutEditor/` 만
- Session 3: `components/PreviewPanel/` 만
- Session 4: `components/ChatPanel/` 만

### 규칙 3: 커밋 전 확인

```bash
# 커밋 전 반드시 확인
git status

# 허용된 파일만 변경되었는지 체크
# 예: Session 2는 LayoutEditor/* 만 있어야 함
```

---

## 🔧 예외 상황 처리

### 상황 1: 공통 파일 수정 필요

**잘못된 방법**:
```bash
# ❌ 직접 lib/store.ts 수정
```

**올바른 방법**:
```bash
# ✅ Session 1에게 요청
"Session 1에게: lib/store.ts에 XXX 액션 추가 필요합니다"
```

### 상황 2: 다른 컴포넌트 참조 필요

**잘못된 방법**:
```bash
# ❌ PreviewPanel 코드 복사
```

**올바른 방법**:
```typescript
// ✅ 공통 훅/유틸 사용 (lib/에 이미 있음)
import { useStore } from '@/lib/store';
```

### 상황 3: 충돌 발생

```bash
# Session 1이 병합 중 충돌 발생 시

# 1. 충돌 파일 확인
git status

# 2. 수동 해결
nano [충돌파일]

# 3. 해결 후 마크
git add [충돌파일]
git commit -m "chore: merge conflict resolved"
```

---

## 📊 진행 상황 추적

### 각 세션의 완료 체크리스트

**Session 2 (P1-A):**
- [ ] GridBox.tsx 완성
- [ ] GridGuide.tsx 완성
- [ ] Toolbar.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

**Session 3 (P1-B):**
- [ ] Toolbar.tsx 완성
- [ ] IframePreview.tsx 완성
- [ ] VersionSelector.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

**Session 4 (P1-C):**
- [ ] Message.tsx 완성
- [ ] MessageList.tsx 완성
- [ ] MessageInput.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

---

## 🚨 비상 상황

### 문제: 브랜치가 main과 너무 멀어짐

```bash
# main의 최신 변경사항 가져오기
git checkout feature/p1-a-layout-editor
git merge main

# 충돌 해결 후
git push origin feature/p1-a-layout-editor
```

### 문제: 실수로 다른 폴더 수정

```bash
# 변경 취소
git checkout -- components/PreviewPanel/

# 또는 특정 파일만
git checkout -- components/PreviewPanel/index.tsx
```

---

## ✅ 최종 체크리스트 (Session 1)

통합 전 확인사항:

- [ ] 모든 브랜치가 푸시되었는지 확인
- [ ] main 브랜치 최신화
- [ ] P1-A 브랜치 병합
- [ ] P1-B 브랜치 병합 (충돌 해결)
- [ ] P1-C 브랜치 병합 (충돌 해결)
- [ ] `npm run dev` 실행 확인
- [ ] 3-Panel 모두 동작 확인
- [ ] GitHub에 푸시
- [ ] 브랜치 삭제 (선택)

---

## 📚 참고 자료

- 브랜치 전략: `docs/GITHUB-GUIDE.md`
- 각 Phase 가이드: `docs/P1-A-LAYOUT-EDITOR.md` 등
- 전체 워크플로우: `WORKFLOW.md`
