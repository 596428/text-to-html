# Gemini API 키 설정 가이드

## 🔑 사용 가능한 API 키

이 프로젝트에서는 **3개의 Gemini API 키**를 사용할 수 있습니다.

### API 키 위치

환경 변수 파일에 이미 설정되어 있습니다:
```
~/.claude/CLAUDE.md
```

---

## 📝 환경 변수 설정

### 1. `.env.local` 파일 수정

프로젝트 루트의 `.env.local` 파일을 다음과 같이 수정하세요:

```bash
# Gemini API Keys (3개 모두 사용 가능)
GEMINI_API_KEY_1=your_first_key_here
GEMINI_API_KEY_2=your_second_key_here
GEMINI_API_KEY_3=your_third_key_here

# App Config
NEXT_PUBLIC_APP_NAME="Text-to-HTML Generator"
```

### 2. API 키 복사 방법

#### 옵션 A: 직접 복사
```bash
# CLAUDE.md에서 API 키 확인
cat ~/.claude/CLAUDE.md | grep GEMINI_API_KEY

# .env.local에 붙여넣기
nano .env.local
```

#### 옵션 B: 자동 설정 (권장)
```bash
# 이미 설정된 키를 사용
# gemini_api_manager.py 파일 참조
```

---

## 🔄 API 키 순환 로직

### 현재 구현 (`lib/gemini.ts`)

```typescript
// API 키 관리 (순환 사용)
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3  // 3번째 키 추가
].filter(Boolean) as string[];

let currentKeyIndex = 0;

function getGenAI() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenerativeAI(key);
}
```

### 동작 방식
1. 첫 번째 요청: `GEMINI_API_KEY_1` 사용
2. 두 번째 요청: `GEMINI_API_KEY_2` 사용
3. 세 번째 요청: `GEMINI_API_KEY_3` 사용
4. 네 번째 요청: 다시 `GEMINI_API_KEY_1`로 순환

### 장점
- ✅ API 할당량 최적화
- ✅ 429 에러 (Rate Limit) 방지
- ✅ 자동 장애 조치

---

## 🛠️ 설정 확인

### 1. 환경 변수 로드 확인

```bash
# 개발 서버 실행 시 자동 로드
npm run dev

# 환경 변수 확인 (키 값은 마스킹됨)
echo $GEMINI_API_KEY_1  # 빈 값 (브라우저에서만 사용)
```

### 2. API 키 유효성 테스트

```bash
# /api/generate 테스트
curl -X POST http://localhost:3000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "boxes": [
      {
        "id": "test",
        "x": 0,
        "y": 0,
        "width": 12,
        "height": 300,
        "content": "테스트 헤더"
      }
    ]
  }'
```

성공 시:
```json
{
  "html": "<!DOCTYPE html>..."
}
```

실패 시:
```json
{
  "error": "HTML 생성 실패: ..."
}
```

---

## 🚨 문제 해결

### 문제 1: "API 키가 설정되지 않았습니다"

**원인**: `.env.local` 파일이 없거나 API 키가 비어있음

**해결**:
```bash
# .env.local 파일 확인
cat .env.local

# API 키가 비어있다면 수동으로 추가
nano .env.local
```

### 문제 2: "429 Too Many Requests"

**원인**: API 할당량 초과

**해결**:
1. 3개 키가 모두 설정되어 있는지 확인
2. 순환 로직이 올바르게 동작하는지 확인
3. 키 개수를 늘리거나 요청 빈도 줄이기

```typescript
// lib/gemini.ts에 재시도 로직 추가
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 문제 3: "Invalid API Key"

**원인**: API 키가 잘못되었거나 만료됨

**해결**:
```bash
# ~/.claude/CLAUDE.md에서 최신 키 확인
cat ~/.claude/CLAUDE.md | grep GEMINI_API_KEY

# .env.local 업데이트
```

---

## 📊 API 사용량 모니터링

### Gemini API 콘솔
https://makersuite.google.com/app/apikey

- 일일 할당량 확인
- 사용 통계
- 키 관리

### 로컬 로깅

```typescript
// lib/gemini.ts에 추가
function getGenAI() {
  const key = API_KEYS[currentKeyIndex];
  console.log(`[Gemini] Using API Key #${currentKeyIndex + 1}`);
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return new GoogleGenerativeAI(key);
}
```

---

## 🔐 보안 주의사항

### ❌ 절대 하지 말 것
- GitHub에 API 키 커밋
- 클라이언트 코드에 API 키 노출
- `.env.local` 파일 공유

### ✅ 해야 할 것
- `.gitignore`에 `.env.local` 포함 확인
- 환경 변수로만 API 키 관리
- 서버 사이드에서만 API 호출

### 검증
```bash
# .gitignore 확인
cat .gitignore | grep .env

# 결과: .env*.local (이미 포함됨)
```

---

## 📚 참고 자료

- Gemini API 문서: https://ai.google.dev/docs
- API 키 관리: https://makersuite.google.com/
- 할당량 정보: https://ai.google.dev/pricing
- 프로젝트 설정: `~/.claude/CLAUDE.md`

---

## ✅ 체크리스트

설정 완료 확인:

- [ ] `.env.local` 파일 생성
- [ ] 3개 API 키 모두 설정
- [ ] 개발 서버 재시작 (`npm run dev`)
- [ ] API 테스트 성공 (`curl` 또는 브라우저)
- [ ] `.gitignore`에 `.env.local` 포함 확인
