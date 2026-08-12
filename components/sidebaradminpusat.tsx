'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  ShoppingCart,
  Warehouse,
  ClipboardCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function SidebarAdminPusat() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin-pusat/dashboard', icon: LayoutDashboard },
    { label: 'Transaksi Kasir', path: '/admin-pusat/kasir', icon: ShoppingCart },
    { label: 'Manajemen Gudang', path: '/admin-pusat/gudang', icon: Warehouse },
    { label: 'Persetujuan Stok', path: '/admin-pusat/persetujuan-stok', icon: ClipboardCheck },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } min-h-screen bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-200`}
    >
      <div>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && (
            <div>
              <p className="font-semibold text-gray-900">Toko Sinar Mandiri</p>
              <p className="text-xs text-gray-400">Admin Pusat</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-md p-1.5 transition"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="p-3 text-sm">
          {menuItems.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 ${
                isActive(path)
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-500 hover:bg-red-50 mt-1"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
            P
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-medium text-gray-700">Admin Pusat</p>
              <p className="text-xs text-green-500">● Online</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}