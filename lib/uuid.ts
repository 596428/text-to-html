/**
 * UUID 생성 유틸리티
 * data-section-id에 사용할 고유 식별자 생성
 */

export function generateSectionId(): string {
  // crypto.randomUUID()를 사용하여 고유 ID 생성
  // 형식: section-{uuid}
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `section-${crypto.randomUUID()}`;
  }

  // fallback: timestamp + random
  return `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
