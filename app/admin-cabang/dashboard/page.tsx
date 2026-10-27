'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  Package,
  PackagePlus,
  ShoppingCart,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type InventoryRow = {
  id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string } | null;
};

type StockRequest = {
  id: string;
  qty_requested: number;
  status: string;
  created_at: string;
  product: { name: string } | null;
};

type MachineTicket = {
  id: string;
  machine_name: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  store: { name: string } | null;
};

const panelClass = 'rounded-xl border border-slate-200 bg-white shadow-sm';

const ticketStatus: Record<string, { label: string; className: string }> = {
  dilaporkan: { label: 'Menunggu teknisi', className: 'bg-amber-50 text-amber-700' },
  dicek: { label: 'Sedang dicek', className: 'bg-blue-50 text-blue-700' },
  diperbaiki: { label: 'Sedang diperbaiki', className: 'bg-violet-50 text-violet-700' },
};

export default function DashboardAdminCabangPage() {
  const [storeName, setStoreName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [todaySales, setTodaySales] = useState(0);
  const [todayTransactionCount, setTodayTransactionCount] = useState(0);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [tickets, setTickets] = useState<MachineTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Sesi pengguna tidak ditemukan. Silakan masuk kembali.');

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, store_id')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        if (!profileData?.store_id) throw new Error('Akun ini belum terhubung ke cabang.');

        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('name')
          .eq('id', profileData.store_id)
          .single();
        if (storeError) throw storeError;

        const branchName = storeData?.name ?? 'Cabang';

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfTomorrow = new Date(startOfDay);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        const [transactionResult, inventoryResult, requestResult, ticketResponse] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, total')
            .eq('store_id', profileData.store_id)
            .gte('created_at', startOfDay.toISOString())
            .lt('created_at', startOfTomorrow.toISOString()),
          supabase
            .from('inventories')
            .select('id, quantity, min_threshold, product:products(name)')
            .eq('store_id', profileData.store_id),
          supabase
            .from('stock_requests')
            .select('id, qty_requested, status, created_at, product:products(name)')
            .eq('from_store_id', profileData.store_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets?active_only=true`),
        ]);

        if (transactionResult.error) throw transactionResult.error;
        if (inventoryResult.error) throw inventoryResult.error;
        if (requestResult.error) throw requestResult.error;
        if (!ticketResponse.ok) throw new Error('Gagal memuat tiket perbaikan mesin.');

        const ticketData: unknown = await ticketResponse.json();
        if (!Array.isArray(ticketData)) throw new Error('Format data tiket mesin tidak sesuai.');
        const branchTickets = (ticketData as MachineTicket[]).filter(
          (ticket) => ticket.store?.name === branchName
        );

        if (!active) return;
        setStoreName(branchName);
        setStaffName(profileData.full_name?.trim() || 'Admin Cabang');
        setTodaySales((transactionResult.data ?? []).reduce((total, transaction) => total + transaction.total, 0));
        setTodayTransactionCount(transactionResult.data?.length ?? 0);
        setInventory(
          inventoryResult.data?.map(({ product, ...item }) => ({
            ...item,
            product: product[0] ?? null,
          })) ?? []
        );
        setStockRequests(
          requestResult.data?.map(({ product, ...request }) => ({
            ...request,
            product: product[0] ?? null,
          })) ?? []
        );
        setTickets(branchTickets);
      } catch (error) {
        if (active) {
          setPageError(error instanceof Error ? error.message : 'Dashboard gagal dimuat.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      active = false;
    };
  }, []);

  const lowStock = inventory
    .filter((item) => item.quantity <= item.min_threshold)
    .sort((left, right) => left.quantity - right.quantity);
  const outOfStockCount = lowStock.filter((item) => item.quantity === 0).length;
  const numberOfLowStock = lowStock.length;
  const requestCount = stockRequests.length;
  const currency = (value: number) => `Rp ${value.toLocaleString('id-ID')}`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex min-h-[58px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
        <h1 className="text-base font-semibold text-slate-900">Dashboard Operasional Cabang</h1>
        <span className="hidden text-xs text-slate-500 sm:block">{storeName}</span>
      </header>

      <main className="p-4 sm:p-5 lg:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Selamat bertugas, {staffName || 'Admin'}!</h2>
          <p className="mt-1 text-xs text-slate-500">
            Ringkasan transaksi kasir harian, kondisi stok, dan status pengadaan {storeName || 'cabang'}.
          </p>
        </div>

        {pageError && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <section aria-label="Ringkasan cabang" className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={`${panelClass} flex min-h-20 items-center gap-3 p-4`}>
            <div className="rounded-full bg-sky-50 p-2.5 text-sky-500"><Banknote size={18} /></div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Omzet Kasir Hari Ini</p>
              <p className="truncate text-lg font-semibold leading-tight text-slate-900">
                {loading ? '—' : currency(todaySales)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {loading ? 'Memuat transaksi...' : `${todayTransactionCount} transaksi hari ini`}
              </p>
            </div>
          </div>

          <div className={`${panelClass} flex min-h-20 items-center gap-3 p-4`}>
            <div className="rounded-full bg-red-50 p-2.5 text-red-500"><AlertTriangle size={18} /></div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Peringatan Stok Rak</p>
              <p className={`truncate text-lg font-semibold leading-tight ${outOfStockCount > 0 ? 'text-red-500' : 'text-amber-600'}`}>
                {loading ? '—' : outOfStockCount > 0 ? `${outOfStockCount} Komoditas Habis` : `${numberOfLowStock} Komoditas Menipis`}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                {loading ? 'Memuat stok...' : lowStock[0]?.product?.name ?? 'Semua stok berada di atas batas minimum'}
              </p>
            </div>
          </div>

          <Link
            href="/admin-cabang/pengajuan-stok"
            className={`${panelClass} flex min-h-20 items-center gap-3 p-4 transition hover:border-amber-300`}
          >
            <div className="rounded-full bg-amber-50 p-2.5 text-amber-500"><PackagePlus size={18} /></div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Status Bon Logistik ke Pusat</p>
              <p className="truncate text-lg font-semibold leading-tight text-amber-500">
                {loading ? '—' : `${requestCount} Menunggu ACC`}
              </p>
              <p className="mt-1 text-[10px] text-amber-600">Buka pengajuan stok</p>
            </div>
          </Link>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.05fr]">
          <div className={`${panelClass} min-w-0 overflow-hidden`}>
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-900">Peringatan Stok Rak Menipis &amp; Habis</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[450px] text-left text-[11px]">
                <thead className="border-b border-slate-100 text-[10px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Komoditas</th>
                    <th className="px-3 py-2 font-medium">Sisa Rak</th>
                    <th className="px-3 py-2 font-medium">Ambang Batas</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.slice(0, 4).map((item) => {
                    const isEmpty = item.quantity === 0;
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{item.product?.name ?? 'Barang'}</td>
                        <td className={`px-3 py-2.5 font-medium ${isEmpty ? 'text-red-600' : 'text-amber-600'}`}>
                          {item.quantity} unit
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">Min: {item.min_threshold} unit</td>
                        <td className="px-3 py-2.5">
                          <span className={`whitespace-nowrap rounded px-1.5 py-1 text-[9px] font-semibold ${isEmpty ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                            {isEmpty ? 'STOK HABIS' : 'MENIPIS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && lowStock.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Tidak ada stok menipis.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">Memuat informasi stok...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-500">
              <span>{lowStock.length} barang perlu diperhatikan</span>
              <Link href="/admin-cabang/stok" className="inline-flex items-center gap-1 font-medium text-sky-600 hover:text-sky-700">
                Cek stok <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>

          <div className={`${panelClass} min-w-0 overflow-hidden`}>
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-xs font-semibold text-slate-900">Aksi Cepat &amp; Antrean Bon Pengadaan Terkini</h3>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-3 py-2">
              <Link
                href="/admin-cabang/kasir"
                className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-sky-600"
              >
                <ShoppingCart size={13} /> Buka Kasir POS
              </Link>
              <Link
                href="/admin-cabang/pengajuan-stok"
                className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 px-2.5 py-1.5 text-[10px] font-semibold text-sky-700 hover:bg-sky-50"
              >
                <PackagePlus size={13} /> Buat Pengajuan Stok
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-left text-[11px]">
                <thead className="border-b border-slate-100 text-[10px] text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Barang</th>
                    <th className="px-3 py-2 font-medium">Jumlah</th>
                    <th className="px-3 py-2 font-medium">Status Pusat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockRequests.slice(0, 4).map((request) => (
                    <tr key={request.id}>
                      <td className="px-3 py-2.5 font-medium text-slate-800">{request.product?.name ?? 'Barang'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{request.qty_requested} unit</td>
                      <td className="px-3 py-2.5">
                        <span className="whitespace-nowrap rounded bg-amber-50 px-1.5 py-1 text-[9px] font-semibold text-amber-700">
                          MENUNGGU ACC PUSAT
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && stockRequests.length === 0 && (
                    <tr><td colSpan={3} className="px-3 py-5 text-center text-slate-500">Belum ada bon yang menunggu ACC.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={3} className="px-3 py-5 text-center text-slate-400">Memuat pengajuan...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-3 py-2.5 text-right">
              <Link href="/admin-cabang/pengajuan-stok" className="text-[10px] font-medium text-sky-600 hover:text-sky-700">
                Lihat semua pengajuan
              </Link>
            </div>
          </div>
        </section>

        <section className={`${panelClass} min-w-0 overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-xs font-semibold text-slate-900">Monitoring Pemeliharaan Mesin {storeName}</h3>
            <Link
              href="/admin-cabang/lapor-mesin"
              className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-600 hover:text-sky-700"
            >
              <Wrench size={12} /> Lapor kerusakan
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-[11px]">
              <thead className="border-b border-slate-100 text-[10px] text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Mesin</th>
                  <th className="px-3 py-2 font-medium">Kendala</th>
                  <th className="px-3 py-2 font-medium">Waktu Lapor</th>
                  <th className="px-3 py-2 font-medium">Status Servis</th>
                  <th className="px-3 py-2 font-medium">Urgensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.slice(0, 5).map((ticket) => {
                  const status = ticketStatus[ticket.status] ?? {
                    label: ticket.status,
                    className: 'bg-slate-100 text-slate-600',
                  };
                  const urgency = ticket.urgency === 'urgent'
                    ? { label: 'Mendesak', className: 'bg-red-50 text-red-600' }
                    : ticket.urgency === 'low'
                      ? { label: 'Rendah', className: 'bg-slate-100 text-slate-600' }
                      : { label: 'Normal', className: 'bg-blue-50 text-blue-600' };

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-sky-700">{ticket.machine_name}</td>
                      <td className="max-w-[240px] truncate px-3 py-2.5 text-slate-500">{ticket.description || 'Kendala belum dijelaskan'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{formatDate(ticket.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`whitespace-nowrap rounded px-1.5 py-1 text-[9px] font-semibold ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded px-1.5 py-1 text-[9px] font-semibold ${urgency.className}`}>{urgency.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {!loading && tickets.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Tidak ada tiket mesin aktif di cabang ini.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Memuat tiket mesin...</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-[10px] text-slate-500">
            <span>{tickets.length} tiket aktif</span>
            <Link href="/admin-cabang/lapor-mesin" className="font-medium text-sky-600 hover:text-sky-700">
              Buka halaman mesin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
