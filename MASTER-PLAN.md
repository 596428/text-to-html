# Text-to-HTML Generator - Input Method Improvement Master Plan

## 프로젝트 개요

### 목표
텍스트 입력 방식을 계층적 컴포넌트 구조로 개선하여 복잡한 레이아웃 생성을 지원

### 현재 문제점
1. **병합된 셀 테이블 생성 불가**: 현재 단순 텍스트 입력으로는 colspan/rowspan 구조 표현 불가
2. **박스 내부 요소 재배치 불가**: 생성 후 자식 요소 순서/위치 조정 불가
3. **세밀한 크기 조절 불가**: 그리드 기반 제약으로 pixel 단위 조정 불가

### 해결 방안
- **계층적 컴포넌트 구조**: Box → LayoutType → ChildElement
- **Flex 레이아웃 에디터**: 드래그 앤 드롭으로 자식 요소 배치
- **Table Builder UI**: 시각적 병합 셀 테이블 생성기
- **세밀한 크기 조절**: Pixel 단위 width/height 조정

---

## 전체 아키텍처

### 확장된 데이터 모델

```typescript
// types/index.ts 확장
export type LayoutType = 'simple' | 'flex' | 'table';

export interface ChildElement {
  id: string;
  type: 'text' | 'input' | 'button' | 'image' | 'custom';
  content: string;
  order: number;           // Flex 레이아웃 순서
  flexGrow?: number;       // Flex 비율
  width?: number;          // Pixel 단위
  height?: number;         // Pixel 단위
}

export interface TableCell {
  rowIndex: number;
  colIndex: number;
  colspan: number;
  rowspan: number;
  content: string;
}

export interface TableStructure {
  rows: number;
  cols: number;
  cells: TableCell[];
}

export interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;

  // 새로운 필드
  layout: LayoutType;
  children?: ChildElement[];
  tableStructure?: TableStructure;

  // 기존 팝업 필드
  hasPopup?: boolean;
  popupContent?: string;
  popupTriggerText?: string;
}
```

### 컴포넌트 계층 구조

```
components/
├── Canvas/
│   ├── BoxEditor.tsx              # 기존 (수정)
│   ├── FlexLayoutEditor.tsx       # 신규 - Flex 레이아웃 편집
│   ├── TableBuilder.tsx           # 신규 - 테이블 빌더
│   ├── ChildElementEditor.tsx     # 신규 - 자식 요소 편집
│   └── SizeController.tsx         # 신규 - 세밀한 크기 조절
├── Sidebar/
│   └── BoxProperties.tsx          # 기존 (대폭 수정)
└── shared/
    ├── DraggableItem.tsx          # 신규 - 드래그 앤 드롭
    └── TableCellMerger.tsx        # 신규 - 셀 병합 UI
```

---

## 개발 로드맵

### Phase 0: 데이터 모델 확장 (1일)
**목표**: 계층적 구조를 지원하는 타입 시스템 구축

**작업 내용**:
- `types/index.ts` 확장 (`LayoutType`, `ChildElement`, `TableStructure`)
- Zustand 스토어 마이그레이션 로직 추가
- 기존 Box 데이터 호환성 보장

**산출물**:
- `types/index.ts` (확장)
- `lib/store.ts` (마이그레이션 로직)
- `docs/development/PHASE-0-DATA-MODEL.md`

**검증 기준**:
- 기존 프로젝트 데이터 로드 시 에러 없음
- 새 필드 추가해도 기존 기능 정상 작동

---

### Phase 1: Flex 레이아웃 에디터 (5일)
**목표**: 박스 내부 자식 요소를 드래그 앤 드롭으로 재배치

**병렬 작업 그룹**:
```
Group 1A (Session A): FlexLayoutEditor.tsx 기본 구조
Group 1B (Session B): ChildElementEditor.tsx 생성/편집
Group 1C (Session C): DraggableItem.tsx 드래그 앤 드롭
```

**작업 내용**:
1. **FlexLayoutEditor.tsx**:
   - React DnD 기반 레이아웃 편집기
   - 수평/수직 방향 전환
   - 실시간 순서 변경

2. **ChildElementEditor.tsx**:
   - 타입별 편집 UI (text/input/button/image)
   - flexGrow, width, height 조절
   - 삭제/복제 기능

3. **DraggableItem.tsx**:
   - react-dnd 통합
   - 드래그 중 시각적 피드백
   - Drop zone 하이라이트

**산출물**:
- `components/Canvas/FlexLayoutEditor.tsx`
- `components/Canvas/ChildElementEditor.tsx`
- `components/shared/DraggableItem.tsx`
- `docs/development/PHASE-1-FLEX-EDITOR.md`

**검증 기준**:
- 자식 요소 드래그로 순서 변경 가능
- 각 요소 타입별 편집 UI 정상 작동
- Gemini 프롬프트에 children 정보 전달 확인

---

### Phase 2: Table Builder (4일)
**목표**: 시각적 인터페이스로 병합 셀 테이블 생성

**병렬 작업 그룹**:
```
Group 2A (Session A): TableBuilder.tsx 기본 UI
Group 2B (Session B): TableCellMerger.tsx 병합 로직
```

**작업 내용**:
1. **TableBuilder.tsx**:
   - 행/열 추가/삭제
   - 셀 선택 (단일/다중)
   - 병합/분할 버튼
   - 테이블 미리보기

2. **TableCellMerger.tsx**:
   - 셀 병합 알고리즘 (colspan/rowspan 계산)
   - 병합 충돌 감지
   - 분할 시 원래 셀 복원

**산출물**:
- `components/Canvas/TableBuilder.tsx`
- `components/shared/TableCellMerger.tsx`
- `docs/development/PHASE-2-TABLE-BUILDER.md`

**검증 기준**:
- 3x3 테이블 생성 → 2x2 셀 병합 성공
- Gemini가 올바른 `<table>` HTML 생성 확인
- 병합 충돌 시 에러 메시지 표시

---

### Phase 3: UX 개선 (3일)
**목표**: 세밀한 크기 조절 및 사용성 개선

**병렬 작업 그룹**:
```
Group 3A (Session A): SizeController.tsx
Group 3B (Session B): BoxProperties.tsx 리팩토링
```

**작업 내용**:
1. **SizeController.tsx**:
   - Pixel 단위 width/height 입력
   - 비율 고정 옵션
   - 프리셋 크기 (Full width, Half, Quarter)

2. **BoxProperties.tsx 대폭 수정**:
   - Layout 타입 선택 UI (Simple/Flex/Table)
   - 조건부 렌더링 (타입별 에디터 전환)
   - 탭 구조로 정리 (Properties / Layout / Children)

**산출물**:
- `components/Canvas/SizeController.tsx`
- `components/Sidebar/BoxProperties.tsx` (대폭 수정)
- `docs/development/PHASE-3-UX-IMPROVEMENTS.md`

**검증 기준**:
- Box를 정확히 원하는 pixel 크기로 조절 가능
- Layout 타입 변경 시 적절한 에디터 표시
- 기존 Simple 레이아웃 사용자도 혼란 없음

---

### Phase 4: 성능 및 안정성 (2일)
**목표**: 복잡한 구조 처리 및 에러 핸들링 개선

**작업 내용**:
1. **Gemini 프롬프트 최적화**:
   - 계층 구조 명확한 설명 추가
   - 테이블 생성 가이드라인 강화
   - 예시 코드 추가

2. **에러 핸들링**:
   - 524 타임아웃 클라이언트 처리
   - 잘못된 테이블 구조 검증
   - 순환 참조 방지

3. **성능 최적화**:
   - 복잡한 Box 렌더링 최적화
   - Zustand 스토어 선택적 구독
   - React.memo 적용

**산출물**:
- `lib/gemini.ts` (프롬프트 업데이트)
- `app/api/generate/route.ts` (에러 핸들링)
- `docs/development/PHASE-4-PERFORMANCE.md`

**검증 기준**:
- 10개 Box + 각 5개 자식 요소 처리 가능
- 타임아웃 시 사용자 친화적 메시지
- 브라우저 렌더링 60fps 유지

---

### Phase 5: 테스팅 (2일)
**목표**: 각 기능 통합 테스트 및 회귀 방지

**작업 내용**:
1. **단위 테스트**:
   - TableCellMerger 로직 테스트
   - 데이터 마이그레이션 테스트
   - Validation 함수 테스트

2. **통합 테스트**:
   - Flex 레이아웃 → HTML 생성
   - Table Builder → HTML 생성
   - 복합 시나리오 테스트

3. **수동 테스트 가이드**:
   - 사용자 시나리오별 체크리스트
   - 브라우저 호환성 테스트

**산출물**:
- `tests/unit/` (단위 테스트)
- `tests/integration/` (통합 테스트)
- `docs/guides/TESTING-GUIDE.md`

**검증 기준**:
- 모든 단위 테스트 통과
- 3가지 복합 시나리오 성공
- 기존 기능 회귀 없음

---

### Phase 6: Docker 배포 (1일)
**목표**: 회사 환경 배포 준비

**작업 내용**:
1. **Dockerfile 작성**:
   - Next.js standalone 빌드
   - 환경 변수 주입
   - 포트 설정

2. **docker-compose.yml**:
   - 서비스 정의
   - 볼륨 마운트
   - 네트워크 설정

3. **배포 가이드**:
   - 환경별 설정 방법
   - 업데이트 절차
   - 트러블슈팅

**산출물**:
- `Dockerfile`
- `docker-compose.yml`
- `docs/guides/DOCKER-DEPLOYMENT.md`

**검증 기준**:
- `docker-compose up` 한 번에 실행
- 환경 변수 정상 로드
- 빌드 시간 3분 이내

---

## 병렬 작업 전략

### 타임라인 비교

**순차 개발**: 31일
**병렬 개발**: **17일** (45% 단축)

### 세션 할당

```
📅 Week 1 (Day 1-5)
├─ Session A: Phase 0 → Phase 1A (FlexLayoutEditor)
├─ Session B: Phase 1B (ChildElementEditor)
└─ Session C: Phase 1C (DraggableItem)

📅 Week 2 (Day 6-10)
├─ Session A: Phase 1 통합 → Phase 2A (TableBuilder)
├─ Session B: Phase 2B (TableCellMerger)
└─ Session D: Phase 3A (SizeController)

📅 Week 3 (Day 11-15)
├─ Session A: Phase 2 통합 → Phase 3B (BoxProperties)
├─ Session B: Phase 4 (성능/에러)
└─ Session C: Phase 5 (테스트 작성)

📅 Week 4 (Day 16-17)
├─ Session A: Phase 5 통합 테스트
└─ Session B: Phase 6 (Docker 배포)
```

### 브랜치 전략

```bash
main
├─ feature/phase-0-data-model
├─ feature/phase-1-flex-editor
│   ├─ feature/phase-1a-flex-layout
│   ├─ feature/phase-1b-child-editor
│   └─ feature/phase-1c-draggable
├─ feature/phase-2-table-builder
│   ├─ feature/phase-2a-table-ui
│   └─ feature/phase-2b-cell-merger
├─ feature/phase-3-ux
│   ├─ feature/phase-3a-size-control
│   └─ feature/phase-3b-properties
├─ feature/phase-4-performance
├─ feature/phase-5-testing
└─ feature/phase-6-docker
```

### 동기화 포인트

1. **Phase 0 완료 후**: 모든 세션이 확장된 타입 정의 사용
2. **Phase 1 완료 후**: Flex 에디터 통합 테스트
3. **Phase 2 완료 후**: Table Builder 통합 테스트
4. **Phase 3 완료 후**: 전체 UI/UX 검증
5. **Phase 5 완료 후**: 최종 배포 준비

---

## 완료 기준

### 기능적 요구사항
- ✅ 병합된 셀 테이블 생성 및 HTML 변환 성공
- ✅ Flex 레이아웃 자식 요소 드래그 앤 드롭 재배치
- ✅ Pixel 단위 세밀한 크기 조절
- ✅ 기존 Simple 레이아웃 호환성 유지

### 비기능적 요구사항
- ✅ 복잡한 구조 처리 시 타임아웃 없음
- ✅ 모든 테스트 통과
- ✅ Docker 배포 한 번에 성공
- ✅ 문서화 완료 (개발/가이드)

### 사용자 경험
- ✅ Layout 타입 변경 시 명확한 UI 안내
- ✅ 에러 발생 시 친화적 메시지
- ✅ 학습 곡선 최소화 (기존 사용자 혼란 없음)

---

## 리스크 관리

### 기술적 리스크
1. **Gemini 프롬프트 복잡도**: 계층 구조 이해 실패 가능성
   - **대응**: Phase 4에서 충분한 예시 코드 제공

2. **성능 저하**: 복잡한 구조 렌더링 시 느려질 수 있음
   - **대응**: Phase 4에서 React.memo 및 최적화

3. **데이터 마이그레이션 버그**: 기존 프로젝트 깨질 위험
   - **대응**: Phase 0에서 마이그레이션 로직 철저히 테스트

### 일정 리스크
1. **병렬 작업 충돌**: 여러 세션이 동시 작업 시 머지 충돌
   - **대응**: 명확한 파일 소유권 정의 (`PARALLEL-STRATEGY.md`)

2. **Phase 간 의존성**: 이전 Phase 지연 시 후속 작업 막힘
   - **대응**: 동기화 포인트에서 철저한 검증

---

## 다음 단계

### 즉시 시작 가능
1. **Phase 0 작업 시작**: `feature/phase-0-data-model` 브랜치 생성
2. **문서 작성**: `docs/development/PHASE-0-DATA-MODEL.md` 상세화
3. **테스트 환경 준비**: 기존 프로젝트 백업

### 준비 필요
1. **병렬 작업 규칙 문서화**: `docs/workflow/PARALLEL-STRATEGY.md`
2. **세션 할당 가이드**: `docs/workflow/SESSION-ALLOCATION.md`
3. **Docker 환경 조사**: 회사 인프라 요구사항 확인

---

## 참고 문서

### 개발 가이드
- `docs/development/PHASE-{N}-{NAME}.md`: 각 Phase별 상세 계획
- `docs/guides/TESTING-GUIDE.md`: 테스팅 절차
- `docs/guides/DOCKER-DEPLOYMENT.md`: 배포 가이드

### 워크플로우
- `docs/workflow/PARALLEL-STRATEGY.md`: 병렬 작업 전략
- `docs/workflow/SESSION-ALLOCATION.md`: 세션별 작업 할당
- `docs/workflow/SYNC-PROTOCOL.md`: 동기화 프로토콜

### 프로토타입 참고
- 이전 프로젝트의 `PARALLEL-WORK-RULES.md` 패턴 적용
- `SESSION-BRANCH-GUIDE.md` 스타일 명령어 제공

---

**생성일**: 2025-10-26
**최종 수정**: 2025-10-26
**담당자**: Claude Code
**승인 상태**: ⏳ 사용자 검토 대기
