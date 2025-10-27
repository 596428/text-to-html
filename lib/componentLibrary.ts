// ============ 컴포넌트 라이브러리 관리 ============
// Phase 5: localStorage 기반 컴포넌트 저장/불러오기

import { SavedComponent } from '@/types';

const STORAGE_KEY = 'text-to-html-saved-components';

/**
 * 모든 저장된 컴포넌트 가져오기
 */
export function getAllComponents(): SavedComponent[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('컴포넌트 불러오기 오류:', error);
    return [];
  }
}

/**
 * 컴포넌트 저장
 */
export function saveComponent(component: Omit<SavedComponent, 'id' | 'createdAt'>): SavedComponent {
  const existing = getAllComponents();

  const newComponent: SavedComponent = {
    ...component,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  existing.push(newComponent);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

  return newComponent;
}

/**
 * ID로 컴포넌트 가져오기
 */
export function getComponentById(id: string): SavedComponent | null {
  const components = getAllComponents();
  return components.find(c => c.id === id) || null;
}

/**
 * 컴포넌트 삭제
 */
export function deleteComponent(id: string): boolean {
  const components = getAllComponents();
  const filtered = components.filter(c => c.id !== id);

  if (filtered.length === components.length) {
    return false; // 삭제할 항목이 없음
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * 컴포넌트 업데이트
 */
export function updateComponent(id: string, updates: Partial<Omit<SavedComponent, 'id' | 'createdAt'>>): boolean {
  const components = getAllComponents();
  const index = components.findIndex(c => c.id === id);

  if (index === -1) return false;

  components[index] = {
    ...components[index],
    ...updates,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
  return true;
}

/**
 * 검색 (이름, 설명, 태그)
 */
export function searchComponents(query: string): SavedComponent[] {
  const components = getAllComponents();
  const lowerQuery = query.toLowerCase();

  return components.filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery) ||
    (c.tags && c.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
}

/**
 * 저장 용량 확인 (KB)
 */
export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return 0;

  // 문자열 길이 × 2 (UTF-16 인코딩)
  return (data.length * 2) / 1024;
}
