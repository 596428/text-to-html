# 배포 가이드 (Deployment Guide)

## 📋 필수 환경변수

### 1. Gemini API Keys (필수)
```bash
GEMINI_API_KEY_1=AIzaSy...  # 첫 번째 API 키 (주 키)
GEMINI_API_KEY_2=AIzaSy...  # 두 번째 API 키 (백업 1)
GEMINI_API_KEY_3=AIzaSy...  # 세 번째 API 키 (백업 2)
```

**발급 방법**:
- https://aistudio.google.com/app/apikey
- 3개 키 설정 시 자동 로드밸런싱 및 429 에러 회피

### 2. MongoDB Atlas Connection (필수)
```bash
MONGODB_URI=mongodb+srv://username:password@cluster0.koydgqj.mongodb.net/text-to-html?retryWrites=true&w=majority&appName=Cluster0
```

**연결 정보**:
- 클러스터: Cluster0 (cluster0.koydgqj.mongodb.net)
- 데이터베이스: `text-to-html`
- 컬렉션: `components` (자동 생성됨)
- 사용자: 읽기/쓰기 권한 필요

**MongoDB Atlas 설정**:
1. https://cloud.mongodb.com/ 로그인
2. Network Access → IP Whitelist 설정
   - 개발: 현재 IP 추가
   - 배포: `0.0.0.0/0` (모든 IP 허용) 또는 서버 IP 지정
3. Database Access → 사용자 권한 확인 (읽기/쓰기)

### 3. App Name (선택)
```bash
NEXT_PUBLIC_APP_NAME="Text-to-HTML Generator"
```

---

## 🐳 Docker 배포

### Dockerfile 예시
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --only=production

# 소스 복사 및 빌드
COPY . .
RUN npm run build

# 환경변수 설정 (빌드 타임)
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml 예시
```yaml
version: '3.8'

services:
  text-to-html:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY_1=${GEMINI_API_KEY_1}
      - GEMINI_API_KEY_2=${GEMINI_API_KEY_2}
      - GEMINI_API_KEY_3=${GEMINI_API_KEY_3}
      - MONGODB_URI=${MONGODB_URI}
      - NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
    restart: unless-stopped
```

### .env 파일 생성 (Docker 배포 시)
```bash
# .env 파일 생성
cp .env.example .env

# 실제 값으로 수정
nano .env
```

### Docker 실행
```bash
# 이미지 빌드
docker build -t text-to-html:latest .

# 컨테이너 실행
docker run -d \
  --name text-to-html \
  -p 3000:3000 \
  --env-file .env \
  text-to-html:latest

# docker-compose 사용
docker-compose up -d
```

---

## 🚀 직접 빌드 배포

### 1. 프로덕션 빌드
```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 2. 환경변수 설정 방법

#### 방법 1: .env.local 파일 (권장)
```bash
# .env.local 파일 생성
cp .env.example .env.local

# 실제 값으로 수정
nano .env.local
```

#### 방법 2: 시스템 환경변수
```bash
# Linux/Mac
export GEMINI_API_KEY_1="your_key"
export MONGODB_URI="your_uri"

# Windows (PowerShell)
$env:GEMINI_API_KEY_1="your_key"
$env:MONGODB_URI="your_uri"

# Windows (CMD)
set GEMINI_API_KEY_1=your_key
set MONGODB_URI=your_uri
```

#### 방법 3: PM2 사용
```bash
# ecosystem.config.js 생성
module.exports = {
  apps: [{
    name: 'text-to-html',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      GEMINI_API_KEY_1: 'your_key_1',
      GEMINI_API_KEY_2: 'your_key_2',
      GEMINI_API_KEY_3: 'your_key_3',
      MONGODB_URI: 'your_mongodb_uri',
      NEXT_PUBLIC_APP_NAME: 'Text-to-HTML Generator'
    }
  }]
}

# PM2로 실행
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔒 보안 주의사항

### 1. 환경변수 보호
- ✅ `.env.local` 파일은 절대 Git에 커밋하지 마세요
- ✅ `.gitignore`에 `.env.local` 포함 확인
- ✅ 프로덕션 환경에서는 시크릿 관리 서비스 사용 권장
  - AWS Secrets Manager
  - Azure Key Vault
  - Google Secret Manager

### 2. MongoDB Atlas 보안
- ✅ IP Whitelist 설정 (0.0.0.0/0은 개발용만 사용)
- ✅ 강력한 패스워드 사용
- ✅ 최소 권한 원칙 (읽기/쓰기만 필요)
- ✅ 정기적인 패스워드 변경

### 3. API 키 보안
- ✅ 키 로테이션 정기 실시
- ✅ 사용량 모니터링
- ✅ API 키별 사용 제한 설정

---

## 🧪 배포 전 체크리스트

### 필수 확인 사항
- [ ] 모든 환경변수 설정 완료
- [ ] MongoDB Atlas 연결 테스트 (`node scripts/test-mongodb.js`)
- [ ] Gemini API 키 동작 확인
- [ ] 로컬에서 프로덕션 빌드 테스트 (`npm run build && npm start`)
- [ ] MongoDB IP Whitelist 설정 (배포 서버 IP)

### 성능 최적화
- [ ] Next.js 이미지 최적화 설정
- [ ] API 응답 캐싱 (선택)
- [ ] CDN 설정 (선택)

### 모니터링
- [ ] 로그 수집 설정
- [ ] 에러 트래킹 (Sentry 등)
- [ ] 성능 모니터링

---

## 📊 데이터 마이그레이션

### localStorage → MongoDB 마이그레이션
프로덕션 배포 후 기존 사용자들이 localStorage 데이터를 MongoDB로 이동:

1. 사용자가 브라우저에서 앱 접속
2. 마이그레이션 다이얼로그 표시 (자동 감지)
3. "마이그레이션 시작" 버튼 클릭
4. 자동으로 데이터 이동 완료

**개발자 수동 마이그레이션** (필요 시):
```javascript
// 브라우저 콘솔에서 실행
import { migrateFromLocalStorage } from '@/lib/componentLibrary';
const result = await migrateFromLocalStorage();
console.log(result);
```

---

## 🆘 트러블슈팅

### 1. MongoDB 연결 오류
```
Error: MongoServerError: bad auth
```
**해결**: MONGODB_URI의 username/password 확인

```
Error: connection timed out
```
**해결**: MongoDB Atlas IP Whitelist에 서버 IP 추가

### 2. Gemini API 오류
```
Error: 429 Too Many Requests
```
**해결**: 추가 API 키 설정 (GEMINI_API_KEY_2, GEMINI_API_KEY_3)

### 3. 빌드 오류
```
Error: Cannot find module 'mongodb'
```
**해결**: `npm install` 재실행

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 환경변수 설정이 올바른지 확인
2. MongoDB Atlas 연결 테스트 실행
3. 로그 파일 확인 (`logs/` 디렉토리)
4. GitHub Issues에 문제 보고
