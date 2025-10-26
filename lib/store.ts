import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, Box, ChatMessage, HTMLVersion } from '@/types';
import { DEFAULT_BOX_WIDTH, DEFAULT_BOX_HEIGHT } from '@/lib/constants';

// ========== 마이그레이션 함수 ==========
// 기존 Box 데이터를 새 스키마로 변환
function migrateBox(box: Partial<Box>): Box {
  return {
    ...box,
    id: box.id!,
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
        htmlVersions: [],
        currentVersion: 0,
        chatMessages: [],
        isGenerating: false,
        error: null,

        // ========== 레이아웃 액션 ==========
        addBox: () => set((state) => {
          const newBox: Box = {
            id: `box-${Date.now()}`,
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
          const newVersion: HTMLVersion = {
            version: state.htmlVersions.length + 1,
            html,
            prompt,
            timestamp: new Date()
          };
          return {
            htmlVersions: [...state.htmlVersions, newVersion],
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
        setError: (error) => set({ error })
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
          return { ...persistedState, ...migrated };
        }
      }
    )
  )
);
