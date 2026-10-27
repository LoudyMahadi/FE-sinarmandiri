'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Bell, Box, ChevronLeft, ChevronRight, FileText, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type InventoryRow = {
  id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string; sku: string | null } | null;
};

type PendingRequest = {
  id: string;
  qty_requested: number;
  product: { name: string } | null;
  from_store: { name: string } | null;
};

type StockMovement = {
  id: string;
  tipe: 'masuk' | 'keluar';
  qty: number;
  catatan: string | null;
  created_at: string;
  product: { name: string } | null;
};

const panelClass = 'rounded-xl border border-slate-200 bg-white shadow-sm';

export default function DashboardAdminPusatPage() {
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      const supabase = createClient();
      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('type', 'pusat')
          .single();
        if (storeError) throw storeError;
        if (!store) throw new Error('Data toko pusat tidak ditemukan.');

        const [inventoryResult, pendingResponse, movementResponse] = await Promise.all([
          supabase
            .from('inventories')
            .select('id, quantity, min_threshold, product:products(name, sku)')
            .eq('store_id', store.id)
            .order('product_id'),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/pending`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/store/${store.id}`),
        ]);

        if (inventoryResult.error) throw inventoryResult.error;
        if (!pendingResponse.ok) throw new Error('Gagal memuat pengajuan stok yang menunggu.');
        if (!movementResponse.ok) throw new Error('Gagal memuat log mutasi stok.');

        const pendingData: unknown = await pendingResponse.json();
        const movementData: unknown = await movementResponse.json();
        if (!Array.isArray(pendingData) || !Array.isArray(movementData)) {
          throw new Error('Format data dashboard dari server tidak sesuai.');
        }

        if (active) {
          setInventory(
            (inventoryResult.data ?? []).map((item) => ({
              ...item,
              product: Array.isArray(item.product) ? item.product[0] ?? null : item.product,
            })) as InventoryRow[],
          );
          setPendingRequests(pendingData as PendingRequest[]);
          setMovements(movementData as StockMovement[]);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Dashboard gagal dimuat.');
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

  const lowStock = inventory.filter((item) => item.quantity <= item.min_threshold);
  const formatDate = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex min-h-[58px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-7">
        <h1 className="text-base font-semibold text-slate-900">Dashboard Operasional Pusat</h1>
        <button
          type="button"
          aria-label="Notifikasi"
          className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
        >
          <Bell size={17} />
          {pendingRequests.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {pendingRequests.length}
            </span>
          )}
        </button>
      </header>

      <main className="p-4 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-900">Selamat pagi!</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ringkasan pengawasan rantai pasok gudang utama dan otorisasi pengadaan cabang.
          </p>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section aria-label="Ringkasan operasional" className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={`${panelClass} flex min-h-24 items-center gap-3 p-4`}>
            <div className="rounded-full bg-sky-50 p-3 text-sky-500"><Box size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Total Komoditas Aktif</p>
              <p className="text-2xl font-semibold leading-tight text-slate-900">
                {loading ? '—' : `${inventory.length} SKU`}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Gudang Utama Pusat</p>
            </div>
          </div>

          <div className={`${panelClass} flex min-h-24 items-center gap-3 p-4`}>
            <div className="rounded-full bg-red-50 p-3 text-red-500"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Peringatan Stok Kritis</p>
              <p className="text-2xl font-semibold leading-tight text-red-500">
                {loading ? '—' : `${lowStock.length} Komoditas`}
              </p>
              <p className="mt-1 text-[11px] text-red-500">● Menyentuh batas safety stock</p>
            </div>
          </div>

          <Link
            href="/admin-pusat/persetujuan-stok"
            className={`${panelClass} flex min-h-24 items-center gap-3 p-4 transition hover:border-amber-300`}
          >
            <div className="rounded-full bg-amber-50 p-3 text-amber-500"><FileText size={20} /></div>
            <div>
              <p className="text-xs text-slate-500">Ajuan Bon Cabang Masuk</p>
              <p className="text-2xl font-semibold leading-tight text-amber-500">
                {loading ? '—' : `${pendingRequests.length} Request Pending`}
              </p>
              <p className="mt-1 text-[11px] text-amber-500">● Menunggu Tindakan Otorisasi</p>
            </div>
          </Link>
        </section>

        <section className="mb-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_1fr]">
          <div className={`${panelClass} min-w-0 p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Daftar Pengajuan Stok Cabang Terkini</h3>
              <MoreVertical size={17} className="text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="border-b border-slate-100 text-[11px] text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">ID Request</th>
                    <th className="pb-2 pr-3 font-medium">Cabang Asal</th>
                    <th className="pb-2 pr-3 font-medium">Komoditas</th>
                    <th className="pb-2 pr-3 font-medium">Jumlah</th>
                    <th className="pb-2 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingRequests.slice(0, 4).map((request) => (
                    <tr key={request.id}>
                      <td className="py-2.5 pr-3 font-medium text-slate-800">REQ-{request.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{request.from_store?.name ?? '-'}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{request.product?.name ?? '-'}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{request.qty_requested}</td>
                      <td className="py-2.5">
                        <Link
                          href="/admin-pusat/persetujuan-stok"
                          className="inline-flex whitespace-nowrap rounded-md bg-sky-500 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-sky-600"
                        >
                          Lihat &amp; ACC
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!loading && pendingRequests.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-500">Tidak ada pengajuan stok yang menunggu.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={5} className="py-6 text-center text-slate-400">Memuat pengajuan...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              <span>Menampilkan 1–{Math.min(pendingRequests.length, 4)} dari {pendingRequests.length} data</span>
              <Pagination />
            </div>
          </div>

          <div className={`${panelClass} min-w-0 p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Peringatan Batas Minimum Stok Gudang (Safety Stock)</h3>
              <MoreVertical size={17} className="text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-xs">
                <thead className="border-b border-slate-100 text-[11px] text-slate-500">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Komoditas</th>
                    <th className="pb-2 pr-3 font-medium">SKU</th>
                    <th className="pb-2 pr-3 font-medium">Sisa Stok</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.slice(0, 4).map((item) => {
                    const critical = item.quantity === 0;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-3 font-medium text-slate-800">{item.product?.name ?? '-'}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{item.product?.sku ?? '-'}</td>
                        <td className="py-2.5 pr-3 text-slate-500">{item.quantity} (Min: {item.min_threshold})</td>
                        <td className="py-2.5">
                          <span className={`rounded border px-2 py-1 text-[10px] font-medium ${critical ? 'border-red-200 bg-red-50 text-red-600' : 'border-orange-200 bg-orange-50 text-orange-600'}`}>
                            {critical ? 'KRITIS' : 'MINIMUM'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && lowStock.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-500">Tidak ada stok di bawah batas minimum.</td></tr>
                  )}
                  {loading && (
                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">Memuat stok...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              <span>Menampilkan 1–{Math.min(lowStock.length, 4)} dari {lowStock.length} data</span>
              <Pagination />
            </div>
          </div>
        </section>

        <section className={`${panelClass} min-w-0 p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Log Mutasi Masuk &amp; Pengeluaran Logistik Gudang</h3>
            <MoreVertical size={17} className="text-slate-400" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead className="border-b border-slate-100 text-[11px] text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Waktu</th>
                  <th className="pb-2 pr-4 font-medium">Tipe Mutasi</th>
                  <th className="pb-2 pr-4 font-medium">Komoditas</th>
                  <th className="pb-2 font-medium">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.slice(0, 5).map((movement) => {
                  const isInbound = movement.tipe === 'masuk';
                  return (
                    <tr key={movement.id}>
                      <td className="py-2.5 pr-4 text-slate-500">{formatDate(movement.created_at)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`rounded border px-2 py-1 text-[10px] font-medium ${isInbound ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                          {isInbound ? 'Stock In' : 'Stock Out'}{movement.catatan ? ` (${movement.catatan})` : ''}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-medium text-slate-800">{movement.product?.name ?? '-'}</td>
                      <td className="py-2.5 text-slate-500">{movement.qty}</td>
                    </tr>
                  );
                })}
                {!loading && movements.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-500">Belum ada mutasi stok.</td></tr>
                )}
                {loading && (
                  <tr><td colSpan={4} className="py-6 text-center text-slate-400">Memuat log mutasi...</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <span>Menampilkan 1–{Math.min(movements.length, 5)} dari {movements.length} data</span>
            <Pagination />
          </div>
        </section>
      </main>
    </div>
  );
}

function Pagination() {
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label="Halaman sebelumnya" disabled className="rounded border border-slate-200 p-1 text-slate-300 disabled:cursor-not-allowed">
        <ChevronLeft size={14} />
      </button>
      <span className="rounded bg-sky-500 px-2 py-1 text-[11px] font-medium text-white">1</span>
      <button type="button" aria-label="Halaman berikutnya" disabled className="rounded border border-slate-200 p-1 text-slate-300 disabled:cursor-not-allowed">
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
