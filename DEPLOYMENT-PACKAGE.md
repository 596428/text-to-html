# 배포 패키지 가이드

**Text-to-HTML Generator v1.0** - Docker 이미지 배포 패키지

---

## 📦 패키지 내용

배포를 위해 다음 파일들을 함께 전달하세요:

### 필수 파일
```
✅ text-to-html-v1.0.tar       # Docker 이미지 (205MB)
✅ docker-compose.yml           # Docker Compose 설정
✅ .env.example                 # 환경 변수 템플릿
✅ DOCKER-README.md            # 사용 가이드
```

### 선택 파일
```
📄 DEPLOYMENT-PACKAGE.md       # 이 문서
📄 MASTER-PLAN.md              # 전체 프로젝트 계획
```

---

## 🚀 빠른 시작 (수신자용)

### 1. 파일 준비

```bash
# 전달받은 파일들을 한 폴더에 모으기
mkdir text-to-html-deploy
cd text-to-html-deploy

# 파일 확인
ls -lh
# text-to-html-v1.0.tar (205MB)
# docker-compose.yml
# .env.example
# DOCKER-README.md
```

### 2. Docker 이미지 로드

```bash
# Docker 이미지 로드
docker load -i text-to-html-v1.0.tar

# 로드 확인
docker images | grep text-to-html
# text-to-html  v1.0  444d7099a30f  14 seconds ago  210MB
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# API 키 입력 (편집기 사용)
nano .env
```

**.env 파일 예시**:
```
GEMINI_API_KEY_1=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY_2=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
GEMINI_API_KEY_3=AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**API 키 발급 방법**:
1. https://aistudio.google.com/app/apikey 접속
2. Google 계정 로그인
3. "Create API Key" 클릭
4. 생성된 키를 .env 파일에 입력

### 4. 실행

```bash
# Docker Compose로 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 브라우저 접속
# http://localhost:3000
```

---

## 🔧 상세 설정

### 포트 변경

**docker-compose.yml** 편집:
```yaml
services:
  text-to-html:
    ports:
      - "8080:3000"  # 8080 포트로 변경
```

### 리소스 제한

**docker-compose.yml**에 추가:
```yaml
services:
  text-to-html:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

---

## 📊 시스템 요구사항

### 최소 사양
- **Docker**: 20.10 이상
- **CPU**: 1 core
- **RAM**: 1GB
- **디스크**: 1GB 여유 공간

### 권장 사양
- **Docker**: 24.0 이상
- **CPU**: 2 cores
- **RAM**: 2GB
- **디스크**: 2GB 여유 공간

---

## ✅ 검증

### 1. 컨테이너 상태 확인

```bash
docker-compose ps

# 출력 예시:
# NAME                 STATUS         PORTS
# text-to-html-app    Up 2 minutes   0.0.0.0:3000->3000/tcp
```

### 2. 로그 확인

```bash
docker-compose logs --tail=50

# 정상 실행 시:
# ✓ Ready on http://0.0.0.0:3000
```

### 3. 브라우저 테스트

1. http://localhost:3000 접속
2. "+ 박스 추가" 클릭
3. 내용 입력 후 "HTML 생성" 클릭
4. HTML이 정상 생성되면 성공

---

## 🛠️ 트러블슈팅

### 문제: 포트 3000이 이미 사용 중

```bash
# 사용 중인 프로세스 확인
lsof -i :3000

# 프로세스 종료 또는 포트 변경 (위 "포트 변경" 참조)
```

### 문제: API 키 오류

```bash
# .env 파일 확인
cat .env

# 컨테이너 환경 변수 확인
docker exec text-to-html-app env | grep GEMINI
```

### 문제: 컨테이너가 즉시 종료됨

```bash
# 로그 확인
docker logs text-to-html-app

# 일반적 원인:
# 1. .env 파일 없음 → cp .env.example .env
# 2. API 키 누락 → .env 파일 확인
# 3. 포트 충돌 → 포트 변경
```

---

## 📝 관리 명령어

### 시작/중지

```bash
# 시작
docker-compose up -d

# 중지
docker-compose down

# 재시작
docker-compose restart
```

### 로그

```bash
# 실시간 로그
docker-compose logs -f

# 최근 100줄
docker-compose logs --tail=100

# 최근 30분
docker-compose logs --since 30m
```

### 정리

```bash
# 컨테이너 중지 및 삭제
docker-compose down

# 이미지까지 삭제
docker rmi text-to-html:v1.0

# 전체 정리
docker system prune -a
```

---

## 🔐 보안

### 권장 사항

1. **.env 파일 권한 설정**
   ```bash
   chmod 600 .env
   ```

2. **API 키 보안**
   - .env 파일을 Git에 커밋하지 마세요
   - 정기적으로 API 키 교체 권장

3. **방화벽 설정**
   - 필요한 경우 포트 3000 접근 제한
   - 내부 네트워크에서만 접근하도록 설정

---

## 📞 지원

### 추가 문서
- **DOCKER-README.md**: 상세 Docker 사용 가이드
- **MASTER-PLAN.md**: 전체 프로젝트 계획 및 로드맵

### 문제 발생 시
1. 로그 확인: `docker-compose logs -f`
2. 컨테이너 상태: `docker-compose ps`
3. 환경 변수: `docker exec text-to-html-app env`

---

## 📋 체크리스트

### 배포 전 (발신자)
- [x] Docker 이미지 빌드 완료
- [x] tar 파일 생성 (205MB)
- [x] docker-compose.yml 준비
- [x] .env.example 준비
- [x] DOCKER-README.md 준비

### 배포 후 (수신자)
- [ ] 파일 전달 확인 (4개 필수 파일)
- [ ] Docker 이미지 로드 성공
- [ ] .env 파일 생성 및 API 키 입력
- [ ] docker-compose up -d 실행 성공
- [ ] http://localhost:3000 접속 성공
- [ ] HTML 생성 테스트 성공

---

**버전**: 1.0
**빌드 일시**: 2025-10-26
**이미지 크기**: 210MB (압축: 205MB)
**Node.js**: 20-alpine
**Next.js**: 15.5.5
