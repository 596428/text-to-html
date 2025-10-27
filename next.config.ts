import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone 모드 (Docker 최적화)
  output: 'standalone',

  // 이미지 최적화 비활성화 (프로덕션에서)
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },

  // WSL 환경에서 Hot Reload 개선
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000, // 1초마다 파일 변경 체크
        aggregateTimeout: 300, // 300ms 동안 변경사항 누적
      };
    }
    return config;
  },
};

export default nextConfig;
