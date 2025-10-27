'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('@/components/Canvas/Canvas'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function Home() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Text-to-HTML Generator</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-colors text-sm"
            >
              {showChat ? '💬 챗봇 숨기기' : '💬 챗봇 표시'}
            </button>
            <div className="text-sm opacity-90">Last Modified: 2025-10-20 09:24</div>
          </div>
        </div>
      </header>

      {/* 메인 2-Panel */}
      <main className="flex-1 flex overflow-hidden">
        {/* 좌측: Canvas (편집 + 프리뷰) */}
        <section
          className={`${showChat ? 'w-[70%]' : 'w-full'} border-r border-gray-300 bg-white shadow-xl transition-all duration-300`}
        >
          <Canvas />
        </section>

        {/* 우측: 챗봇 (조건부 표시) */}
        {showChat && (
          <section className="w-[30%] bg-white shadow-xl">
            <ChatPanel />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-3 px-6">
        <div className="flex flex-col items-center justify-center text-sm gap-1">
          <div>ttyr6590@familidata.co.kr</div>
        </div>
      </footer>
    </div>
  );
}
