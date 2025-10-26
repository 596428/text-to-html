# Dockerfile for Text-to-HTML Generator

# ===== Build Stage =====
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치 (캐싱 최적화)
COPY package.json package-lock.json* ./
RUN npm ci

# 소스 코드 복사
COPY . .

# Next.js standalone 빌드
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== Production Stage =====
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: non-root 유저 생성
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone 빌드 파일 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 환경 변수 기본값
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 유저 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 실행
CMD ["node", "server.js"]
