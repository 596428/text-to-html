'use client';

import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('@/components/Canvas/Canvas'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Text-to-HTML Generator</h1>
          <div className="text-sm opacity-90">Last Modified: 2025-10-20 09:24</div>
        </div>
      </header>

      {/* 메인 2-Panel */}
      <main className="flex-1 flex overflow-hidden">
        {/* 좌측: Canvas (편집 + 프리뷰) (70%) */}
        <section className="w-[70%] border-r border-gray-300 bg-white shadow-xl">
          <Canvas />
        </section>

        {/* 우측: 챗봇 (30%) */}
        <section className="w-[30%] bg-white shadow-xl">
          <ChatPanel />
        </section>
      </main>
    </div>
  );
}
