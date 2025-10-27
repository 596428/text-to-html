// ============ 컴포넌트 라이브러리 관리 ============
// Phase 5: localStorage 기반 컴포넌트 저장/불러오기

import { SavedComponent } from '@/types';

const STORAGE_KEY = 'text-to-html-saved-components';

/**
 * 모든 저장된 컴포넌트 가져오기
 * (자동 마이그레이션: metadata가 없는 구버전 컴포넌트에 metadata 추가)
 */
export function getAllComponents(): SavedComponent[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const components: SavedComponent[] = JSON.parse(data);
    let needsUpdate = false;

    // 구버전 컴포넌트에 metadata 자동 추가 (마이그레이션)
    const migratedComponents = components.map(comp => {
      if (!comp.metadata) {
        needsUpdate = true;

        // 메타데이터 계산
        const totalSections = (comp.html.match(/data-section-id=/g) || []).length;
        const parser = new DOMParser();
        const doc = parser.parseFromString(comp.html, 'text/html');
        const topLevelSections = doc.querySelectorAll('body > div[data-section-id], body > * > div[data-section-id]:not([data-section-id] [data-section-id])');
        const boxCount = topLevelSections.length;

        return {
          ...comp,
          metadata: {
            boxCount,
            totalSections,
            version: '1.0',
          },
        };
      }
      return comp;
    });

    // 마이그레이션이 발생했으면 localStorage 업데이트
    if (needsUpdate) {
      console.log('📦 컴포넌트 마이그레이션 완료: metadata 추가');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedComponents));
    }

    return migratedComponents;
  } catch (error) {
    console.error('컴포넌트 불러오기 오류:', error);
    return [];
  }
}

/**
 * 컴포넌트 저장
 */
export function saveComponent(component: Omit<SavedComponent, 'id' | 'createdAt' | 'metadata'>): SavedComponent {
  const existing = getAllComponents();

  // 메타데이터 계산 (DB 마이그레이션 대비)
  const totalSections = (component.html.match(/data-section-id=/g) || []).length;

  // 최상위 박스 개수 계산: <div class="..." data-editable="true" data-section-id="..."> 패턴 찾기
  // 부모 요소만 카운트 (자식 요소 제외)
  const parser = new DOMParser();
  const doc = parser.parseFromString(component.html, 'text/html');
  const topLevelSections = doc.querySelectorAll('body > div[data-section-id], body > * > div[data-section-id]:not([data-section-id] [data-section-id])');
  const boxCount = topLevelSections.length;

  const newComponent: SavedComponent = {
    ...component,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    metadata: {
      boxCount,           // 최상위 박스 개수
      totalSections,      // 모든 data-section-id 개수
      version: '1.0',
    },
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
