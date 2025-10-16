# GitHub 작업 가이드

## 📦 저장소 정보

**GitHub Repository**: https://github.com/596428/text-to-html

- **계정**: 596428
- **저장소명**: text-to-html
- **브랜치**: main
- **공개 여부**: Public

---

## 🔐 인증 정보

### GitHub CLI 인증 상태
```bash
gh auth status
```

**현재 설정:**
- ✅ 계정: 596428
- ✅ 프로토콜: HTTPS
- ✅ 권한: `gist`, `read:org`, `repo`, `workflow`
- ✅ 설정 파일: `/home/ajh428/.config/gh/hosts.yml`

### Git 사용자 설정
```bash
git config --global user.name "596428"
git config --global user.email "ajh428@users.noreply.github.com"
```

---

## 🔄 Git 작업 플로우

### 1. 최신 코드 가져오기

```bash
cd /mnt/c/CodePracticeProject/TexttoHtml/text-to-html
git pull origin main
```

### 2. 변경사항 확인

```bash
git status
git diff
```

### 3. 변경사항 커밋

```bash
# 변경된 파일 스테이징
git add .

# 또는 특정 파일만
git add components/LayoutEditor/

# 커밋 (메시지 규칙 준수)
git commit -m "feat: P1-A 레이아웃 에디터 구현

- GridBox 컴포넌트 추가
- 드래그앤드롭 기능 구현
- 12컬럼 그리드 시스템

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 4. GitHub에 푸시

```bash
git push origin main
```

---

## 📝 커밋 메시지 규칙

### 형식
```
<type>: <subject>

<body>

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Type 종류
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (동작 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드
- `chore`: 빌드, 설정 변경

### 예시

#### P1-A 완료 시
```bash
git commit -m "feat: P1-A 레이아웃 에디터 모듈 완성

- GridBox 컴포넌트 (드래그, 리사이즈)
- GridGuide (12컬럼 가이드라인)
- Toolbar (박스 추가/삭제)
- 그리드 스냅 기능
- 박스 선택 상태 표시

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### P2-A 완료 시
```bash
git commit -m "feat: P2-A Gemini API 통합

- lib/gemini.ts (API 클라이언트)
- /api/generate (HTML 생성 엔드포인트)
- /api/modify (HTML 수정 엔드포인트)
- API 키 순환 로직
- 에러 핸들링

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## 🌿 브랜치 전략 (필요 시)

### Feature 브랜치 생성
```bash
# 새 기능 브랜치 생성
git checkout -b feature/p1-a-layout-editor

# 작업 후 커밋
git add .
git commit -m "feat: ..."

# 푸시
git push origin feature/p1-a-layout-editor
```

### Pull Request 생성
```bash
gh pr create --title "feat: P1-A 레이아웃 에디터" --body "
## 변경사항
- GridBox 컴포넌트 구현
- 드래그앤드롭 기능

## 테스트
- [ ] 박스 추가/삭제
- [ ] 드래그 이동
- [ ] 리사이즈

## 스크린샷
(스크린샷 추가)
"
```

### 브랜치 병합
```bash
# main으로 전환
git checkout main

# 최신 코드 가져오기
git pull origin main

# 브랜치 병합
git merge feature/p1-a-layout-editor

# 푸시
git push origin main
```

---

## 🔧 유용한 명령어

### 로그 확인
```bash
# 최근 커밋 로그
git log --oneline -10

# 그래프로 보기
git log --oneline --graph --all
```

### 변경사항 취소
```bash
# 스테이징 취소
git reset HEAD <file>

# 파일 변경 취소
git checkout -- <file>

# 마지막 커밋 수정
git commit --amend
```

### 원격 저장소 확인
```bash
git remote -v
```

---

## 🚨 주의사항

### 절대 커밋하지 말 것
- ❌ `.env.local` (API 키 포함)
- ❌ `node_modules/`
- ❌ `.next/`

→ `.gitignore`에 이미 추가되어 있음

### 커밋 전 체크리스트
- [ ] `git status`로 변경 파일 확인
- [ ] `.env.local` 포함 안 되었는지 확인
- [ ] 의미 있는 커밋 메시지 작성
- [ ] 빌드 에러 없는지 확인 (`npm run build`)

---

## 📚 참고 자료

- GitHub 저장소: https://github.com/596428/text-to-html
- GitHub CLI 문서: https://cli.github.com/manual/
- Git 공식 문서: https://git-scm.com/doc
