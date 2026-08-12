'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  FileText,
  Users,
  Activity,
  Settings,
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
      } min-h-screen bg-white border-r border-gray-200 flex flex-col justify-between transition-all duration-200`}
    >
      <div>
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          {!collapsed && (
            <div>
              <p className="font-semibold text-gray-900">Toko Sinar Mandiri</p>
              <p className="text-xs text-gray-400">Sistem Informasi Operasional</p>
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
          <Link
            href="/owner/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 ${
              isActive('/owner/dashboard')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} className="shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          <button
            onClick={() => setLaporanOpen(!laporanOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-gray-600 hover:bg-gray-50"
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
            <div className="ml-8 border-l border-gray-200 pl-3 mb-1">
              {laporanItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`block px-3 py-2 rounded-md text-sm ${
                    isActive(item.path)
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/owner/manajemen-user"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 ${
              isActive('/owner/manajemen-user')
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users size={18} className="shrink-0" />
            {!collapsed && <span>Manajemen User</span>}
          </Link>

          <Link
            href="/owner/pengaturan"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 text-gray-600 hover:bg-gray-50"
          >
            <Settings size={18} className="shrink-0" />
            {!collapsed && <span>Pengaturan</span>}
          </Link>

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
            O
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-medium text-gray-700">Pemilik Toko</p>
              <p className="text-xs text-green-500">● Online</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}