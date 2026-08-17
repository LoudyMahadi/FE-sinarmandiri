'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
  const [laporanOpen, setLaporanOpen] = useState(pathname.startsWith('/owner/laporan'));

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const laporanItems = [
    { label: 'Penjualan', path: '/owner/laporan/penjualan' },
    { label: 'Keuangan', path: '/owner/laporan/keuangan' },
    { label: 'Inventori', path: '/owner/laporan/inventori' },
    { label: 'Perbaikan Mesin', path: '/owner/laporan/perbaikan-mesin' },
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
                <p className="text-xs text-slate-400">Owner</p>
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
          <Link
            href="/owner/dashboard"
            title={collapsed ? 'Dashboard' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 ${
              isActive('/owner/dashboard')
                ? 'bg-blue-500 text-white font-medium'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          <button
            onClick={() => setLaporanOpen(!laporanOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-slate-300 hover:bg-white/5"
          >
            <span className="flex items-center gap-3">
              <FileText size={18} className="shrink-0" />
              {!collapsed && <span>Laporan</span>}
            </span>
            {!collapsed && (
              <ChevronDown size={14} className={`transition-transform ${laporanOpen ? 'rotate-180' : ''}`} />
            )}
          </button>

          {laporanOpen && !collapsed && (
            <div className="ml-8 border-l border-white/10 pl-3 mb-1">
              {laporanItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  className={`block px-3 py-2 rounded-md text-sm ${
                    isActive(item.path)
                      ? 'bg-blue-500 text-white font-medium'
                      : 'text-slate-400 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/owner/manajemen-user"
            title={collapsed ? 'Manajemen User' : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 ${
              isActive('/owner/manajemen-user')
                ? 'bg-blue-500 text-white font-medium'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Users size={18} className="shrink-0" />
            {!collapsed && <span>Manajemen User</span>}
          </Link>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Keluar' : undefined}
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
            O
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-medium text-slate-200">Pemilik Toko</p>
              <p className="text-xs text-emerald-400">● Online</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}