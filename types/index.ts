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
