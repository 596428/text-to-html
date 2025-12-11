# Text-to-HTML Generator v2.2

AI 기반 이미지/자연어 → HTML 자동 생성 및 수정 도구

## 📖 프로젝트 개요

이미지 또는 자연어 설명을 입력하면 Gemini AI가 완성된 HTML 화면을 생성하고, 챗봇을 통해 반복적으로 수정할 수 있는 웹 애플리케이션입니다.

### 핵심 기능

- 🖼️ **이미지 → HTML 변환**: 디자인 이미지를 업로드하면 HTML로 자동 변환
- 🤖 **AI HTML 생성**: Gemini API로 자연어 → 완전한 HTML 변환
- 🎨 **비주얼 HTML 에디터**: 테이블/Flex 레이아웃 편집기
- 💬 **챗봇 수정**: 자연어로 화면 수정 요청
- 📦 **버전 관리**: 생성/수정 히스토리 관리
- 🧩 **컴포넌트 라이브러리**: 재사용 가능한 컴포넌트 저장/불러오기
- 💾 **다운로드**: 단일 HTML 파일로 저장
- 🐳 **Docker 지원**: 컨테이너 기반 배포

## 🛠️ 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand
- **UI**: react-rnd, react-moveable

### Backend
- **AI**: Google Gemini 2.0 Flash
- **Database**: MongoDB Atlas
- **Python Backend**: FastAPI (chat-service)

### Infrastructure
- **Container**: Docker, Docker Compose
- **Deployment**: Cloudflare Tunnel

## 📁 프로젝트 구조

```
text-to-html/
├── app/
│   ├── page.tsx                    # 메인 에디터 페이지
│   └── api/
│       ├── generate/               # HTML 생성 API
│       ├── modify/                 # HTML 수정 API
│       ├── regenerate-section/     # 섹션 재생성 API
│       ├── generate-python/        # Python 백엔드 연동
│       └── components/             # 컴포넌트 라이브러리 API
├── components/
│   ├── Canvas/                     # 통합 에디터 컴포넌트
│   │   ├── CanvasEditor.tsx        # 메인 에디터
│   │   ├── HTMLEditor.tsx          # HTML 직접 편집
│   │   ├── TableLayoutEditor.tsx   # 테이블 레이아웃 편집
│   │   ├── FlexLayoutEditor.tsx    # Flex 레이아웃 편집
│   │   ├── IframePreview.tsx       # 실시간 프리뷰
│   │   ├── ComponentLibrary.tsx    # 컴포넌트 라이브러리
│   │   └── ...
│   └── ChatPanel/                  # 챗봇 UI
├── lib/
│   ├── gemini.ts                   # Gemini API 클라이언트
│   ├── store.ts                    # Zustand 상태 관리
│   ├── mongodb.ts                  # MongoDB 연결
│   ├── chat-api.ts                 # 채팅 API 클라이언트
│   ├── patch-utils.ts              # HTML 패치 유틸리티
│   └── componentLibrary.ts         # 컴포넌트 관리
├── chat-service/                   # Python FastAPI 백엔드
│   ├── app/
│   │   ├── routes/                 # API 라우트
│   │   ├── services/               # 비즈니스 로직
│   │   └── utils/                  # 유틸리티
│   └── venv/                       # Python 가상환경
├── python-backend/                 # 레이아웃 분석 백엔드
├── types/                          # TypeScript 타입 정의
├── docs/                           # 개발 문서
├── Dockerfile                      # Docker 이미지 설정
├── docker-compose.yml              # Docker Compose 설정
└── README.md
```

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 프로젝트 클론
git clone https://github.com/596428/text-to-html.git
cd text-to-html

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

### 2. 환경 변수 설정

`.env.local` 파일 편집:

```bash
# Gemini API Keys (로드밸런싱 지원)
GEMINI_API_KEY_1=your_primary_key
GEMINI_API_KEY_2=your_backup_key

# MongoDB (선택사항 - 사용량 로깅용)
MONGODB_URI=mongodb+srv://...

# App Config
NEXT_PUBLIC_APP_NAME="Text-to-HTML Generator"
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 4. Docker로 실행 (선택사항)

```bash
# 이미지 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 📖 사용 방법

### 이미지로 HTML 생성
1. 상단 입력창 옆 📷 버튼 클릭
2. 디자인 이미지 업로드
3. "HTML 생성" 버튼 클릭
4. AI가 이미지를 분석하여 HTML 생성

### 텍스트로 HTML 생성
1. 상단 입력창에 원하는 화면 설명 입력
2. "HTML 생성" 버튼 클릭
3. 생성된 HTML 확인

### 챗봇으로 수정
1. 우측 채팅창에 수정 요청 입력
   - 예: "헤더 배경색을 파란색으로 변경해줘"
   - 예: "버튼을 더 크게 만들어줘"
2. AI가 요청을 분석하여 HTML 수정

### 비주얼 에디터 사용
1. 프리뷰에서 요소 클릭하여 선택
2. 툴바에서 편집 모드 선택 (테이블/Flex)
3. 드래그앤드롭으로 레이아웃 조정

## 📚 문서

| 문서 | 설명 |
|------|------|
| [USER-GUIDE.md](./USER-GUIDE.md) | 사용자 가이드 |
| [DOCKER-README.md](./DOCKER-README.md) | Docker 배포 가이드 |
| [DEPLOYMENT-PACKAGE.md](./DEPLOYMENT-PACKAGE.md) | 배포 패키지 정보 |
| [docs/](./docs/) | 개발 문서 |

## 🔌 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/generate` | HTML 생성 (이미지/텍스트) |
| POST | `/api/modify` | HTML 수정 |
| POST | `/api/regenerate-section` | 섹션 재생성 |
| GET/POST | `/api/components` | 컴포넌트 라이브러리 |

## 🌐 배포

### Cloudflare Tunnel

```bash
cloudflared tunnel run text-to-html
```

https://acacia.chat 으로 접속

### Docker 배포

```bash
docker build -t text-to-html .
docker run -p 3000:3000 text-to-html
```

## 🔧 개발

### 주요 스크립트

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # 린트 검사
```

### Python 백엔드 (chat-service)

```bash
cd chat-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 📝 라이센스

MIT License

## 🙋 문의

- 웹사이트: https://acacia.chat
- GitHub: https://github.com/596428/text-to-html
