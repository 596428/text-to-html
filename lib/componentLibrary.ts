// ============ 컴포넌트 라이브러리 관리 ============
// MongoDB Atlas 기반 컴포넌트 저장/불러오기

import { SavedComponent } from '@/types';

const STORAGE_KEY = 'text-to-html-saved-components'; // 마이그레이션용 보존

/**
 * 모든 저장된 컴포넌트 가져오기 (MongoDB에서)
 */
export async function getAllComponents(): Promise<SavedComponent[]> {
  try {
    const response = await fetch('/api/components');
    if (!response.ok) {
      throw new Error(`Failed to fetch components: ${response.statusText}`);
    }
    const data = await response.json();
    return data.components || [];
  } catch (error) {
    console.error('컴포넌트 불러오기 오류:', error);
    return [];
  }
}

/**
 * 컴포넌트 저장 (MongoDB에)
 */
export async function saveComponent(
  component: Omit<SavedComponent, 'id' | 'createdAt' | 'metadata'>
): Promise<SavedComponent> {
  // 메타데이터 계산
  const totalSections = (component.html.match(/data-section-id=/g) || []).length;

  // 최상위 박스 개수 계산
  const parser = new DOMParser();
  const doc = parser.parseFromString(component.html, 'text/html');
  const topLevelSections = doc.querySelectorAll(
    'body > div[data-section-id], body > * > div[data-section-id]:not([data-section-id] [data-section-id])'
  );
  const boxCount = topLevelSections.length;

  const newComponent: SavedComponent = {
    ...component,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    metadata: {
      boxCount,
      totalSections,
      version: '1.0',
    },
  };

  try {
    const response = await fetch('/api/components', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComponent),
    });

    if (!response.ok) {
      throw new Error(`Failed to save component: ${response.statusText}`);
    }

    const data = await response.json();
    return data.component;
  } catch (error) {
    console.error('컴포넌트 저장 오류:', error);
    throw error;
  }
}

/**
 * ID로 컴포넌트 가져오기 (MongoDB에서)
 */
export async function getComponentById(id: string): Promise<SavedComponent | null> {
  try {
    const response = await fetch(`/api/components/${id}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch component: ${response.statusText}`);
    }
    const data = await response.json();
    return data.component;
  } catch (error) {
    console.error('컴포넌트 불러오기 오류:', error);
    return null;
  }
}

/**
 * 컴포넌트 삭제 (MongoDB에서)
 */
export async function deleteComponent(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/components/${id}`, {
      method: 'DELETE',
    });

    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Failed to delete component: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('컴포넌트 삭제 오류:', error);
    return false;
  }
}

/**
 * 컴포넌트 업데이트 (MongoDB에서)
 */
export async function updateComponent(
  id: string,
  updates: Partial<Omit<SavedComponent, 'id' | 'createdAt'>>
): Promise<boolean> {
  try {
    const response = await fetch(`/api/components/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (response.status === 404) {
      return false;
    }
    if (!response.ok) {
      throw new Error(`Failed to update component: ${response.statusText}`);
    }
    return true;
  } catch (error) {
    console.error('컴포넌트 업데이트 오류:', error);
    return false;
  }
}

/**
 * 검색 (이름, 설명, 태그) - 클라이언트 사이드 필터링
 */
export async function searchComponents(query: string): Promise<SavedComponent[]> {
  const components = await getAllComponents();
  const lowerQuery = query.toLowerCase();

  return components.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery) ||
      (c.tags && c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
  );
}

/**
 * 저장 용량 확인 (MongoDB 컬렉션 크기) - 개발용
 */
export async function getStorageSize(): Promise<number> {
  const components = await getAllComponents();
  const totalSize = components.reduce((sum, comp) => {
    return sum + JSON.stringify(comp).length * 2; // UTF-16
  }, 0);
  return totalSize / 1024; // KB
}

// ============ 마이그레이션 유틸리티 ============

/**
 * localStorage에서 MongoDB로 데이터 마이그레이션
 */
export async function migrateFromLocalStorage(): Promise<{
  success: boolean;
  migratedCount: number;
  errors: string[];
}> {
  if (typeof window === 'undefined') {
    return { success: false, migratedCount: 0, errors: ['Not in browser environment'] };
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return { success: true, migratedCount: 0, errors: [] };
    }

    const localComponents: SavedComponent[] = JSON.parse(data);
    const errors: string[] = [];
    let migratedCount = 0;

    for (const comp of localComponents) {
      try {
        // metadata가 없으면 추가
        let migratedComp = comp;
        if (!comp.metadata) {
          const totalSections = (comp.html.match(/data-section-id=/g) || []).length;
          const parser = new DOMParser();
          const doc = parser.parseFromString(comp.html, 'text/html');
          const topLevelSections = doc.querySelectorAll(
            'body > div[data-section-id], body > * > div[data-section-id]:not([data-section-id] [data-section-id])'
          );
          const boxCount = topLevelSections.length;

          migratedComp = {
            ...comp,
            metadata: {
              boxCount,
              totalSections,
              version: '1.0',
            },
          };
        }

        // MongoDB에 저장
        const response = await fetch('/api/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(migratedComp),
        });

        if (response.ok) {
          migratedCount++;
        } else if (response.status === 409) {
          // 중복 ID는 스킵
          console.log(`컴포넌트 ${comp.id} 이미 존재 (스킵)`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        errors.push(`${comp.id}: ${error}`);
      }
    }

    return { success: true, migratedCount, errors };
  } catch (error) {
    return {
      success: false,
      migratedCount: 0,
      errors: [`마이그레이션 실패: ${error}`],
    };
  }
}

/**
 * localStorage에서 기존 컴포넌트 가져오기 (마이그레이션 전용)
 */
export function getLocalStorageComponents(): SavedComponent[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('localStorage 읽기 오류:', error);
    return [];
  }
}
