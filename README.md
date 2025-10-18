# Text-to-HTML Generator 🚀

AI 기반 자연어 → HTML 자동 생성 도구

## 📖 프로젝트 개요

사용자가 자연어로 설명하면 Gemini AI가 완성된 HTML 화면을 생성하고, 챗봇을 통해 반복적으로 수정할 수 있는 웹 애플리케이션입니다.

### 핵심 기능

- 🎨 **그리드 기반 레이아웃 에디터**: 12컬럼 드래그앤드롭 시스템
- 🤖 **AI HTML 생성**: Gemini API로 자연어 → 완전한 HTML 변환
- 🖼️ **실시간 프리뷰**: 생성된 HTML을 즉시 시각화
- 💬 **챗봇 수정**: 자연어로 화면 수정 요청
- 📦 **버전 관리**: 생성/수정 히스토리 관리
- 💾 **다운로드**: 단일 HTML 파일로 저장

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **State Management**: Zustand
- **AI**: Google Gemini 1.5 Pro
- **UI Components**: react-rnd (드래그앤드롭)
- **Deployment**: Cloudflare Tunnel

## 📁 프로젝트 구조

```
text-to-html/
├── app/
│   ├── page.tsx                 # 메인 3-Panel 레이아웃
│   └── api/
│       ├── generate/route.ts    # HTML 생성 API
│       └── modify/route.ts      # HTML 수정 API
├── components/
│   ├── LayoutEditor/            # 좌측: 레이아웃 에디터
│   ├── PreviewPanel/            # 중앙: 프리뷰
│   └── ChatPanel/               # 우측: 챗봇
├── lib/
│   ├── store.ts                 # Zustand 상태 관리
│   └── gemini.ts                # Gemini API 클라이언트
├── types/
│   └── index.ts                 # TypeScript 타입 정의
├── docs/                        # 구현 가이드 문서
│   ├── P1-A-LAYOUT-EDITOR.md
│   ├── P2-A-GEMINI-API.md
│   └── ...
├── WORKFLOW.md                  # 병렬 작업 워크플로우
└── README.md                    # 이 파일
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 프로젝트 클론 후 이동
cd text-to-html

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local에 Gemini API 키 입력
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 3. 사용 방법

1. **좌측 패널**: "박스 추가" 버튼으로 레이아웃 구성
2. **박스 내부**: 각 영역에 대한 설명 입력 (예: "상단 헤더 - 로고와 네비게이션")
3. **중앙 패널**: "HTML 생성" 버튼 클릭
4. **결과 확인**: 생성된 화면을 프리뷰에서 확인
5. **우측 챗봇**: 수정 요청 입력 (예: "헤더를 더 크게 만들어줘")

## 📚 문서

- **워크플로우**: [`WORKFLOW.md`](./WORKFLOW.md) - 병렬 작업 가이드
- **구현 가이드**: [`docs/`](./docs/) - Phase별 상세 구현

## 🔑 환경 변수

`.env.local` 파일 생성:

```bash
# Gemini API Keys (최소 1개 필수)
GEMINI_API_KEY_1=your_primary_key_here
GEMINI_API_KEY_2=your_backup_key_here

# App Config
NEXT_PUBLIC_APP_NAME="Text-to-HTML Generator"
```

## 🧪 테스트

### API 테스트

```bash
# HTML 생성 API
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"boxes": [{"id": "1", "x": 0, "y": 0, "width": 12, "height": 300, "content": "헤더"}]}'

# HTML 수정 API
curl -X POST http://localhost:3000/api/modify \
  -H "Content-Type: application/json" \
  -d '{"currentHTML": "<html>...</html>", "userRequest": "배경색 변경"}'
```

## 🌐 배포

### Cloudflare Tunnel

```bash
# 터널 생성
cloudflared tunnel create text-to-html

# 라우팅 설정
cloudflared tunnel route dns text-to-html acacia.chat

# 터널 실행
cloudflared tunnel run text-to-html
```

https://acacia.chat 으로 접속 가능

## 📋 TODO

- [x] P0: 프로젝트 기반 설정
- [ ] P1-A: 레이아웃 에디터
- [ ] P1-B: 프리뷰 패널
- [ ] P1-C: 챗봇 UI
- [ ] P2-A: Gemini API 통합
- [ ] P2-B: 버전 관리
- [ ] P3: 배포

## 🤝 기여

병렬 작업을 위한 세션별 할당:

| Session | Phase | 상태 |
|---------|-------|------|
| Session 1 | P0 + P3 | ⏳ 진행 중 |
| Session 2 | P1-A | ⏸️ 대기 중 |
| Session 3 | P1-B | ⏸️ 대기 중 |
| Session 4 | P1-C | ⏸️ 대기 중 |
| Session 5 | P2-A | ⏸️ 대기 중 |
| Session 6 | P2-B | ⏸️ 대기 중 |

## 📝 라이센스

MIT License

## 🙋 문의

프로젝트 관련 문의: acacia.chat
