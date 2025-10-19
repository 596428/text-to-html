import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { AppState, Box, ChatMessage, HTMLVersion } from '@/types';
import { DEFAULT_BOX_WIDTH, DEFAULT_BOX_HEIGHT } from '@/lib/constants';

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
            content: ''
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
        partialize: (state) => ({
          boxes: state.boxes,
          htmlVersions: state.htmlVersions,
          currentVersion: state.currentVersion
        })
      }
    )
  )
);
