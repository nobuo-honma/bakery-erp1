import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/common/Sidebar';

export const metadata: Metadata = {
  title: '災害備蓄用パン総合管理システム',
  description: 'BAKERY-ERP Desktop System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#121420] text-slate-100 min-h-screen flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}