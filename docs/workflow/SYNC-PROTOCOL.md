# 동기화 프로토콜

**목적**: Phase 간 통합 시 체계적인 머지와 검증으로 품질 보장

---

## 동기화 포인트

```
Phase N 완료 → 동기화 → Phase N+1 시작
     ↓            ↓           ↓
  작업 완료    검증/머지    새 작업
```

### 동기화 시점

1. **Phase 완료 후** (필수)
2. **주요 의존성 변경 시** (선택적)
3. **긴급 버그 수정 시** (긴급)

---

## Phase 통합 프로토콜

### Step 1: 사전 검증 (각 세션)

**체크리스트**:
```markdown
- [ ] 로컬 테스트 통과 (npm test)
- [ ] 타입 체크 통과 (npm run type-check)
- [ ] Lint 에러 없음 (npm run lint)
- [ ] 빌드 성공 (npm run build)
- [ ] 브라우저 수동 테스트 완료
- [ ] 커밋 메시지 명확
- [ ] PR 생성 및 자체 리뷰
```

**명령어**:
```bash
# 사전 검증 실행
npm test
npm run type-check
npm run lint
npm run build

# 모두 통과하면 PR 생성
git push origin [BRANCH_NAME]
gh pr create --base [INTEGRATION_BRANCH] \
  --title "Phase X: [Component Name]" \
  --body "$(cat <<EOF
## 구현 내용
- [주요 기능 1]
- [주요 기능 2]

## 테스트 결과
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트 완료

## 스크린샷
[필요시 추가]

## 의존성
- types/index.ts (읽기 전용)
EOF
)"
```

---

### Step 2: 통합 (Session A - Master)

**통합 순서**:
```
1. 통합 브랜치로 checkout
2. 각 하위 브랜치 순차적 머지
3. 충돌 해결
4. 통합 테스트 실행
5. 문서 업데이트
6. main 브랜치 머지
```

**명령어**:
```bash
# 1. 통합 브랜치로 이동
git checkout feature/phase-X-integration

# 2. 하위 브랜치 머지 (순서대로)
git merge feature/phase-Xa-component1
# 충돌 해결 (있다면)
git merge feature/phase-Xb-component2
# 충돌 해결 (있다면)
git merge feature/phase-Xc-component3
# 충돌 해결 (있다면)

# 3. 통합 테스트
npm install
npm test
npm run build

# 4. 개발 서버로 수동 테스트
npm run dev
# 브라우저에서 전체 기능 테스트

# 5. 추가 작업 (Gemini 프롬프트 업데이트 등)
code lib/gemini.ts
# ... 수정 ...

# 6. 통합 커밋
git add .
git commit -m "feat(phase-X): integrate [Phase Name]

- Merged phase-Xa: [component1]
- Merged phase-Xb: [component2]
- Merged phase-Xc: [component3]
- Updated Gemini prompts
- All tests passing"

# 7. main 브랜치 머지
git checkout main
git merge feature/phase-X-integration
git push origin main

# 8. 정리
git branch -d feature/phase-Xa-component1
git branch -d feature/phase-Xb-component2
git branch -d feature/phase-Xc-component3
git branch -d feature/phase-X-integration
```

---

### Step 3: 검증 (모든 세션)

**검증 항목**:
```markdown
- [ ] main 브랜치에서 빌드 성공
- [ ] 모든 기존 기능 정상 작동
- [ ] 새로운 기능 정상 작동
- [ ] 성능 저하 없음
- [ ] 문서 업데이트 완료
```

**명령어**:
```bash
# main 브랜치로 이동
git checkout main
git pull origin main

# 검증
npm install
npm test
npm run build
npm run dev

# 브라우저에서 회귀 테스트
# 1. 기존 Simple 레이아웃 테스트
# 2. 새로운 Flex 레이아웃 테스트
# 3. HTML 생성 테스트
```

---

## 충돌 해결 프로토콜

### 자동 머지 가능한 경우

```bash
# Git이 자동으로 머지
git merge feature/phase-Xb-component
# Auto-merging ...
# Merge made by the 'recursive' strategy.
```

### 충돌 발생 시

```bash
# 충돌 발생
git merge feature/phase-Xb-component
# CONFLICT (content): Merge conflict in components/Sidebar/BoxProperties.tsx
# Automatic merge failed; fix conflicts and then commit the result.

# 1. 충돌 파일 확인
git status
# Unmerged paths:
#   both modified:   components/Sidebar/BoxProperties.tsx

# 2. 충돌 해결
code components/Sidebar/BoxProperties.tsx

# 파일 내용:
# <<<<<<< HEAD
# [현재 브랜치 코드]
# =======
# [머지하려는 브랜치 코드]
# >>>>>>> feature/phase-Xb-component

# 3. 수동으로 올바른 코드 선택 또는 조합
# (예: 두 브랜치의 변경사항을 모두 포함하도록 수정)

# 4. 충돌 마커 제거 후 저장

# 5. 해결 완료 표시
git add components/Sidebar/BoxProperties.tsx

# 6. 머지 커밋
git commit -m "fix: resolve merge conflict in BoxProperties.tsx"
```

### 충돌 방지 전략

```yaml
예방책:
  - 파일 소유권 엄수: 다른 세션 파일 수정 금지
  - 공유 파일 조율: types/index.ts 등은 Phase 0에서만 수정
  - 작은 커밋: 자주 커밋하여 충돌 범위 최소화
  - 의존성 알림: types 변경 시 즉시 다른 세션에 알림

충돌 발생 시:
  - 조기 발견: 자주 main 브랜치와 sync
  - 명확한 코드: 주석으로 변경 이유 설명
  - 협의: Session 간 충돌 시 Master가 최종 결정
```

---

## 의존성 변경 전파

### 시나리오: Session A가 types/index.ts 변경

**Session A (변경자)**:
```bash
# 1. types/index.ts 수정
code types/index.ts
# ChildElementType에 'custom' 추가

# 2. 커밋 및 푸시
git add types/index.ts
git commit -m "feat: add 'custom' type to ChildElementType"
git push origin feature/phase-X-name

# 3. 다른 세션에 알림
echo "Session B, C: types/index.ts updated. Please rebase your branch."
```

**Session B, C (사용자)**:
```bash
# 1. 최신 변경사항 가져오기
git fetch origin

# 2. 리베이스 (main 브랜치 기준)
git checkout main
git pull origin main
git checkout feature/phase-Y-name
git rebase main

# 충돌 발생 시
# ... 충돌 해결 ...
git add .
git rebase --continue

# 3. 강제 푸시 (리베이스 후 필요)
git push origin feature/phase-Y-name --force-with-lease

# 4. 테스트
npm test
```

---

## 긴급 버그 수정

### 프로토콜

```bash
# 1. 버그 발견 시 즉시 보고
echo "⚠️ URGENT: Found bug in [component] - [description]"

# 2. Master (Session A)가 긴급 브랜치 생성
git checkout main
git checkout -b hotfix/[bug-name]

# 3. 버그 수정
code [파일]

# 4. 테스트
npm test
npm run dev

# 5. 즉시 main 머지
git add .
git commit -m "fix: [bug description]"
git push origin hotfix/[bug-name]

git checkout main
git merge hotfix/[bug-name]
git push origin main

# 6. 모든 세션에 알림
echo "🚨 HOTFIX merged to main. Please rebase your branches."

# 7. 각 세션 리베이스
# (위의 "의존성 변경 전파" 참조)
```

---

## 회귀 테스트 프로토콜

### Phase 통합 후 회귀 테스트

**체크리스트**:
```markdown
## 기존 기능 테스트

### Simple 레이아웃
- [ ] Box 추가 가능
- [ ] 내용 입력 가능
- [ ] HTML 생성 성공
- [ ] 팝업 기능 작동

### Flex 레이아웃 (Phase 1 이후)
- [ ] Flex 레이아웃 선택 가능
- [ ] 자식 요소 추가/삭제
- [ ] 드래그 앤 드롭 순서 변경
- [ ] HTML 생성 시 순서 반영

### Table 레이아웃 (Phase 2 이후)
- [ ] Table 레이아웃 선택 가능
- [ ] 행/열 추가/삭제
- [ ] 셀 병합/분할
- [ ] HTML 생성 시 rowspan/colspan 반영

### UX (Phase 3 이후)
- [ ] 프리셋 크기 버튼 작동
- [ ] 비율 고정 크기 조절
- [ ] Layout 타입 전환
- [ ] 탭 구조 정상 작동

### 성능 (Phase 4 이후)
- [ ] 복잡도 계산 및 경고
- [ ] 에러 핸들링 (타임아웃, API 키)
- [ ] 복잡한 구조 처리 (10 Box + 각 5 children)

### 테스팅 (Phase 5 이후)
- [ ] 모든 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 통과

### Docker (Phase 6 이후)
- [ ] Docker 빌드 성공
- [ ] 컨테이너 정상 실행
- [ ] 헬스체크 통과
```

---

## 동기화 실패 처리

### 시나리오 1: 통합 테스트 실패

```bash
# 1. 실패 원인 파악
npm test -- --verbose
# 실패한 테스트 확인

# 2. 문제 있는 브랜치 식별
git log --oneline --graph

# 3. 해당 브랜치 수정 또는 롤백
git revert [COMMIT_HASH]

# 4. 다시 테스트
npm test

# 5. 통과하면 계속 진행
```

### 시나리오 2: 빌드 실패

```bash
# 1. 빌드 에러 확인
npm run build 2>&1 | tee build.log

# 2. 에러 파일 수정
code [에러 파일]

# 3. 다시 빌드
npm run build

# 4. 성공하면 커밋
git add .
git commit -m "fix: resolve build errors"
```

### 시나리오 3: 심각한 충돌

```bash
# 1. 머지 취소
git merge --abort

# 2. Session 담당자와 협의
# (어떤 코드를 유지할지 결정)

# 3. 수동 머지
# 파일 직접 수정하여 두 브랜치 변경사항 조합

# 4. 새로운 커밋
git add .
git commit -m "fix: manually merge conflicting changes"
```

---

## 동기화 완료 알림

### 템플릿

```markdown
## Phase X 통합 완료 ✅

**통합 브랜치**: feature/phase-X-integration
**하위 브랜치**:
- phase-Xa-component1 (Session A)
- phase-Xb-component2 (Session B)
- phase-Xc-component3 (Session C)

**테스트 결과**:
- ✅ 단위 테스트: 25/25 통과
- ✅ 통합 테스트: 5/5 통과
- ✅ 빌드: 성공
- ✅ 회귀 테스트: 모든 기존 기능 정상

**변경사항**:
- [주요 기능 1]
- [주요 기능 2]
- [주요 기능 3]

**다음 단계**:
- Phase X+1 시작
- Session 할당: [SESSION-ALLOCATION.md 참조]

**모든 세션**: main 브랜치에서 최신 코드 pull 해주세요!
```

---

## 빠른 참조 명령어

### 자주 사용하는 Git 명령어

```bash
# 최신 main 코드 가져오기
git checkout main && git pull origin main

# 새 브랜치 생성
git checkout -b feature/phase-X-name

# 변경사항 커밋
git add . && git commit -m "feat: [description]"

# 리모트에 푸시
git push origin feature/phase-X-name

# 리베이스
git fetch origin && git rebase origin/main

# 머지 취소
git merge --abort

# 충돌 파일 확인
git status

# 브랜치 삭제
git branch -d feature/phase-X-name
```

### 테스트 명령어

```bash
# 전체 테스트
npm test

# 특정 파일 테스트
npm test -- types.test.ts

# 커버리지
npm test -- --coverage

# 타입 체크
npm run type-check

# Lint
npm run lint

# 빌드
npm run build
```

---

**생성일**: 2025-10-26
**담당자**: Master (Session A)
**상태**: ✅ 활성
