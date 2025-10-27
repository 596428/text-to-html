// ============ 그리드 시스템 상수 ============

export const GRID_COLUMNS = 24; // 12에서 24로 확장
export const GRID_UNIT = 100; // 1컬럼 = 100px
export const GRID_SNAP_Y = 20; // Y축 스냅 간격

// ============ 박스 기본값 ============

export const DEFAULT_BOX_WIDTH = 6; // 12컬럼 중 6컬럼 (50%)
export const DEFAULT_BOX_HEIGHT = 200;
export const MIN_BOX_WIDTH = 1; // 최소 1컬럼
export const MIN_BOX_HEIGHT = 50;

// ============ API 설정 ============

export const API_TIMEOUT = 30000; // 30초
export const MAX_RETRIES = 3;

// ============ UI 상수 ============

export const PANEL_WIDTHS = {
  LAYOUT_EDITOR: '30%',
  PREVIEW_PANEL: '40%',
  CHAT_PANEL: '30%',
} as const;

// ============ 에러 메시지 ============

export const ERROR_MESSAGES = {
  NO_BOXES: '박스를 추가해주세요!',
  NO_HTML: '먼저 HTML을 생성해주세요!',
  GENERATION_FAILED: 'HTML 생성에 실패했습니다.',
  MODIFICATION_FAILED: '수정에 실패했습니다.',
  API_KEY_MISSING: 'Gemini API 키가 설정되지 않았습니다.',
} as const;

// ============ 플레이스홀더 ============

export const PLACEHOLDERS = {
  BOX_CONTENT: '이 영역에 대한 설명을 입력하세요...\n예: "상단 헤더 - 로고와 네비게이션 메뉴"',
  CHAT_INPUT: '수정 요청을 입력하세요... (Enter: 전송)',
} as const;
