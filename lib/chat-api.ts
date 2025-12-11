/**
 * Chat API Client
 *
 * Python FastAPI 백엔드와 통신하는 클라이언트
 * 기존 modifyHTML 대신 사용
 */

// ============ 타입 정의 ============

export interface SessionStats {
  node_count: number;
  text_node_count: number;
  section_count: number;
  vector_count: number;
  html_size: number;
}

export interface SessionResponse {
  session_id: string;
  status: 'active' | 'expired' | 'terminated';
  stats?: SessionStats;
  expires_at?: string;
  created_at?: string;
  last_active_at?: string;
}

export interface Patch {
  selector: string;
  action: 'addClass' | 'removeClass' | 'replaceClass' | 'setText' | 'setHtml' | 'setAttribute' | 'setStyle' | 'removeElement' | 'appendChild' | 'prependChild';
  oldValue?: string;
  newValue?: string;
  value?: string;  // appendChild, prependChild 등에서 사용하는 단일 값
}

export interface SearchResult {
  node_id?: string;
  section_id?: string;
  selector?: string;
  type: string;
  content: string;
  score: number;
}

export interface DebugInfo {
  search_results: SearchResult[];
  target_sections: string[];
  context_size: string;
  intent: string;
  confidence: number;
  fallback_reason?: string;
}

export interface ChatResponse {
  type: 'patch' | 'full' | 'message' | 'error';
  patches?: Patch[];
  html?: string;
  message?: string;
  processing_time?: number;
  tokens_used?: number;
  debug?: DebugInfo;
}

// ============ 설정 ============

const CHAT_API_URL = process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:8000';

// ============ API 클라이언트 ============

/**
 * 새 채팅 세션 시작
 * HTML을 파싱하고 임베딩을 생성하여 세션 생성
 */
export async function startChatSession(
  html: string,
  source: string = 'frontend'
): Promise<SessionResponse> {
  const response = await fetch(`${CHAT_API_URL}/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ html, source }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to start session: ${response.status}`);
  }

  return response.json();
}

/**
 * 세션 상태 조회
 */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  const response = await fetch(`${CHAT_API_URL}/session/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to get session: ${response.status}`);
  }

  return response.json();
}

/**
 * 세션 종료 및 리소스 정리
 */
export async function endSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${CHAT_API_URL}/session/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to end session: ${response.status}`);
  }

  return response.json();
}

/**
 * 채팅 메시지 전송
 * 사용자 요청을 분석하고 수정 사항 반환
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const response = await fetch(`${CHAT_API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to send message: ${response.status}`);
  }

  return response.json();
}

// ============ 편의 함수 ============

/**
 * 세션 관리자 클래스
 * 세션 상태 관리 및 자동 갱신
 */
export class ChatSessionManager {
  private sessionId: string | null = null;
  private currentHtml: string = '';

  /**
   * 세션 시작 또는 재사용
   */
  async ensureSession(html: string): Promise<string> {
    // HTML이 변경되었거나 세션이 없으면 새로 시작
    if (!this.sessionId || this.currentHtml !== html) {
      const session = await startChatSession(html);
      this.sessionId = session.session_id;
      this.currentHtml = html;
      console.log(`[ChatAPI] New session started: ${this.sessionId}`);
    }
    return this.sessionId;
  }

  /**
   * 메시지 전송 (세션 자동 관리)
   */
  async sendMessage(html: string, message: string): Promise<ChatResponse> {
    const sessionId = await this.ensureSession(html);
    return sendChatMessage(sessionId, message);
  }

  /**
   * 세션 종료
   */
  async cleanup(): Promise<void> {
    if (this.sessionId) {
      try {
        await endSession(this.sessionId);
        console.log(`[ChatAPI] Session ended: ${this.sessionId}`);
      } catch (e) {
        console.warn(`[ChatAPI] Failed to end session: ${e}`);
      }
      this.sessionId = null;
      this.currentHtml = '';
    }
  }

  /**
   * 현재 세션 ID 반환
   */
  getSessionId(): string | null {
    return this.sessionId;
  }
}

// 싱글톤 인스턴스
export const chatSessionManager = new ChatSessionManager();

// ============ 기존 modifyHTML 대체 함수 ============

/**
 * modifyHTML 대체 함수
 * 기존 코드와의 호환성을 위해 제공
 *
 * @deprecated 새 코드에서는 ChatSessionManager 사용 권장
 */
export async function modifyHTMLWithChat(
  currentHTML: string,
  userRequest: string
): Promise<{ html: string; patches?: Patch[]; type: 'patch' | 'full' }> {
  const response = await chatSessionManager.sendMessage(currentHTML, userRequest);

  if (response.type === 'error') {
    throw new Error(response.message || 'Chat API error');
  }

  if (response.type === 'patch' && response.patches) {
    // 패치 모드: 클라이언트에서 적용 필요
    return {
      html: currentHTML, // 원본 반환, 패치는 별도 적용
      patches: response.patches,
      type: 'patch'
    };
  }

  if (response.type === 'full' && response.html) {
    // 전체 교체 모드
    return {
      html: response.html,
      type: 'full'
    };
  }

  // 메시지 응답 (HTML 변경 없음)
  return {
    html: currentHTML,
    type: 'full'
  };
}
