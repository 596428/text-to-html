# 병렬 작업 전략

**목표**: 개발 기간을 31일 → 17일로 단축 (45% 절감)
**전략**: 최대 3개 세션 동시 작업, 파일 소유권 기반 충돌 방지

---

## 병렬 작업 원칙

### 1. 파일 소유권 (File Ownership)

각 세션은 자신이 생성한 파일만 수정 가능:

```yaml
소유권 규칙:
  ✅ ALLOWED: 본인이 생성한 파일 읽기/쓰기
  👁️ READ-ONLY: 다른 세션이 생성한 파일은 읽기만
  ❌ FORBIDDEN: 다른 세션 파일 수정 절대 금지

예외:
  - 통합 세션(Master)은 모든 파일 접근 가능
  - Phase 통합 시점에만 머지 허용
```

### 2. 브랜치 격리 (Branch Isolation)

각 세션은 독립된 브랜치에서 작업:

```
main
├─ feature/phase-1-flex-editor (통합 브랜치, Session A 소유)
│   ├─ feature/phase-1a-flex-layout (Session A)
│   ├─ feature/phase-1b-child-editor (Session B)
│   └─ feature/phase-1c-draggable (Session C)
├─ feature/phase-2-table-builder
│   ├─ feature/phase-2a-table-ui (Session A)
│   └─ feature/phase-2b-cell-merger (Session B)
...
```

### 3. 동기화 포인트 (Sync Points)

각 Phase 완료 후 통합:

```
Phase N 시작 → 병렬 작업 → Phase N 완료 → 통합 테스트 → 머지 → Phase N+1 시작
     ↓             ↓               ↓            ↓          ↓
  브랜치 생성    독립 작업    하위 브랜치 PR    검증     main 머지
```

---

## 세션별 할당

### Week 1: Phase 0 + Phase 1 시작

```yaml
Day 1:
  Session A (Master):
    branch: feature/phase-0-data-model
    files:
      - types/index.ts (✅ WRITE)
      - lib/store.ts (✅ WRITE)
      - tests/unit/types.test.ts (✅ WRITE)
    tasks:
      - 데이터 모델 확장
      - 마이그레이션 로직
      - 단위 테스트 작성

Day 2:
  Session A:
    branch: feature/phase-0-data-model
    tasks:
      - Phase 0 통합 테스트
      - Phase 1 준비 (통합 브랜치 생성)
      - Phase 0 → main 머지

Day 3-5:
  Session A:
    branch: feature/phase-1a-flex-layout
    files:
      - components/Canvas/FlexLayoutEditor.tsx (✅ WRITE)
    dependencies:
      - types/index.ts (👁️ READ-ONLY - Phase 0에서 생성)

  Session B:
    branch: feature/phase-1b-child-editor
    files:
      - components/Canvas/ChildElementEditor.tsx (✅ WRITE)
    dependencies:
      - types/index.ts (👁️ READ-ONLY)

  Session C:
    branch: feature/phase-1c-draggable
    files:
      - components/shared/DraggableItem.tsx (✅ WRITE)
    dependencies:
      - None (독립적)
```

### Week 2: Phase 1 통합 + Phase 2/3 시작

```yaml
Day 6-7:
  Session A (Master):
    branch: feature/phase-1-flex-editor
    tasks:
      - Phase 1a, 1b, 1c 머지
      - 통합 테스트
      - Gemini 프롬프트 업데이트
      - Phase 1 → main 머지

Day 8-10:
  Session A:
    branch: feature/phase-2a-table-ui
    files:
      - components/Canvas/TableBuilder.tsx (✅ WRITE)

  Session B:
    branch: feature/phase-2b-cell-merger
    files:
      - components/shared/TableCellMerger.tsx (✅ WRITE)
      - tests/unit/table-merger.test.ts (✅ WRITE)

  Session D (신규):
    branch: feature/phase-3a-size-control
    files:
      - components/Canvas/SizeController.tsx (✅ WRITE)
    note: Phase 2와 독립적이므로 병렬 진행 가능
```

### Week 3: Phase 2/3 통합 + Phase 4/5

```yaml
Day 11-12:
  Session A (Master):
    branch: feature/phase-2-table-builder
    tasks:
      - Phase 2a, 2b 머지
      - 통합 테스트
      - Phase 2 → main 머지

  Session D:
    branch: feature/phase-3b-properties
    files:
      - components/Sidebar/BoxProperties.tsx (✅ WRITE)

Day 13-15:
  Session A:
    branch: feature/phase-3-ux
    tasks:
      - Phase 3a, 3b 머지
      - 통합 테스트
      - Phase 3 → main 머지

  Session B:
    branch: feature/phase-4-performance
    files:
      - lib/gemini.ts (✅ WRITE - 프롬프트 업데이트)
      - app/api/generate/route.ts (✅ WRITE - 에러 핸들링)
      - lib/complexity.ts (✅ WRITE)

  Session C:
    branch: feature/phase-5-testing
    files:
      - tests/unit/*.test.ts (✅ WRITE)
      - tests/integration/*.test.tsx (✅ WRITE)
      - tests/e2e/*.spec.ts (✅ WRITE)
```

### Week 4: Phase 4/5/6 통합

```yaml
Day 16:
  Session A (Master):
    branch: main
    tasks:
      - Phase 4 머지 및 검증
      - Phase 5 통합 테스트 실행
      - 모든 테스트 통과 확인

Day 17:
  Session A (Master):
    branch: feature/phase-6-docker
    files:
      - Dockerfile (✅ WRITE)
      - docker-compose.yml (✅ WRITE)
      - scripts/*.sh (✅ WRITE)
      - next.config.js (✅ WRITE)
    tasks:
      - Docker 설정
      - 배포 스크립트
      - 최종 검증
```

---

## 충돌 방지 규칙

### 공유 파일 접근

특정 파일은 여러 세션이 읽어야 하지만 수정은 한 세션만:

```yaml
types/index.ts:
  owner: Session A (Phase 0)
  readers: [Session B, Session C, Session D]
  rule: Phase 0 완료 후에는 읽기 전용

lib/store.ts:
  owner: Session A (Phase 0)
  readers: [All sessions]
  rule: Phase 0 완료 후에는 읽기 전용

lib/gemini.ts:
  owner: Session A (초기), Session B (Phase 4)
  rule:
    - Phase 1-3: Session A만 수정 (프롬프트 업데이트)
    - Phase 4: Session B에게 소유권 이전
```

### 머지 프로토콜

```yaml
하위 브랜치 → 통합 브랜치:
  담당: 각 세션
  시점: 작업 완료 후
  검증:
    - 로컬 테스트 통과
    - ESLint/TypeScript 에러 없음
    - PR 생성 및 자체 리뷰

통합 브랜치 → main:
  담당: Session A (Master)
  시점: Phase 완료 후
  검증:
    - 통합 테스트 통과
    - 기존 기능 회귀 없음
    - 문서 업데이트 완료
```

---

## 커뮤니케이션 규칙

### 1. 작업 시작 시

```markdown
## Session B 시작

**브랜치**: feature/phase-1b-child-editor
**파일**: components/Canvas/ChildElementEditor.tsx
**의존성**: types/index.ts (읽기 전용)
**예상 완료**: Day 5

Session A, C: ChildElementEditor.tsx는 제가 소유합니다.
```

### 2. 의존성 변경 시

```markdown
## Session A 알림

**변경 사항**: types/index.ts에 `ChildElementType` 추가
**영향 받는 세션**: Session B, Session C
**조치**: 브랜치 rebase 필요

Session B, C: types/index.ts 업데이트되었습니다. rebase 해주세요.
```

### 3. 통합 준비 시

```markdown
## Session A 통합 요청

**Phase**: 1
**하위 브랜치**: phase-1a, phase-1b, phase-1c
**통합 브랜치**: feature/phase-1-flex-editor

Session B, C: PR 생성 완료했나요? 제가 통합 시작하겠습니다.
```

---

## 타임라인 최적화

### 병렬 작업 효율

```yaml
순차 개발 (31일):
  Phase 0: 1일
  Phase 1: 5일
  Phase 2: 4일
  Phase 3: 3일
  Phase 4: 2일
  Phase 5: 2일
  Phase 6: 1일
  통합/버퍼: 13일
  Total: 31일

병렬 개발 (17일):
  Week 1: Phase 0 (1일) + Phase 1 병렬 (4일) = 5일
  Week 2: Phase 1 통합 (1일) + Phase 2/3 병렬 (4일) = 5일
  Week 3: Phase 2/3 통합 (1일) + Phase 4/5 병렬 (4일) = 5일
  Week 4: Phase 4/5/6 통합 (2일) = 2일
  Total: 17일 (45% 단축)

절감 효과:
  - Phase 1: 5일 → 4일 (3개 세션 병렬)
  - Phase 2+3 시작: 4일 → 4일 (2개 세션 병렬, 겹침)
  - Phase 4+5: 4일 → 4일 (2개 세션 병렬)
  - 통합/버퍼: 13일 → 5일 (효율적 통합)
```

---

## 리스크 관리

### 병렬 작업 리스크

```yaml
리스크 1: "머지 충돌"
  원인: 파일 소유권 규칙 위반
  대응: 엄격한 파일 소유권 테이블 준수
  검증: PR 시 변경 파일 목록 체크

리스크 2: "의존성 변경 전파 지연"
  원인: Session A가 types 변경 후 알림 누락
  대응: 의존성 변경 시 즉시 알림 프로토콜
  검증: 자동화된 의존성 그래프 (선택사항)

리스크 3: "통합 시점 지연"
  원인: 하위 브랜치 작업 완료 시점 불일치
  대응: Daily standup으로 진행 상황 공유
  검증: Phase별 deadline 엄수

리스크 4: "테스트 실패"
  원인: 통합 후 예상치 못한 상호작용
  대응: 각 세션이 로컬 테스트 철저히 수행
  검증: CI/CD 자동 테스트 (선택사항)
```

---

## 성공 지표

### 병렬 작업 KPI

```yaml
효율성:
  - 병렬 작업 시간 비율: >60%
  - 대기 시간: <10%
  - 통합 시간: <30%

품질:
  - 머지 충돌 발생률: <5%
  - 통합 후 버그 발견: <3건/Phase
  - 테스트 통과율: >95%

일정:
  - Phase별 deadline 준수: 100%
  - 전체 프로젝트 완료: 17일 이내
  - 예상 외 지연: <2일
```

---

## 체크리스트

### 병렬 작업 시작 전

```markdown
- [ ] 모든 세션이 브랜치 전략 이해
- [ ] 파일 소유권 테이블 공유
- [ ] 의존성 그래프 작성
- [ ] 커뮤니케이션 채널 설정
- [ ] Phase별 deadline 합의

### Phase 시작 시

- [ ] 브랜치 생성 및 checkout
- [ ] 의존성 파일 최신 버전 확인
- [ ] 작업 시작 알림
- [ ] 로컬 테스트 환경 확인

### Phase 완료 시

- [ ] 로컬 테스트 통과
- [ ] ESLint/TypeScript 에러 해결
- [ ] PR 생성
- [ ] 통합 세션에 알림
- [ ] 코드 리뷰 대기

### 통합 시

- [ ] 모든 하위 브랜치 PR 확인
- [ ] 충돌 해결
- [ ] 통합 테스트 실행
- [ ] 문서 업데이트
- [ ] main 브랜치 머지
```

---

**생성일**: 2025-10-26
**담당자**: Master (Session A)
**상태**: ✅ 활성
