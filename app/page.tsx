'use client';

import dynamic from 'next/dynamic';

const LayoutEditor = dynamic(() => import('@/components/LayoutEditor'), { ssr: false });
const PreviewPanel = dynamic(() => import('@/components/PreviewPanel'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Text-to-HTML Generator</h1>
          <div className="text-sm opacity-90">AI-Powered Web Design</div>
        </div>
      </header>

      {/* 메인 3-Panel */}
      <main className="flex-1 flex overflow-hidden">
        {/* 좌측: 레이아웃 에디터 (30%) */}
        <section className="w-[30%] border-r border-gray-300 bg-white shadow-xl">
          <LayoutEditor />
        </section>

        {/* 중앙: 프리뷰 (40%) */}
        <section className="w-[40%] border-r border-gray-300 bg-gray-50">
          <PreviewPanel />
        </section>

        {/* 우측: 챗봇 (30%) */}
        <section className="w-[30%] bg-white shadow-xl">
          <ChatPanel />
        </section>
      </main>
    </div>
  );
}
