import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '照片轉 PDF｜離線、安全',
    short_name: '照片轉 PDF',
    description: '在裝置上離線將多張照片轉成 PDF，圖片不上傳。',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f1eb',
    theme_color: '#f4f1eb',
    orientation: 'any',
    categories: ['productivity', 'utilities'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
