import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポートを有効化
  output: 'export',
  
  // リポジトリ名に合わせて設定（bakery-erp1 の場合）
  basePath: '/bakery-erp1',
  assetPrefix: '/bakery-erp1/',
  
  // 画像最適化（next/image）を静的エクスポート用に無効化
  images: {
    unoptimized: true,
  },
};

export default nextConfig;