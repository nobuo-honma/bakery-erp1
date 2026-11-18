import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポートを有効化
  output: 'export',
  
  // リポジトリ名が決まっている場合は basePath と assetPrefix を設定
  // ※ <リポジトリ名> の部分はご自身のGitHubリポジトリ名に変更してください
  basePath: '/<リポジトリ名>',
  assetPrefix: '/<リポジトリ名>/',
  
  // 画像最適化（next/image）を静的エクスポート用に無効化
  images: {
    unoptimized: true,
  },
};

export default mainExport(nextConfig); // 既存のエクスポート方法に合わせて調整してください