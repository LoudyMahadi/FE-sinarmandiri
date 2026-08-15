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
      } min-h-screen bg-[#1A2233] flex flex-col justify-between transition-all duration-200`}
    >
      <div>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
                <span className="text-white font-semibold text-sm">S</span>
              </div>
              <div>
                <p className="font-semibold text-white text-sm leading-tight">Toko Sinar Mandiri</p>
                <p className="text-xs text-slate-400">Admin Pusat</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white hover:bg-white/5 rounded-md p-1.5 transition"
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
                isActive(path) ? 'bg-blue-500 text-white font-medium' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-red-400 hover:bg-red-500/10 mt-1"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Keluar</span>}
          </button>
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium shrink-0">
            P
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-medium text-slate-200">Admin Pusat</p>
              <p className="text-xs text-emerald-400">● Online</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}