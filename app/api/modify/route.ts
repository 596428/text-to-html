import { NextRequest, NextResponse } from 'next/server';
import { modifyHTML } from '@/lib/gemini';
import { applyPatches } from '@/lib/patch-utils';

export const maxDuration = 300; // 5분 (Gemini API 복잡한 HTML 수정 대기)

// Python Chat Backend 설정
const CHAT_BACKEND_URL = process.env.CHAT_BACKEND_URL || 'http://localhost:8000';
const USE_CHAT_BACKEND = process.env.USE_CHAT_BACKEND === 'true';

// 세션 캐시 (메모리 기반, 프로덕션에서는 Redis 권장)
const sessionCache = new Map<string, { sessionId: string; htmlHash: string; expiresAt: number }>();

function hashHTML(html: string): string {
  // 간단한 해시 (프로덕션에서는 crypto 사용 권장)
  let hash = 0;
  for (let i = 0; i < Math.min(html.length, 1000); i++) {
    hash = ((hash << 5) - hash) + html.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

async function getChatSession(html: string): Promise<string> {
  const htmlHash = hashHTML(html);
  const cached = sessionCache.get(htmlHash);

  // 캐시된 세션이 있고 만료되지 않았으면 재사용
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[ChatBackend] Reusing session: ${cached.sessionId}`);
    return cached.sessionId;
  }

  // 새 세션 생성
  console.log('[ChatBackend] Creating new session...');
  const response = await fetch(`${CHAT_BACKEND_URL}/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, source: 'nextjs-api' }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Failed to start session: ${response.status}`);
  }

  const data = await response.json();
  const sessionId = data.session_id;

  // 캐시에 저장 (25분 후 만료)
  sessionCache.set(htmlHash, {
    sessionId,
    htmlHash,
    expiresAt: Date.now() + 25 * 60 * 1000,
  });

  console.log(`[ChatBackend] New session created: ${sessionId}`);
  return sessionId;
}

interface ChatBackendResult {
  html: string;
  message?: string;
  type: 'patch' | 'full' | 'message' | 'declined';
}

async function modifyWithChatBackend(currentHTML: string, userRequest: string): Promise<ChatBackendResult> {
  // 1. 세션 확보
  const sessionId = await getChatSession(currentHTML);

  // 2. 채팅 메시지 전송
  const response = await fetch(`${CHAT_BACKEND_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: sessionId,
      message: userRequest,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `Chat failed: ${response.status}`);
  }

  const data = await response.json();
  console.log(`[ChatBackend] Response type: ${data.type}, time: ${data.processing_time?.toFixed(2)}s`);

  // 3. 응답 타입에 따라 처리
  if (data.type === 'patch' && data.patches?.length > 0) {
    // 패치 키 변환 (snake_case → camelCase)
    const normalizedPatches = data.patches.map((patch: Record<string, unknown>) => ({
      selector: patch.selector,
      action: patch.action,
      oldValue: patch.old_value ?? patch.oldValue,
      newValue: patch.new_value ?? patch.newValue,
      value: patch.value,
    }));

    console.log(`[ChatBackend] Applying ${normalizedPatches.length} patches`);
    console.log('[ChatBackend] Patches:', JSON.stringify(normalizedPatches, null, 2));
    const patchedHtml = applyPatches(currentHTML, normalizedPatches);
    console.log('[ChatBackend] Original HTML length:', currentHTML.length);
    console.log('[ChatBackend] Patched HTML length:', patchedHtml.length);
    console.log('[ChatBackend] HTML changed:', currentHTML !== patchedHtml);
    return {
      html: patchedHtml,
      message: data.message || `${data.patches.length}개의 요소를 수정했습니다.`,
      type: 'patch'
    };
  }

  if (data.type === 'full' && data.html) {
    // 전체 HTML 교체
    console.log('[ChatBackend] Full HTML replacement');
    return {
      html: data.html,
      message: data.message || '전체 HTML이 수정되었습니다.',
      type: 'full'
    };
  }

  if (data.type === 'message') {
    // 질문 응답 또는 HTML 수정 외 요청 (HTML 변경 없음)
    console.log('[ChatBackend] Query/declined response, no HTML change');
    return {
      html: currentHTML,
      message: data.message || '요청을 처리할 수 없습니다.',
      type: 'message'
    };
  }

  // 에러 응답
  if (data.type === 'error') {
    throw new Error(data.message || 'Chat backend error');
  }

  // 알 수 없는 응답
  console.warn('[ChatBackend] Unknown response type:', data.type);
  return {
    html: currentHTML,
    message: '요청을 처리할 수 없습니다.',
    type: 'message'
  };
}

export async function POST(request: NextRequest) {
  try {
    // 요청 IP 추출
    const requestIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const { currentHTML, userRequest }: { currentHTML: string; userRequest: string } = await request.json();

    // 입력 검증
    if (!currentHTML) {
      return NextResponse.json(
        { error: '먼저 HTML을 생성해주세요!' },
        { status: 400 }
      );
    }

    if (!userRequest || !userRequest.trim()) {
      return NextResponse.json(
        { error: '수정 요청을 입력해주세요!' },
        { status: 400 }
      );
    }

    let result: { html: string; message?: string; type?: string };

    // Chat Backend 사용 여부 결정
    if (USE_CHAT_BACKEND) {
      console.log('[/api/modify] Using Chat Backend (Python)');
      try {
        const backendResult = await modifyWithChatBackend(currentHTML, userRequest.trim());

        // message 타입이면 HTML 변경 없음 (질문 응답 또는 거절)
        if (backendResult.type === 'message') {
          return NextResponse.json({
            html: currentHTML,
            message: backendResult.message,
            type: 'message',
            noChange: true
          });
        }

        result = {
          html: backendResult.html,
          message: backendResult.message,
          type: backendResult.type
        };
      } catch (error) {
        // Chat Backend 실패 시 기존 방식으로 폴백
        console.warn('[/api/modify] Chat Backend failed, falling back to Gemini:', error);
        const html = await modifyHTML(currentHTML, userRequest.trim(), requestIp);
        result = {
          html,
          message: '요청하신 수정이 완료되었습니다.',
          type: 'full'
        };
      }
    } else {
      // 기존 Gemini 직접 호출
      console.log('[/api/modify] Using Gemini directly');
      const html = await modifyHTML(currentHTML, userRequest.trim(), requestIp);
      result = {
        html,
        message: '요청하신 수정이 완료되었습니다.',
        type: 'full'
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/modify] Error:', error);

    const errorMessage = error instanceof Error ? error.message : '수정에 실패했습니다.';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
