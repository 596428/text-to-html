# Docker 배포 가이드

**목적**: Text-to-HTML Generator를 Docker 컨테이너로 배포하는 전체 프로세스 안내

---

## 사전 요구사항

### 설치 필요

```bash
# Docker 설치 확인
docker --version
# Docker version 24.0.0 이상

# Docker Compose 설치 확인
docker-compose --version
# Docker Compose version 2.0.0 이상

# Node.js (로컬 개발용)
node --version
# v20.0.0 이상
```

### 환경 준비

```bash
# 1. 프로젝트 클론
git clone [repository-url]
cd text-to-html

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # API 키 입력
```

---

## 환경 변수 설정

### .env 파일 생성

```bash
# .env

# Gemini API Keys (https://aistudio.google.com/app/apikey에서 발급)
GEMINI_API_KEY_1=AIzaSy...your_key_1
GEMINI_API_KEY_2=AIzaSy...your_key_2
GEMINI_API_KEY_3=AIzaSy...your_key_3

# Node Environment
NODE_ENV=production

# Next.js
NEXT_TELEMETRY_DISABLED=1
```

### API 키 발급 방법

1. https://aistudio.google.com/app/apikey 접속
2. Google 계정 로그인
3. "Create API Key" 클릭
4. 생성된 키를 .env 파일에 복사

**권장**: 3개 API 키 사용으로 요청 제한 우회

---

## 로컬 테스트

### Docker 이미지 빌드

```bash
# 1. 이미지 빌드
docker build -t text-to-html:local .

# 빌드 시간: 약 2-3분
# 이미지 크기: 약 500MB
```

### 컨테이너 실행

```bash
# 2. 컨테이너 실행
docker run -d \
  --name text-to-html-test \
  -p 3001:3000 \
  -e GEMINI_API_KEY_1="$GEMINI_API_KEY_1" \
  -e GEMINI_API_KEY_2="$GEMINI_API_KEY_2" \
  -e GEMINI_API_KEY_3="$GEMINI_API_KEY_3" \
  text-to-html:local

# 3. 로그 확인
docker logs -f text-to-html-test

# 4. 브라우저 접속
# http://localhost:3001

# 5. 헬스체크
curl http://localhost:3001/api/health | jq

# 6. 정리
docker stop text-to-html-test
docker rm text-to-html-test
```

### 빠른 테스트 스크립트

```bash
# scripts/docker-local-test.sh 실행
chmod +x scripts/docker-local-test.sh
./scripts/docker-local-test.sh

# 출력:
# 🔨 Building Docker image...
# 🧪 Running health check...
# ✅ Health check passed
# ✅ Local Docker test completed successfully
```

---

## docker-compose 사용

### 기본 실행

```bash
# 1. 빌드 및 실행
docker-compose up -d

# 출력:
# Creating network "text-to-html_text-to-html-network" ... done
# Creating text-to-html-app ... done

# 2. 상태 확인
docker-compose ps

# 3. 로그 확인
docker-compose logs -f

# 4. 중지
docker-compose down
```

### 재빌드

```bash
# 코드 변경 후 재빌드
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 특정 서비스만 재시작

```bash
# 서비스 재시작
docker-compose restart text-to-html
```

---

## 프로덕션 배포

### 배포 전 체크리스트

```markdown
- [ ] .env 파일 설정 완료
- [ ] API 키 유효성 확인
- [ ] 모든 테스트 통과 (npm test)
- [ ] 빌드 성공 (npm run build)
- [ ] 로컬 Docker 테스트 성공
- [ ] 포트 3000 사용 가능 확인
- [ ] 백업 완료 (기존 코드, .env)
```

### 자동 배포 스크립트

```bash
# 1. 배포 스크립트 실행
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

# 출력:
# 🚀 Starting production deployment...
# 🛑 Stopping existing container...
# 📥 Pulling latest code...
# 📦 Installing dependencies...
# 🔨 Building Docker image...
# 🚀 Starting container...
# 🧪 Waiting for service to be healthy...
# ✅ Service is healthy!
# 🎉 Deployment completed successfully
```

### 수동 배포 단계

```bash
# 1. 기존 컨테이너 중지
docker-compose down

# 2. 최신 코드 가져오기 (Git 사용 시)
git pull origin main

# 3. 의존성 업데이트
npm ci

# 4. 빌드
docker-compose build --no-cache

# 5. 실행
docker-compose up -d

# 6. 헬스체크
sleep 10
curl http://localhost:3000/api/health | jq

# 7. 로그 확인
docker-compose logs --tail=50

# 8. 서비스 상태 확인
docker-compose ps
```

---

## 모니터링

### 실시간 로그

```bash
# 전체 로그 (실시간)
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100

# 특정 시간 이후
docker-compose logs --since 30m

# 에러만 필터링
docker-compose logs | grep ERROR

# 특정 키워드 검색
docker-compose logs | grep "Gemini API"
```

### 리소스 사용량

```bash
# 컨테이너 리소스 모니터링
docker stats text-to-html-app

# 출력:
# CONTAINER ID   NAME               CPU %   MEM USAGE / LIMIT     MEM %
# abc123...      text-to-html-app   2.5%    512MiB / 2GiB        25%

# 스크립트 사용
./scripts/monitor.sh

# 출력:
# 📊 Container Resource Usage:
# CPU: 2.5%
# Memory: 512MiB / 2GiB (25%)
# Network: 1.2MB / 800KB
#
# 📋 Container Info:
# Status: running
# Started: 2025-10-26T10:00:00Z
#
# 🏥 Health Status:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-26T11:00:00Z",
#   "apiKeysAvailable": 3
# }
```

### 헬스체크

```bash
# API 헬스체크
curl http://localhost:3000/api/health | jq

# 응답 예시:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-26T10:00:00.000Z",
#   "uptime": 3600,
#   "environment": "production",
#   "apiKeysAvailable": 3
# }

# Docker 헬스체크 상태
docker inspect text-to-html-app | jq '.[0].State.Health'
```

---

## 업데이트 절차

### 코드 업데이트

```bash
# 1. 백업
cp .env .env.backup
git log -1 --format="%H" > last_commit.txt

# 2. 최신 코드 가져오기
git fetch origin
git checkout main
git pull origin main

# 3. 환경 변수 확인
diff .env.example .env
# 새로운 환경 변수가 있다면 .env에 추가

# 4. 재배포
./scripts/deploy-production.sh

# 5. 검증
curl http://localhost:3000/api/health
# 브라우저에서 http://localhost:3000 접속
```

### 롤백

```bash
# 문제 발생 시 이전 버전으로 롤백
./scripts/rollback.sh

# 또는 수동 롤백:
docker-compose down
git checkout HEAD~1
./scripts/deploy-production.sh
```

---

## 트러블슈팅

### 컨테이너가 계속 재시작됨

```bash
# 1. 로그 확인
docker logs text-to-html-app --tail=100

# 2. 환경 변수 확인
docker exec text-to-html-app env | grep GEMINI

# 3. 헬스체크 API 테스트
docker exec text-to-html-app curl http://localhost:3000/api/health

# 4. 원인별 해결:
# - API 키 오류: .env 파일 확인
# - 포트 충돌: docker-compose.yml 포트 변경
# - 메모리 부족: docker-compose.yml에 메모리 제한 추가
```

### 포트 3000 이미 사용 중

```bash
# 1. 사용 중인 프로세스 확인
lsof -i :3000

# 2. 프로세스 종료
kill [PID]

# 또는 docker-compose.yml에서 포트 변경
# ports:
#   - "3001:3000"
```

### Gemini API 타임아웃

```bash
# 1. API 키 유효성 확인
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=$GEMINI_API_KEY_1"

# 2. 로그에서 API 호출 추적
docker-compose logs | grep "Gemini API"

# 3. API 키 로테이션 확인
docker-compose logs | grep "Switching to API key"
```

### 메모리 부족

```bash
# docker-compose.yml에 메모리 제한 추가
services:
  text-to-html:
    # ... 기존 설정 ...
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

# 재시작
docker-compose down
docker-compose up -d
```

### 이미지 빌드 실패

```bash
# 1. 캐시 삭제 후 재빌드
docker-compose build --no-cache

# 2. 빌드 로그 상세 확인
docker-compose build --progress=plain

# 3. 디스크 공간 확인
df -h

# 4. 사용하지 않는 이미지 정리
docker system prune -a
```

---

## 성능 최적화

### 빌드 최적화

```dockerfile
# Dockerfile (최적화)

# Multi-stage build로 이미지 크기 축소
# Layer 캐싱으로 빌드 속도 향상

FROM node:20-alpine AS builder
# ... (기존 코드)

FROM node:20-alpine AS runner
# standalone 모드로 필요한 파일만 포함
# 결과: 이미지 크기 50% 감소
```

### 런타임 최적화

```yaml
# docker-compose.yml (최적화)

services:
  text-to-html:
    # ... 기존 설정 ...

    # CPU/메모리 제한
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

    # Node.js 메모리 옵션
    environment:
      - NODE_OPTIONS=--max-old-space-size=1536

    # 재시작 정책
    restart: unless-stopped
```

---

## 보안

### 권장 사항

```yaml
보안 체크리스트:
  - [ ] .env 파일을 .gitignore에 추가
  - [ ] API 키를 환경 변수로만 관리
  - [ ] non-root 유저로 컨테이너 실행
  - [ ] 포트 노출 최소화
  - [ ] 정기적인 이미지 업데이트
  - [ ] 로그에 민감 정보 출력 금지
```

### .env 파일 보호

```bash
# .env 파일 권한 설정
chmod 600 .env

# Git에서 제외 확인
git ls-files | grep .env
# (출력 없음 = 정상)

# .gitignore 확인
cat .gitignore | grep .env
# .env
# .env*.local
```

---

## 자주 사용하는 명령어

### 기본 작업

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart

# 로그
docker-compose logs -f

# 상태 확인
docker-compose ps

# 컨테이너 진입 (디버깅)
docker exec -it text-to-html-app sh
```

### 정리

```bash
# 중지된 컨테이너 삭제
docker container prune

# 사용하지 않는 이미지 삭제
docker image prune -a

# 전체 정리 (주의!)
docker system prune -a --volumes
```

---

## CI/CD 통합

### GitHub Actions 예시

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Build and test
        run: |
          docker build -t text-to-html:test .
          # 테스트 컨테이너 실행 및 검증

      - name: Deploy to server
        run: |
          ssh user@server 'cd /app/text-to-html && ./scripts/deploy-production.sh'
```

---

## 참고 자료

- **Docker 공식 문서**: https://docs.docker.com/
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Docker Compose**: https://docs.docker.com/compose/

---

**생성일**: 2025-10-26
**담당자**: Session A (Master)
**상태**: ✅ 활성
