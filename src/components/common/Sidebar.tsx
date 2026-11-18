'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Database, ShoppingCart, ClipboardList, Calendar, Truck, Package } from 'lucide-react';

const menuItems = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '製品マスタ', href: '/masters/products', icon: Database },
  { name: '原材料・資材マスタ', href: '/masters/items', icon: Database },
  { name: '出荷先マスタ', href: '/masters/customers', icon: Database },
  { name: '受注管理', href: '/orders', icon: ShoppingCart },
  { name: '発注管理', href: '/purchase', icon: ClipboardList },
  { name: '製造計画', href: '/production', icon: Calendar },
  { name: '出荷管理', href: '/shipment', icon: Truck },
  { name: '在庫管理', href: '/inventory', icon: Package },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-[#1E2132] border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-lg font-bold text-[#00D2FF] tracking-wider">BAKERY-ERP</h1>
        <p className="text-xs text-slate-400 mt-1">災害備蓄用パン総合管理</p>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#00D2FF]/15 text-[#00D2FF] border border-[#00D2FF]/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}