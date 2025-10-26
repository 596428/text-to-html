# 세션 할당 가이드

**목적**: 각 개발 세션이 빠르게 작업을 시작할 수 있도록 명령어와 파일 소유권 제공

---

## 세션 시작 템플릿

각 세션은 다음 패턴으로 시작:

```bash
# 1. 최신 코드 가져오기
git checkout main
git pull origin main

# 2. 브랜치 생성
git checkout -b [BRANCH_NAME]

# 3. 의존성 설치 (필요시)
npm install

# 4. 개발 서버 시작 (필요시)
npm run dev

# 5. 작업 시작
# [파일 생성/수정]
```

---

## Phase 0: 데이터 모델 확장

### Session A (Master)

```bash
# 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/phase-0-data-model

# 작업할 파일
touch types/index.ts.new  # 기존 파일 확장
touch lib/store.ts.new     # 기존 파일 확장
mkdir -p tests/unit
touch tests/unit/types.test.ts

# 개발 시작
code types/index.ts
```

**소유 파일**:
- ✅ `types/index.ts` - 읽기/쓰기
- ✅ `lib/store.ts` - 읽기/쓰기
- ✅ `tests/unit/types.test.ts` - 읽기/쓰기

**작업 완료 후**:
```bash
# 테스트
npm test

# 커밋
git add .
git commit -m "feat: extend data model with LayoutType, ChildElement, TableStructure"

# Push 및 main 머지 (Phase 0는 즉시 머지)
git push origin feature/phase-0-data-model
git checkout main
git merge feature/phase-0-data-model
git push origin main
```

---

## Phase 1: Flex 레이아웃 에디터

### Session A: FlexLayoutEditor

```bash
# 최신 main 기반 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/phase-1-flex-editor
git checkout -b feature/phase-1a-flex-layout

# 작업할 파일
mkdir -p components/Canvas
touch components/Canvas/FlexLayoutEditor.tsx

code components/Canvas/FlexLayoutEditor.tsx
```

**소유 파일**:
- ✅ `components/Canvas/FlexLayoutEditor.tsx` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ `types/index.ts` - Phase 0에서 생성됨
- 👁️ `lib/store.ts` - Phase 0에서 생성됨

**작업 완료 후**:
```bash
# 로컬 테스트
npm run dev
# 브라우저에서 Flex 레이아웃 테스트

# 커밋 및 PR
git add .
git commit -m "feat(phase-1): add FlexLayoutEditor component"
git push origin feature/phase-1a-flex-layout

# PR 생성 (GitHub CLI 사용)
gh pr create --base feature/phase-1-flex-editor \
  --title "Phase 1A: FlexLayoutEditor" \
  --body "Implements Flex layout editor with drag & drop support"
```

### Session B: ChildElementEditor

```bash
# 최신 main 기반 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/phase-1-flex-editor
git checkout -b feature/phase-1b-child-editor

# 작업할 파일
mkdir -p components/Canvas
touch components/Canvas/ChildElementEditor.tsx

code components/Canvas/ChildElementEditor.tsx
```

**소유 파일**:
- ✅ `components/Canvas/ChildElementEditor.tsx` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ `types/index.ts`

**작업 완료 후**:
```bash
git add .
git commit -m "feat(phase-1): add ChildElementEditor component"
git push origin feature/phase-1b-child-editor

gh pr create --base feature/phase-1-flex-editor \
  --title "Phase 1B: ChildElementEditor" \
  --body "Implements child element editing UI for Flex layout"
```

### Session C: DraggableItem

```bash
# 최신 main 기반 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/phase-1-flex-editor
git checkout -b feature/phase-1c-draggable

# 작업할 파일
mkdir -p components/shared
touch components/shared/DraggableItem.tsx

code components/shared/DraggableItem.tsx
```

**소유 파일**:
- ✅ `components/shared/DraggableItem.tsx` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 없음 (독립적 컴포넌트)

**작업 완료 후**:
```bash
git add .
git commit -m "feat(phase-1): add DraggableItem component with react-dnd"
git push origin feature/phase-1c-draggable

gh pr create --base feature/phase-1-flex-editor \
  --title "Phase 1C: DraggableItem" \
  --body "Implements drag & drop functionality with react-dnd"
```

---

## Phase 1 통합 (Session A - Master)

```bash
# 통합 브랜치로 이동
git checkout feature/phase-1-flex-editor

# 하위 브랜치 머지
git merge feature/phase-1a-flex-layout
git merge feature/phase-1b-child-editor
git merge feature/phase-1c-draggable

# 충돌 해결 (있다면)
# ... 충돌 해결 ...

# 통합 테스트
npm run dev
# 브라우저에서 전체 기능 테스트

# Gemini 프롬프트 업데이트
code lib/gemini.ts

# 커밋 및 main 머지
git add .
git commit -m "feat(phase-1): integrate Flex layout editor"
git push origin feature/phase-1-flex-editor

# main으로 머지
git checkout main
git merge feature/phase-1-flex-editor
git push origin main

# 정리
git branch -d feature/phase-1a-flex-layout
git branch -d feature/phase-1b-child-editor
git branch -d feature/phase-1c-draggable
git branch -d feature/phase-1-flex-editor
```

---

## Phase 2: Table Builder

### Session A: TableBuilder

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-2-table-builder
git checkout -b feature/phase-2a-table-ui

mkdir -p components/Canvas
touch components/Canvas/TableBuilder.tsx

code components/Canvas/TableBuilder.tsx
```

**소유 파일**:
- ✅ `components/Canvas/TableBuilder.tsx` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ `types/index.ts`
- 👁️ `components/shared/TableCellMerger.tsx` (Session B 작업 완료 후)

### Session B: TableCellMerger

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-2-table-builder
git checkout -b feature/phase-2b-cell-merger

mkdir -p components/shared
touch components/shared/TableCellMerger.tsx
mkdir -p tests/unit
touch tests/unit/table-merger.test.ts

code components/shared/TableCellMerger.tsx
```

**소유 파일**:
- ✅ `components/shared/TableCellMerger.tsx` - 읽기/쓰기
- ✅ `tests/unit/table-merger.test.ts` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ `types/index.ts`

---

## Phase 3: UX 개선

### Session A: SizeController

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-3-ux
git checkout -b feature/phase-3a-size-control

mkdir -p components/Canvas
touch components/Canvas/SizeController.tsx

code components/Canvas/SizeController.tsx
```

**소유 파일**:
- ✅ `components/Canvas/SizeController.tsx` - 읽기/쓰기

### Session B: BoxProperties 리팩토링

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-3-ux
git checkout -b feature/phase-3b-properties

code components/Sidebar/BoxProperties.tsx
```

**소유 파일**:
- ✅ `components/Sidebar/BoxProperties.tsx` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ `components/Canvas/FlexLayoutEditor.tsx` (Phase 1)
- 👁️ `components/Canvas/TableBuilder.tsx` (Phase 2)
- 👁️ `components/Canvas/SizeController.tsx` (Session A 작업 완료 후)

---

## Phase 4: 성능 및 안정성

### Session B

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-4-performance

# 작업할 파일
touch lib/complexity.ts
code lib/gemini.ts  # 기존 파일 수정
code app/api/generate/route.ts  # 기존 파일 수정
code app/api/modify/route.ts  # 기존 파일 수정
```

**소유 파일** (Phase 4에서):
- ✅ `lib/gemini.ts` - 읽기/쓰기 (프롬프트 최적화)
- ✅ `app/api/generate/route.ts` - 읽기/쓰기 (에러 핸들링)
- ✅ `app/api/modify/route.ts` - 읽기/쓰기 (에러 핸들링)
- ✅ `lib/complexity.ts` - 읽기/쓰기 (신규)

**주의**: Phase 1-3에서는 Session A가 `lib/gemini.ts` 소유

---

## Phase 5: 테스팅

### Session C

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-5-testing

# 테스트 파일 생성
mkdir -p tests/unit tests/integration tests/e2e

touch tests/unit/types.test.ts
touch tests/unit/table-merger.test.ts
touch tests/unit/complexity.test.ts
touch tests/integration/flex-layout.test.tsx
touch tests/integration/table-builder.test.tsx
touch tests/integration/api.test.ts
touch tests/e2e/user-workflow.spec.ts

code tests/
```

**소유 파일**:
- ✅ `tests/unit/*.test.ts` - 읽기/쓰기
- ✅ `tests/integration/*.test.tsx` - 읽기/쓰기
- ✅ `tests/e2e/*.spec.ts` - 읽기/쓰기

**의존 파일** (읽기 전용):
- 👁️ 모든 컴포넌트 파일 (테스트 대상)

---

## Phase 6: Docker 배포

### Session A (Master)

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-6-docker

# Docker 관련 파일 생성
touch Dockerfile
touch docker-compose.yml
touch .dockerignore
touch .env.example

mkdir -p scripts
touch scripts/docker-local-test.sh
touch scripts/deploy-production.sh
touch scripts/rollback.sh
touch scripts/monitor.sh

# API 헬스체크
mkdir -p app/api/health
touch app/api/health/route.ts

code Dockerfile
```

**소유 파일**:
- ✅ `Dockerfile` - 읽기/쓰기
- ✅ `docker-compose.yml` - 읽기/쓰기
- ✅ `.dockerignore` - 읽기/쓰기
- ✅ `.env.example` - 읽기/쓰기
- ✅ `scripts/*.sh` - 읽기/쓰기
- ✅ `app/api/health/route.ts` - 읽기/쓰기
- ✅ `next.config.js` - 읽기/쓰기 (standalone 모드 추가)

**작업 완료 후**:
```bash
# Docker 이미지 빌드 테스트
./scripts/docker-local-test.sh

# 커밋 및 머지
git add .
git commit -m "feat(phase-6): add Docker deployment configuration"
git push origin feature/phase-6-docker

git checkout main
git merge feature/phase-6-docker
git push origin main
```

---

## 빠른 참조 테이블

### 파일 소유권 요약

| 파일 | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|------|---------|---------|---------|---------|---------|---------|---------|
| `types/index.ts` | A✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `lib/store.ts` | A✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `lib/gemini.ts` | - | A✅ | A✅ | A✅ | B✅ | 👁️ | 👁️ |
| `FlexLayoutEditor.tsx` | - | A✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `ChildElementEditor.tsx` | - | B✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `DraggableItem.tsx` | - | C✅ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |
| `TableBuilder.tsx` | - | - | A✅ | 👁️ | 👁️ | 👁️ | 👁️ |
| `TableCellMerger.tsx` | - | - | B✅ | 👁️ | 👁️ | 👁️ | 👁️ |
| `SizeController.tsx` | - | - | - | A✅ | 👁️ | 👁️ | 👁️ |
| `BoxProperties.tsx` | - | - | - | B✅ | 👁️ | 👁️ | 👁️ |
| `lib/complexity.ts` | - | - | - | - | B✅ | 👁️ | 👁️ |
| `tests/**/*.test.*` | A✅ | - | B✅ | - | - | C✅ | 👁️ |
| `Dockerfile` | - | - | - | - | - | - | A✅ |

**범례**:
- A/B/C✅: Session A/B/C가 소유 (읽기/쓰기)
- 👁️: 읽기 전용

---

## 트러블슈팅

### 문제: "브랜치가 이미 존재합니다"

```bash
# 기존 브랜치 삭제
git branch -D feature/phase-X-name

# 다시 생성
git checkout -b feature/phase-X-name
```

### 문제: "의존 파일이 없습니다"

```bash
# main 브랜치에서 최신 코드 가져오기
git checkout main
git pull origin main

# 다시 브랜치 생성
git checkout -b feature/phase-X-name
```

### 문제: "머지 충돌 발생"

```bash
# 충돌 파일 확인
git status

# 수동으로 충돌 해결
code [충돌 파일]

# 해결 후 커밋
git add .
git commit -m "fix: resolve merge conflicts"
```

---

**생성일**: 2025-10-26
**담당자**: Master (Session A)
**상태**: ✅ 활성
