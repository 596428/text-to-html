/**
 * Patch Utilities
 *
 * HTML에 패치를 적용하는 유틸리티 함수들
 * Python 백엔드에서 받은 패치를 클라이언트에서 적용
 */

import { JSDOM } from 'jsdom';
import type { Patch } from './chat-api';

// ============ 패치 적용 ============

/**
 * HTML 문자열에 패치 적용
 *
 * @param html - 원본 HTML
 * @param patches - 적용할 패치 배열
 * @returns 수정된 HTML
 */
export function applyPatches(html: string, patches: Patch[]): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  for (const patch of patches) {
    try {
      applyPatch(document, patch);
    } catch (e) {
      console.warn(`[PatchUtils] Failed to apply patch: ${patch.selector}`, e);
    }
  }

  // body 내용만 반환 (전체 HTML 구조 유지)
  return dom.serialize();
}

/**
 * 단일 패치 적용
 */
function applyPatch(document: Document, patch: Patch): void {
  const elements = document.querySelectorAll(patch.selector);

  if (elements.length === 0) {
    console.warn(`[PatchUtils] No elements found for selector: ${patch.selector}`);
    return;
  }

  elements.forEach((element) => {
    switch (patch.action) {
      case 'addClass':
        if (patch.newValue) {
          element.classList.add(...patch.newValue.split(' '));
        }
        break;

      case 'removeClass':
        if (patch.oldValue) {
          element.classList.remove(...patch.oldValue.split(' '));
        }
        break;

      case 'replaceClass':
        if (patch.oldValue && patch.newValue) {
          element.classList.remove(...patch.oldValue.split(' '));
          element.classList.add(...patch.newValue.split(' '));
        }
        break;

      case 'setText':
        const textValue = patch.value || patch.newValue;
        if (textValue !== undefined) {
          element.textContent = textValue;
        }
        break;

      case 'setHtml':
        const htmlValue = patch.value || patch.newValue;
        if (htmlValue !== undefined) {
          element.innerHTML = htmlValue;
        }
        break;

      case 'setAttribute':
        const attrValue = patch.value || patch.newValue;
        if (attrValue !== undefined) {
          // 형식: "attr=value" 또는 JSON {"attr": "value"}
          try {
            const attrs = JSON.parse(attrValue);
            Object.entries(attrs).forEach(([key, value]) => {
              element.setAttribute(key, value as string);
            });
          } catch {
            // attr=value 형식
            const [attr, ...valueParts] = attrValue.split('=');
            const value = valueParts.join('=');
            element.setAttribute(attr, value);
          }
        }
        break;

      case 'setStyle':
        // value 또는 newValue 필드 사용 (백엔드 호환성)
        const styleValue = patch.value || patch.newValue;
        if (styleValue !== undefined) {
          // 형식: "property: value" 또는 JSON {"property": "value"}
          try {
            const styles = JSON.parse(styleValue);
            Object.entries(styles).forEach(([prop, value]) => {
              (element as HTMLElement).style.setProperty(prop, value as string);
            });
          } catch {
            // CSS 형식 파싱
            styleValue.split(';').forEach((style) => {
              const [prop, ...valueParts] = style.split(':');
              if (prop && valueParts.length) {
                const value = valueParts.join(':').trim();
                (element as HTMLElement).style.setProperty(prop.trim(), value);
              }
            });
          }
        }
        break;

      case 'removeElement':
        element.remove();
        break;

      case 'appendChild':
        if (patch.value || patch.newValue) {
          const htmlContent = patch.value || patch.newValue;
          // HTML 문자열을 파싱하여 자식으로 추가
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent as string;
          while (tempDiv.firstChild) {
            element.appendChild(tempDiv.firstChild);
          }
        }
        break;

      case 'prependChild':
        if (patch.value || patch.newValue) {
          const htmlContent = patch.value || patch.newValue;
          // HTML 문자열을 파싱하여 첫 번째 자식으로 추가
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent as string;
          const firstChild = element.firstChild;
          while (tempDiv.firstChild) {
            element.insertBefore(tempDiv.firstChild, firstChild);
          }
        }
        break;

      default:
        console.warn(`[PatchUtils] Unknown action: ${patch.action}`);
    }
  });
}

// ============ 브라우저용 패치 적용 (DOM 직접 조작) ============

/**
 * 브라우저 DOM에 직접 패치 적용
 * SSR이 아닌 클라이언트 사이드에서 사용
 *
 * @param patches - 적용할 패치 배열
 * @returns 성공적으로 적용된 패치 수
 */
export function applyPatchesToDOM(patches: Patch[]): number {
  if (typeof window === 'undefined') {
    throw new Error('applyPatchesToDOM can only be used in browser');
  }

  let appliedCount = 0;

  for (const patch of patches) {
    try {
      applyPatch(document, patch);
      appliedCount++;
    } catch (e) {
      console.warn(`[PatchUtils] Failed to apply patch to DOM: ${patch.selector}`, e);
    }
  }

  return appliedCount;
}

// ============ 패치 검증 ============

/**
 * 패치 배열 유효성 검증
 */
export function validatePatches(patches: unknown[]): patches is Patch[] {
  if (!Array.isArray(patches)) return false;

  const validActions = [
    'addClass', 'removeClass', 'replaceClass',
    'setText', 'setHtml', 'setAttribute', 'setStyle', 'removeElement',
    'appendChild', 'prependChild'
  ];

  return patches.every((patch) => {
    if (typeof patch !== 'object' || patch === null) return false;
    const p = patch as Record<string, unknown>;
    return (
      typeof p.selector === 'string' &&
      typeof p.action === 'string' &&
      validActions.includes(p.action)
    );
  });
}

// ============ 패치 프리뷰 ============

/**
 * 패치 적용 결과 미리보기 (변경 사항 요약)
 */
export function getPatchSummary(patches: Patch[]): string[] {
  return patches.map((patch) => {
    switch (patch.action) {
      case 'addClass':
        return `Add class "${patch.newValue}" to ${patch.selector}`;
      case 'removeClass':
        return `Remove class "${patch.oldValue}" from ${patch.selector}`;
      case 'replaceClass':
        return `Replace class "${patch.oldValue}" → "${patch.newValue}" on ${patch.selector}`;
      case 'setText':
        return `Set text to "${patch.newValue?.substring(0, 30)}..." on ${patch.selector}`;
      case 'setHtml':
        return `Set HTML content on ${patch.selector}`;
      case 'setAttribute':
        return `Set attribute on ${patch.selector}`;
      case 'setStyle':
        return `Set style on ${patch.selector}`;
      case 'removeElement':
        return `Remove element ${patch.selector}`;
      default:
        return `Unknown action on ${patch.selector}`;
    }
  });
}

// ============ 패치 롤백 생성 ============

/**
 * 패치 적용 전 롤백 패치 생성
 * 원본 HTML에서 현재 값을 추출하여 역방향 패치 생성
 */
export function createRollbackPatches(html: string, patches: Patch[]): Patch[] {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  return patches.map((patch) => {
    const element = document.querySelector(patch.selector);
    if (!element) return null;

    switch (patch.action) {
      case 'addClass':
        return {
          selector: patch.selector,
          action: 'removeClass' as const,
          oldValue: patch.newValue,
        };

      case 'removeClass':
        return {
          selector: patch.selector,
          action: 'addClass' as const,
          newValue: patch.oldValue,
        };

      case 'replaceClass':
        return {
          selector: patch.selector,
          action: 'replaceClass' as const,
          oldValue: patch.newValue,
          newValue: patch.oldValue,
        };

      case 'setText':
        return {
          selector: patch.selector,
          action: 'setText' as const,
          oldValue: patch.newValue,
          newValue: element.textContent || '',
        };

      case 'setHtml':
        return {
          selector: patch.selector,
          action: 'setHtml' as const,
          oldValue: patch.newValue,
          newValue: element.innerHTML,
        };

      case 'setStyle':
        // 스타일 롤백은 복잡하므로 원본 저장 권장
        return {
          selector: patch.selector,
          action: 'setStyle' as const,
          oldValue: patch.newValue,
          newValue: (element as HTMLElement).getAttribute('style') || '',
        };

      case 'removeElement':
        // 삭제된 요소 복원은 outerHTML 저장 필요
        return {
          selector: patch.selector,
          action: 'setHtml' as const,
          newValue: element.outerHTML,
        };

      default:
        return null;
    }
  }).filter(Boolean) as Patch[];
}
