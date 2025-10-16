# 세션별 브랜치 가이드

## 📌 브랜치 생성 완료

모든 병렬 작업용 브랜치가 생성되어 GitHub에 푸시되었습니다.

```bash
✅ feature/p1-a-layout-editor
✅ feature/p1-b-preview-panel
✅ feature/p1-c-chatbot
```

---

## 🎯 세션별 브랜치 할당

### Session 1 (메인 세션) - 현재 세션
**브랜치**: `main`

**역할**:
- 병렬 브랜치 병합 담당
- P2, P3 순차 작업 진행
- 최종 통합 및 배포

**작업 내용**:
- ✅ P0 완료 (프로젝트 기반 설정)
- ⏳ P1 3개 브랜치 병합 대기
- ⏳ P2-A: Gemini API 통합
- ⏳ P2-B: 버전 관리 시스템
- ⏳ P3: 통합 테스트 및 배포

---

### Session 2 (하위 세션)
**브랜치**: `feature/p1-a-layout-editor`

**담당 작업**: P1-A - 레이아웃 에디터 모듈 (좌측 패널)

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

**시작 방법**:
```bash
# 1. 저장소 클론 (새 터미널)
cd /mnt/c/CodePracticeProject/TexttoHtml
git clone https://github.com/596428/text-to-html.git session-2-layout
cd session-2-layout

# 2. 브랜치 체크아웃
git checkout feature/p1-a-layout-editor

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행
npm run dev

# 5. P1-A 작업 시작
# docs/P1-A-LAYOUT-EDITOR.md 참조
```

**완료 후**:
```bash
git add components/LayoutEditor/
git commit -m "feat: implement P1-A layout editor

- GridBox component with drag & resize
- GridGuide for 12-column grid
- Toolbar for add/remove boxes

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feature/p1-a-layout-editor
```

---

### Session 3 (하위 세션)
**브랜치**: `feature/p1-b-preview-panel`

**담당 작업**: P1-B - 프리뷰 패널 모듈 (중앙 패널)

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

**시작 방법**:
```bash
# 1. 저장소 클론 (새 터미널)
cd /mnt/c/CodePracticeProject/TexttoHtml
git clone https://github.com/596428/text-to-html.git session-3-preview
cd session-3-preview

# 2. 브랜치 체크아웃
git checkout feature/p1-b-preview-panel

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행 (포트 변경)
PORT=3001 npm run dev

# 5. P1-B 작업 시작
# WORKFLOW.md의 P1-B 섹션 참조
```

**완료 후**:
```bash
git add components/PreviewPanel/
git commit -m "feat: implement P1-B preview panel

- IframePreview for HTML rendering
- VersionSelector for history navigation
- Toolbar for controls

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feature/p1-b-preview-panel
```

---

### Session 4 (하위 세션)
**브랜ch**: `feature/p1-c-chatbot`

**담당 작업**: P1-C - 챗봇 UI 모듈 (우측 패널)

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

**시작 방법**:
```bash
# 1. 저장소 클론 (새 터미널)
cd /mnt/c/CodePracticeProject/TexttoHtml
git clone https://github.com/596428/text-to-html.git session-4-chatbot
cd session-4-chatbot

# 2. 브랜치 체크아웃
git checkout feature/p1-c-chatbot

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행 (포트 변경)
PORT=3002 npm run dev

# 5. P1-C 작업 시작
# WORKFLOW.md의 P1-C 섹션 참조
```

**완료 후**:
```bash
git add components/ChatPanel/
git commit -m "feat: implement P1-C chatbot UI

- Message component for chat bubbles
- MessageList for conversation display
- MessageInput for user input

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feature/p1-c-chatbot
```

---

## 🔄 병합 프로세스 (Session 1 담당)

모든 하위 세션이 작업 완료 후:

```bash
# Session 1에서 실행
git checkout main
git pull origin main

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

## ⚠️ 중요 규칙

### 1. 자기 폴더만 수정
각 세션은 **자신의 컴포넌트 폴더 내부만** 수정:
- Session 2: `components/LayoutEditor/` 만
- Session 3: `components/PreviewPanel/` 만
- Session 4: `components/ChatPanel/` 만

### 2. 공통 파일 수정 금지
**절대 수정하지 말 것**:
- `lib/store.ts`
- `lib/constants.ts`
- `types/index.ts`
- `app/page.tsx`

→ 필요하면 Session 1에게 요청

### 3. 커밋 전 확인
```bash
# 커밋 전 반드시 확인
git status

# 허용된 파일만 변경되었는지 체크
# 예: Session 2는 LayoutEditor/* 만 있어야 함
```

---

## 📊 진행 상황 체크리스트

### Session 2 (P1-A)
- [ ] GridBox.tsx 완성
- [ ] GridGuide.tsx 완성
- [ ] Toolbar.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

### Session 3 (P1-B)
- [ ] Toolbar.tsx 완성
- [ ] IframePreview.tsx 완성
- [ ] VersionSelector.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

### Session 4 (P1-C)
- [ ] Message.tsx 완성
- [ ] MessageList.tsx 완성
- [ ] MessageInput.tsx 완성
- [ ] index.tsx 통합
- [ ] 로컬 테스트 완료
- [ ] 브랜치 푸시 완료

---

## 🚨 문제 발생 시

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

## 📚 참고 문서

- **병렬 작업 규칙**: `docs/PARALLEL-WORK-RULES.md`
- **전체 워크플로우**: `WORKFLOW.md`
- **GitHub 사용법**: `docs/GITHUB-GUIDE.md`
- **API 키 설정**: `docs/API-KEYS-GUIDE.md`
- **P1-A 가이드**: `docs/P1-A-LAYOUT-EDITOR.md`
- **P2-A 가이드**: `docs/P2-A-GEMINI-API.md`

---

## ✅ 현재 상태

```
Repository: https://github.com/596428/text-to-html

Branches:
├─ main (Session 1)                           ✅ P0 완료
├─ feature/p1-a-layout-editor (Session 2)     ⏳ 작업 대기
├─ feature/p1-b-preview-panel (Session 3)     ⏳ 작업 대기
└─ feature/p1-c-chatbot (Session 4)           ⏳ 작업 대기
```

**병렬 작업 시작 가능!** 🚀
