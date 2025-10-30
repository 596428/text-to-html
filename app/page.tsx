'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Canvas = dynamic(() => import('@/components/Canvas/Canvas'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function Home() {
  const [showChat, setShowChat] = useState(false);
  const [showUpdateHistory, setShowUpdateHistory] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 헤더 */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Text-to-HTML Generator</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUpdateHistory(true)}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-colors text-sm"
            >
              📋 업데이트 내역
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-colors text-sm"
            >
              {showChat ? '💬 챗봇 숨기기' : '💬 챗봇 표시'}
            </button>
            <div className="text-sm opacity-90">version 2.2.42</div>
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

      {/* 업데이트 내역 팝업 */}
      {showUpdateHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-[600px] max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">📋 업데이트 내역</h2>
              <button
                onClick={() => setShowUpdateHistory(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* v2.2.42 */}
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">version 2.2.42 (Beta)</h3>
                <p className="text-sm text-gray-500 mb-4">2025.10.30</p>

                <div className="space-y-4">
                  {/* 멀티모달 기능 */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">🖼️ 이미지 업로드 기능 (Beta)</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>이미지 기반 HTML 생성</strong>
                          <p className="text-gray-600 mt-1">Simple 레이아웃에서 이미지를 업로드하여 Gemini AI가 이미지를 분석하고 HTML로 재현합니다. + 📷 버튼을 클릭하거나 이미지를 드래그&드롭하세요.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>텍스트 설명 추가 가능</strong>
                          <p className="text-gray-600 mt-1">이미지 업로드 후 텍스트 박스에 추가 설명이나 요청사항을 작성하면 이미지와 함께 반영됩니다.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* 주의사항 */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">⚠️ 주의사항</h4>
                    <ul className="space-y-1 text-sm text-yellow-700">
                      <li><strong>지원 포맷:</strong> JPG, JPEG, PNG, WEBP</li>
                      <li><strong>파일 크기:</strong> 최대 4MB (초과 시 업로드 불가)</li>
                      <li><strong>큰 이미지:</strong> 지나치게 큰 화면의 이미지는 생성 실패 가능 (개선 작업 중)</li>
                      <li><strong>결과 일관성:</strong> 같은 이미지로 여러 번 생성 시 결과물에 차이가 있을 수 있음 (AI 특성)</li>
                      <li><strong>Beta 기능:</strong> 현재 안정성 개선 및 성능 최적화 작업 진행 중</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* v2.2.41 */}
              <div className="border-l-4 border-gray-400 pl-4">
                <h3 className="text-lg font-bold text-gray-800 mb-2">version 2.2.41</h3>
                <p className="text-sm text-gray-500 mb-4">2025.10.30</p>

                <div className="space-y-4">
                  {/* Table 레이아웃 개선 */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">📊 Table 레이아웃 개선</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>복사-붙여넣기 기능 (Ctrl+C/V)</strong>
                          <p className="text-gray-600 mt-1">Excel과 완전히 호환되는 복사-붙여넣기 기능입니다. 내부 테이블 간, Excel↔테이블 간 자유롭게 데이터를 복사할 수 있습니다. 1×1, N×1, 1×N, N×M 모든 형태 지원.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>일괄 삭제 기능 (Delete/Backspace)</strong>
                          <p className="text-gray-600 mt-1">여러 셀을 선택한 후 Delete 또는 Backspace 키를 누르면 선택된 모든 셀의 내용이 한 번에 삭제됩니다.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* v2.2.4 */}
              <div className="border-l-4 border-gray-400 pl-4">
                <h3 className="text-lg font-bold text-gray-600 mb-2">version 2.2.4</h3>
                <p className="text-sm text-gray-400 mb-4">2025.10.29</p>

                <div className="space-y-4">
                  {/* Table 레이아웃 개선 */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">📊 Table 레이아웃 개선</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>드래그를 통한 셀 병합 기능</strong>
                          <p className="text-gray-600 mt-1">마우스 드래그로 여러 셀을 선택한 후 "셀 병합" 버튼을 클릭하여 간편하게 셀을 병합할 수 있습니다. Ctrl+클릭으로 개별 셀을 추가/제거할 수도 있습니다.</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>빈칸 채우기 - 단순 복사</strong>
                          <p className="text-gray-600 mt-1">셀을 선택하고 우하단 파란 사각형(fill handle)을 드래그하면 선택한 셀의 값을 복사하여 채웁니다. Excel과 동일한 방식으로 작동합니다. (자연수만 가능)</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <div>
                          <strong>빈칸 채우기 - 등차수열 방식</strong>
                          <p className="text-gray-600 mt-1">2개의 셀을 선택(Ctrl+클릭)하고 fill handle을 드래그하면 패턴을 인식하여 자동으로 등차수열을 생성합니다. 예: 1, 3 선택 → 5, 7, 9... (+2씩 증가)</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">🐛</span>
                        <div>
                          <strong>버그 수정: 텍스트 박스 드래그 불가 문제</strong>
                          <p className="text-gray-600 mt-1">셀 내부 텍스트 박스에서 마우스 드래그로 텍스트를 선택할 수 없던 문제를 수정했습니다.</p>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* HTML 프리뷰 개선 */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">🖥️ HTML 프리뷰 페이지 개선</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600 font-bold">🐛</span>
                        <div>
                          <strong>버그 수정: 브라우저 Zoom 호환성</strong>
                          <p className="text-gray-600 mt-1">브라우저 zoom 배율을 변경할 때 Gemini 생성 컴포넌트와 DB 불러온 컴포넌트의 정렬이 달라지던 문제를 수정했습니다. 이제 모든 컴포넌트가 동일한 container 내부에 배치되어 일관된 정렬을 유지합니다.</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* v2.2.3 */}
              <div className="border-l-4 border-gray-400 pl-4">
                <h3 className="text-lg font-bold text-gray-600 mb-2">version 2.2.3</h3>
                <p className="text-sm text-gray-400 mb-2">이전 버전</p>
                <p className="text-sm text-gray-600">Grid 레이아웃 및 Scale 조정 기능 추가</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
