// ============ 핵심 데이터 모델 ============

// 레이아웃 타입
export type LayoutType = 'simple' | 'flex' | 'table' | 'loaded';

// 자식 요소 (Flex 레이아웃용)
export interface ChildElement {
  id: string;
  content: string;          // 요소 설명
  spaceRatio: number;       // 공간 비율 (%) - 부모의 너비/높이에서 차지할 비율
}

// 테이블 구조
export interface TableStructure {
  rows: number;             // 행 수
  cols: number;             // 열 수
  cells: TableCell[][];     // 셀 데이터 (2차원 배열)
  hasHeader?: boolean;      // 헤더 행 포함 여부
}

// 테이블 셀
export interface TableCell {
  content: string;          // 셀 내용 설명
  rowSpan?: number;         // 행 병합 (기본: 1)
  colSpan?: number;         // 열 병합 (기본: 1)
  isHeader?: boolean;       // 헤더 셀 여부
}

export interface Box {
  id: string;
  sectionId: string;  // HTML의 data-section-id (UUID)
  x: number;          // 그리드 열 위치 (0-11)
  y: number;          // Y 좌표 (px)
  width: number;      // 그리드 컬럼 수 (1-12)
  height: number;     // 높이 (px)
  content: string;    // 사용자 입력 설명

  // 레이아웃 타입 (Phase 0 추가)
  layoutType?: LayoutType;  // 기본: 'simple'

  // Flex 레이아웃 관련 (Phase 1 사용)
  flexDirection?: 'row' | 'column';           // flex 방향 (가로/세로)
  flexAlign?: 'left' | 'right' | 'center';    // 정렬 방식 (왼쪽/오른쪽/가운데) - row일 때만 유효
  children?: ChildElement[];                   // 자식 요소 배열

  // 테이블 레이아웃 관련 (Phase 2 사용)
  tableStructure?: TableStructure;
  tableDescription?: string;  // 테이블 추가 설명 (스타일, 동작 등)

  // 불러오기 레이아웃 관련 (Phase 5 사용)
  loadedComponentId?: string;  // 저장된 컴포넌트 ID
  loadedHtml?: string;         // 불러온 HTML 코드

  // 팝업 관련 필드
  hasPopup?: boolean;           // 팝업 보유 여부
  popupContent?: string;        // 팝업 HTML 컨텐츠 (HTMLEditor로 편집 가능)
  popupTriggerText?: string;    // 팝업 트리거 버튼 텍스트

  // 배율 조정 (컴포넌트 재생성용)
  scalePercentage?: number;     // 50 ~ 200 (기본값: 100)
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

// ============ 컴포넌트 라이브러리 (Phase 5) ============

export interface SavedComponent {
  id: string;              // 고유 ID
  name: string;            // 사용자 지정 이름
  description: string;     // 설명
  html: string;            // 저장된 HTML 코드
  width: number;           // 원래 박스 너비 (칸)
  height: number;          // 원래 박스 높이 (px)
  createdAt: string;       // 생성 날짜 (ISO string)
  tags?: string[];         // 검색용 태그
  metadata?: {             // 메타데이터 (DB 마이그레이션 대비)
    boxCount: number;      // 최상위 박스 개수 (1개면 단일 컴포넌트, 2개 이상이면 전체 페이지)
    totalSections: number; // 모든 data-section-id 개수 (부모+자식)
    version?: string;      // 저장 버전
  };
}

// ============ 상태 관리 인터페이스 ============

export type CanvasMode = 'edit' | 'preview';

export interface AppState {
  // 캔버스 모드
  canvasMode: CanvasMode;
  setCanvasMode: (mode: CanvasMode) => void;

  // 레이아웃 상태
  boxes: Box[];
  selectedBoxId: string | null;

  // 레이아웃 액션
  addBox: () => void;
  updateBox: (id: string, updates: Partial<Box>) => void;
  removeBox: (id: string) => void;
  selectBox: (id: string | null) => void;
  clearBoxes: () => void;
  setBoxes: (boxes: Box[]) => void;

  // 팝업 관련 액션
  setBoxPopup: (boxId: string, popupContent: string) => void;

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

  // 프리뷰 선택 상태
  selectedSectionId: string | null;
  setSelectedSectionId: (id: string | null) => void;
  previewScale: number; // 슬라이더로 조정하는 미리보기 스케일 (실시간)
  setPreviewScale: (scale: number) => void;
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
