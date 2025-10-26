import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone 모드 (Docker 최적화)
  output: 'standalone',

  // 이미지 최적화 비활성화 (프로덕션에서)
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
