# Phase 6: Docker 배포

**목표**: 회사 환경 배포 준비
**예상 기간**: 1일
**브랜치**: `feature/phase-6-docker`
**담당 세션**: Session A (Master)

---

## 배포 전략

```
Development → Staging → Production
     ↓            ↓          ↓
  localhost    Docker     회사 서버
```

---

## 1. Dockerfile 작성

```dockerfile
# Dockerfile

# === Build Stage ===
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치 (캐싱 최적화)
COPY package.json package-lock.json ./
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# Next.js standalone 빌드
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# === Production Stage ===
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: non-root 유저 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 필요한 파일만 복사 (standalone 모드)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 환경 변수
ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 유저 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 실행
CMD ["node", "server.js"]
```

---

## 2. docker-compose.yml

```yaml
# docker-compose.yml

version: '3.8'

services:
  text-to-html:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: text-to-html-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Gemini API Keys (3개)
      - GEMINI_API_KEY_1=${GEMINI_API_KEY_1}
      - GEMINI_API_KEY_2=${GEMINI_API_KEY_2}
      - GEMINI_API_KEY_3=${GEMINI_API_KEY_3}

      # Node 환경
      - NODE_ENV=production

      # Next.js 설정
      - NEXT_TELEMETRY_DISABLED=1

    volumes:
      # 로그 볼륨 (선택사항)
      - ./logs:/app/logs

    networks:
      - text-to-html-network

    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

networks:
  text-to-html-network:
    driver: bridge
```

---

## 3. 환경 변수 관리

### 3.1. .env.example 생성

```bash
# .env.example

# Gemini API Keys (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY_1=your_api_key_1_here
GEMINI_API_KEY_2=your_api_key_2_here
GEMINI_API_KEY_3=your_api_key_3_here

# Node Environment
NODE_ENV=production

# Next.js
NEXT_TELEMETRY_DISABLED=1
```

### 3.2. .dockerignore

```
# .dockerignore

node_modules
.next
.git
.gitignore
.env*.local
npm-debug.log
Dockerfile
docker-compose.yml
README.md
docs
tests
.vscode
.idea
*.md
!README.md
logs
Testcase
claudedocs
.claude
```

---

## 4. Next.js 설정 업데이트

```javascript
// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone 모드 (Docker 최적화)
  output: 'standalone',

  // 이미지 최적화
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // 압축
  compress: true,

  // 보안 헤더
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  },
};

module.exports = nextConfig;
```

---

## 5. 헬스체크 API

```typescript
// app/api/health/route.ts

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 기본 헬스체크
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    // Gemini API 키 검증
    const apiKeysAvailable = [
      process.env.GEMINI_API_KEY_1,
      process.env.GEMINI_API_KEY_2,
      process.env.GEMINI_API_KEY_3,
    ].filter(Boolean).length;

    if (apiKeysAvailable === 0) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'No Gemini API keys configured',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        ...health,
        apiKeysAvailable,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}
```

---

## 6. 배포 스크립트

### 6.1. 로컬 빌드 및 테스트

```bash
#!/bin/bash
# scripts/docker-local-test.sh

set -e

echo "🔨 Building Docker image..."
docker build -t text-to-html:local .

echo "🧪 Running health check..."
docker run -d --name text-to-html-test -p 3001:3000 \
  -e GEMINI_API_KEY_1="$GEMINI_API_KEY_1" \
  -e GEMINI_API_KEY_2="$GEMINI_API_KEY_2" \
  -e GEMINI_API_KEY_3="$GEMINI_API_KEY_3" \
  text-to-html:local

sleep 5

HEALTH=$(curl -s http://localhost:3001/api/health | jq -r '.status')

if [ "$HEALTH" = "healthy" ]; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  docker logs text-to-html-test
  docker stop text-to-html-test
  docker rm text-to-html-test
  exit 1
fi

docker stop text-to-html-test
docker rm text-to-html-test

echo "✅ Local Docker test completed successfully"
```

### 6.2. 프로덕션 배포

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "🚀 Starting production deployment..."

# 1. 환경 변수 확인
if [ ! -f .env ]; then
  echo "❌ .env file not found"
  exit 1
fi

# 2. 기존 컨테이너 중지 (있다면)
if [ "$(docker ps -q -f name=text-to-html-app)" ]; then
  echo "🛑 Stopping existing container..."
  docker-compose down
fi

# 3. 최신 코드 pull (Git 사용 시)
echo "📥 Pulling latest code..."
git pull origin main

# 4. 의존성 업데이트
echo "📦 Installing dependencies..."
npm ci

# 5. Docker 이미지 빌드
echo "🔨 Building Docker image..."
docker-compose build --no-cache

# 6. 컨테이너 시작
echo "🚀 Starting container..."
docker-compose up -d

# 7. 헬스체크
echo "🧪 Waiting for service to be healthy..."
sleep 10

RETRY=0
MAX_RETRY=30

while [ $RETRY -lt $MAX_RETRY ]; do
  HEALTH=$(curl -s http://localhost:3000/api/health | jq -r '.status')

  if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Service is healthy!"
    echo "🎉 Deployment completed successfully"
    docker-compose ps
    exit 0
  fi

  echo "⏳ Waiting... ($RETRY/$MAX_RETRY)"
  RETRY=$((RETRY+1))
  sleep 2
done

echo "❌ Deployment failed - service not healthy"
docker-compose logs
exit 1
```

### 6.3. 롤백 스크립트

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

echo "⏪ Rolling back to previous version..."

# 1. 현재 컨테이너 중지
docker-compose down

# 2. 이전 브랜치로 체크아웃
git checkout HEAD~1

# 3. 재배포
./scripts/deploy-production.sh

echo "✅ Rollback completed"
```

---

## 7. 모니터링 및 로그

### 7.1. 로그 수집

```bash
# 실시간 로그 확인
docker-compose logs -f

# 특정 시간 이후 로그
docker-compose logs --since 30m

# 에러만 필터링
docker-compose logs | grep ERROR
```

### 7.2. 리소스 모니터링

```bash
#!/bin/bash
# scripts/monitor.sh

echo "📊 Container Resource Usage:"
docker stats text-to-html-app --no-stream

echo ""
echo "📋 Container Info:"
docker inspect text-to-html-app | jq '.[0].State'

echo ""
echo "🏥 Health Status:"
curl -s http://localhost:3000/api/health | jq
```

---

## 8. 업데이트 절차

```markdown
# 운영 환경 업데이트 절차

## 1. 백업
- [ ] 현재 .env 파일 백업
- [ ] 현재 Git 커밋 해시 기록
- [ ] 데이터베이스 백업 (해당 시)

## 2. 코드 업데이트
- [ ] `git pull origin main`
- [ ] `npm ci` (의존성 업데이트)

## 3. 환경 변수 확인
- [ ] .env 파일에 새로운 환경 변수 추가 필요한지 확인
- [ ] .env.example과 비교

## 4. 빌드 및 배포
- [ ] `./scripts/deploy-production.sh` 실행
- [ ] 헬스체크 통과 확인

## 5. 검증
- [ ] 브라우저에서 http://localhost:3000 접속
- [ ] 기본 기능 테스트 (Box 생성, HTML 생성)
- [ ] 로그 확인 (에러 없는지)

## 6. 문제 발생 시
- [ ] `./scripts/rollback.sh` 실행
- [ ] 로그 확인 및 이슈 기록
```

---

## 9. 트러블슈팅

### 9.1. 일반적인 문제

```yaml
문제: "Container keeps restarting"
해결:
  - docker logs text-to-html-app 확인
  - .env 파일 환경 변수 확인
  - 헬스체크 API 응답 확인

문제: "Port 3000 already in use"
해결:
  - lsof -i :3000 으로 프로세스 확인
  - 기존 프로세스 종료 또는 포트 변경

문제: "Gemini API timeout"
해결:
  - API 키 유효성 확인
  - 네트워크 연결 확인
  - API 키 로테이션 작동 확인

문제: "Out of memory"
해결:
  - docker-compose.yml에 메모리 제한 추가
  - Node.js 메모리 옵션 조정
```

### 9.2. 성능 최적화

```yaml
# docker-compose.yml 성능 튜닝

services:
  text-to-html:
    # ... 기존 설정 ...

    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

    environment:
      - NODE_OPTIONS=--max-old-space-size=1536
```

---

## 검증 기준

- ✅ `docker-compose up` 한 번에 실행 성공
- ✅ 환경 변수 정상 로드
- ✅ 헬스체크 통과
- ✅ 빌드 시간 3분 이내
- ✅ 배포 스크립트 자동화 완료
- ✅ 롤백 절차 검증

---

## 완료 후

Phase 6 완료 후:
1. **전체 프로젝트 완료**: 모든 Phase 통합
2. **최종 문서화**: 배포 가이드, 사용 설명서
3. **회사 인프라 이관**: Docker 이미지 전달 및 배포 지원

---

**생성일**: 2025-10-26
**담당자**: Session A (Master)
**상태**: ⏳ Phase 5 완료 대기
