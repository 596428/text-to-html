# Docker 배포 가이드

**Text-to-HTML Generator** - Docker 이미지 빌드 및 배포 가이드

---

## 빠른 시작

### 1. 환경 변수 설정

```bash
# .env.example을 .env로 복사
cp .env.example .env

# .env 파일 편집 (API 키 입력)
nano .env  # 또는 원하는 에디터 사용
```

**.env 파일 예시**:
```
GEMINI_API_KEY_1=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_API_KEY_2=AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
GEMINI_API_KEY_3=AIzaSyZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 2. Docker로 실행

```bash
# Docker Compose로 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 브라우저에서 접속
# http://localhost:3000
```

### 3. 중지

```bash
docker-compose down
```

---

## 상세 가이드

### API 키 발급 방법

1. https://aistudio.google.com/app/apikey 접속
2. Google 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. 생성된 API 키를 복사하여 .env 파일에 입력

**권장**: 3개의 API 키를 발급하여 사용하면 요청 제한을 우회할 수 있습니다.

---

## Docker 명령어

### 빌드

```bash
# 이미지 빌드만
docker-compose build

# 캐시 없이 빌드
docker-compose build --no-cache

# 로컬 이미지 태그 (선택사항)
docker build -t text-to-html:v1.0 .
```

### 실행

```bash
# 백그라운드 실행
docker-compose up -d

# 포그라운드 실행 (로그 실시간)
docker-compose up

# 특정 포트로 실행 (docker-compose.yml 수정)
# ports:
#   - "8080:3000"  # 8080 포트로 접속
```

### 관리

```bash
# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 컨테이너 재시작
docker-compose restart

# 중지 및 삭제
docker-compose down

# 볼륨까지 모두 삭제
docker-compose down -v
```

---

## 이미지 배포

### Docker Hub에 업로드

```bash
# 1. Docker Hub 로그인
docker login

# 2. 이미지 태그
docker tag text-to-html:v1.0 your-dockerhub-username/text-to-html:v1.0

# 3. 푸시
docker push your-dockerhub-username/text-to-html:v1.0

# 4. 다른 서버에서 다운로드
docker pull your-dockerhub-username/text-to-html:v1.0
```

### 파일로 저장 (Docker 레지스트리 없이)

```bash
# 1. 이미지를 tar 파일로 저장
docker save text-to-html:v1.0 -o text-to-html-v1.0.tar

# 2. 파일 전송 (USB, 네트워크 등)
# ...

# 3. 다른 서버에서 로드
docker load -i text-to-html-v1.0.tar

# 4. .env 파일도 함께 전달
# .env.example을 참고하여 .env 파일 생성
```

---

## 전달 체크리스트

배포 시 다음 파일들을 함께 전달하세요:

```
✅ text-to-html-v1.0.tar      # Docker 이미지
✅ docker-compose.yml          # Docker Compose 설정
✅ .env.example                # 환경 변수 템플릿
✅ DOCKER-README.md           # 이 가이드 문서
```

---

## 트러블슈팅

### 포트 3000이 이미 사용 중

```bash
# 사용 중인 프로세스 확인
lsof -i :3000

# 또는 docker-compose.yml에서 포트 변경
# ports:
#   - "3001:3000"
```

### API 키 오류

```bash
# .env 파일 확인
cat .env

# 컨테이너 내부 환경 변수 확인
docker exec text-to-html-app env | grep GEMINI
```

### 빌드 실패

```bash
# 캐시 삭제 후 재빌드
docker-compose build --no-cache

# 디스크 공간 확인
df -h

# 불필요한 이미지 정리
docker system prune -a
```

### 컨테이너가 즉시 종료됨

```bash
# 로그 확인
docker logs text-to-html-app

# 일반적인 원인:
# 1. .env 파일 없음 → .env.example 복사
# 2. API 키 누락 → .env 파일 확인
# 3. 포트 충돌 → 포트 변경
```

---

## 프로덕션 배포

### 권장 설정

```yaml
# docker-compose.yml에 추가

services:
  text-to-html:
    # ... 기존 설정 ...

    # 리소스 제한
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

    # 자동 재시작
    restart: unless-stopped
```

### 보안 권장사항

1. `.env` 파일 권한 설정: `chmod 600 .env`
2. API 키를 Git에 커밋하지 않기
3. 정기적인 이미지 업데이트
4. 방화벽 설정으로 포트 접근 제한

---

## 지원

문제 발생 시:
1. 로그 확인: `docker-compose logs -f`
2. 컨테이너 상태: `docker-compose ps`
3. 환경 변수: `docker exec text-to-html-app env`

---

**버전**: 1.0
**최종 업데이트**: 2025-10-26
