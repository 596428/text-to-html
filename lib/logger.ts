import fs from 'fs';
import path from 'path';
import { Box } from '@/types';

/**
 * 프로토타입 개발용 로거
 * 사용자 입력 텍스트와 Gemini 프롬프트를 파일로 저장
 */

const LOG_DIR = path.join(process.cwd(), 'logs');

// 로그 디렉토리 생성 (개발 환경에서만)
if (process.env.NODE_ENV === 'development' && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * HTML 생성 요청 로그 저장
 * 로컬 개발 환경에서만 파일로 저장
 */
export function logHTMLGeneration(boxes: Box[], prompt: string) {
  // 프로덕션에서는 파일 로깅 비활성화
  if (process.env.NODE_ENV !== 'development') {
    console.log('[Logger] HTML generation (production - file logging disabled)');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `html-generation-${timestamp}.log`);

  const logContent = {
    timestamp: new Date().toISOString(),
    userInput: {
      boxCount: boxes.length,
      boxes: boxes.map(box => ({
        id: box.id,
        position: { x: box.x, y: box.y },
        size: { width: box.width, height: box.height },
        content: box.content,
        hasPopup: box.hasPopup,
        popupTriggerText: box.popupTriggerText,
        popupContent: box.popupContent ? '[팝업 내용 있음]' : undefined
      }))
    },
    geminiPrompt: prompt
  };

  try {
    fs.writeFileSync(logFile, JSON.stringify(logContent, null, 2), 'utf-8');
    console.log(`[Logger] Saved generation log: ${logFile}`);
  } catch (error) {
    console.error('[Logger] Failed to save log:', error);
  }
}

/**
 * HTML 수정 요청 로그 저장
 * 로컬 개발 환경에서만 파일로 저장
 */
export function logHTMLModification(currentHTML: string, userRequest: string, prompt: string) {
  // 프로덕션에서는 파일 로깅 비활성화
  if (process.env.NODE_ENV !== 'development') {
    console.log('[Logger] HTML modification (production - file logging disabled)');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `html-modification-${timestamp}.log`);

  const logContent = {
    timestamp: new Date().toISOString(),
    userRequest,
    currentHTMLLength: currentHTML.length,
    geminiPrompt: prompt
  };

  try {
    fs.writeFileSync(logFile, JSON.stringify(logContent, null, 2), 'utf-8');
    console.log(`[Logger] Saved modification log: ${logFile}`);
  } catch (error) {
    console.error('[Logger] Failed to save log:', error);
  }
}
