import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, Box, ChatMessage, HTMLVersion } from '@/types';
import { DEFAULT_BOX_WIDTH, DEFAULT_BOX_HEIGHT } from '@/lib/constants';
import { generateSectionId } from '@/lib/uuid';

// ========== 마이그레이션 함수 ==========
// 기존 Box 데이터를 새 스키마로 변환
function migrateBox(box: Partial<Box>): Box {
  return {
    ...box,
    id: box.id!,
    sectionId: box.sectionId ?? generateSectionId(), // UUID 없으면 생성
    x: box.x ?? 0,
    y: box.y ?? 0,
    width: box.width ?? DEFAULT_BOX_WIDTH,
    height: box.height ?? DEFAULT_BOX_HEIGHT,
    content: box.content ?? '',
    // 새 필드는 선택적이므로 기본값 불필요 (undefined 허용)
    layoutType: box.layoutType ?? 'simple', // 기본: simple 레이아웃
  };
}

// 저장된 상태 마이그레이션
function migrateState(state: any): Partial<AppState> {
  if (!state) return {};

  return {
    boxes: (state.boxes ?? []).map(migrateBox),
    htmlVersions: state.htmlVersions ?? [],
    currentVersion: state.currentVersion ?? 0,
  };
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // ========== 초기 상태 ==========
        canvasMode: 'edit' as const,
        boxes: [],
        selectedBoxId: null,
        selectedSectionId: null, // 프리뷰에서 선택된 섹션 ID
        previewScale: 100, // 기본 100%
        htmlVersions: [],
        currentVersion: 0,
        chatMessages: [],
        isGenerating: false,
        error: null,

        // ========== 레이아웃 액션 ==========
        addBox: () => set((state) => {
          const newBox: Box = {
            id: `box-${Date.now()}`,
            sectionId: generateSectionId(), // UUID 생성
            x: 0,
            y: state.boxes.length * 250,
            width: DEFAULT_BOX_WIDTH,
            height: DEFAULT_BOX_HEIGHT,
            content: '',
            layoutType: 'simple' // 기본값: simple 레이아웃
          };
          return { boxes: [...state.boxes, newBox] };
        }),

        updateBox: (id, updates) => set((state) => ({
          boxes: state.boxes.map(box =>
            box.id === id ? { ...box, ...updates } : box
          )
        })),

        removeBox: (id) => set((state) => ({
          boxes: state.boxes.filter(box => box.id !== id),
          selectedBoxId: state.selectedBoxId === id ? null : state.selectedBoxId
        })),

        selectBox: (id) => set({ selectedBoxId: id }),

        clearBoxes: () => set({ boxes: [], selectedBoxId: null }),

        setBoxes: (boxes) => set({ boxes, selectedBoxId: null }),

        // ========== 팝업 관리 ==========
        setBoxPopup: (boxId, popupContent) => set((state) => ({
          boxes: state.boxes.map(box =>
            box.id === boxId ? { ...box, popupContent } : box
          )
        })),

        // ========== HTML 버전 관리 ==========
        addVersion: (html, prompt) => set((state) => {
          // 마지막 버전 번호 기준으로 증가 (30개 제한 시에도 연속성 유지)
          const lastVersion = state.htmlVersions.length > 0
            ? Math.max(...state.htmlVersions.map(v => v.version))
            : 0;

          const newVersion: HTMLVersion = {
            version: lastVersion + 1,
            html,
            prompt,
            timestamp: new Date()
          };
          const updatedVersions = [...state.htmlVersions, newVersion];

          // 최근 30개 버전만 유지 (메모리 누적 방지)
          const limitedVersions = updatedVersions.slice(-30);

          return {
            htmlVersions: limitedVersions,
            currentVersion: newVersion.version
          };
        }),

        goToVersion: (version) => set({ currentVersion: version }),

        // ========== 챗봇 액션 ==========
        addMessage: (message) => set((state) => ({
          chatMessages: [...state.chatMessages, message]
        })),

        clearChat: () => set({ chatMessages: [] }),

        // ========== UI 상태 ==========
        setCanvasMode: (mode) => set({ canvasMode: mode }),
        setGenerating: (value) => set({ isGenerating: value }),
        setError: (error) => set({ error }),
        setSelectedSectionId: (id) => set({ selectedSectionId: id }),
        setPreviewScale: (scale) => set({ previewScale: scale })
      }),
      {
        name: 'text-to-html-storage',
        version: 1, // 버전 추가 (향후 마이그레이션 추적용)
        partialize: (state) => ({
          boxes: state.boxes,
          htmlVersions: state.htmlVersions,
          currentVersion: state.currentVersion
        }),
        // 스토리지에서 읽어올 때 마이그레이션 적용
        migrate: (persistedState: any, version: number) => {
          const migrated = migrateState(persistedState);

          // 30개 초과 버전 정리 (기존 사용자 대응)
          if (migrated.htmlVersions && migrated.htmlVersions.length > 30) {
            console.log(`[Migration] ${migrated.htmlVersions.length}개 버전 발견, 최근 30개로 정리`);
            const limitedVersions = migrated.htmlVersions.slice(-30);
            const maxVersion = Math.max(...limitedVersions.map((v: any) => v.version));

            return {
              ...persistedState,
              ...migrated,
              htmlVersions: limitedVersions,
              currentVersion: maxVersion // 가장 최신 버전으로 설정
            };
          }

          return { ...persistedState, ...migrated };
        }
      }
    )
  )
);
