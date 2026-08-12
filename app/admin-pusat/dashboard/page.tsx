'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

type LowStockItem = {
  id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string } | null;
};

type Transaction = {
  id: string;
  total: number;
  created_at: string;
};

type PendingRequest = {
  id: string;
  qty_requested: number;
  product: { name: string } | null;
  from_store: { name: string } | null;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function DashboardAdminPusatPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [totalStok, setTotalStok] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const [monthlyData, setMonthlyData] = useState<{ bulan: string; omzet: number }[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentTrx, setRecentTrx] = useState<Transaction[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (!store) return;
      setStoreId(store.id);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, total, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (transactions) {
        setTotalTransaksi(transactions.length);
        setTotalOmzet(transactions.reduce((sum, t) => sum + t.total, 0));
        setRecentTrx(transactions.slice(0, 5));

        const grouped: Record<string, number> = {};
        transactions.forEach((t) => {
          const label = MONTH_NAMES[new Date(t.created_at).getMonth()];
          grouped[label] = (grouped[label] || 0) + t.total;
        });
        setMonthlyData(MONTH_NAMES.map((m) => ({ bulan: m, omzet: grouped[m] || 0 })));
      }

      const { data: inventories } = await supabase
        .from('inventories')
        .select('id, quantity, min_threshold, product:products(name)')
        .eq('store_id', store.id);

      if (inventories) {
        setTotalStok(inventories.reduce((sum, i: any) => sum + i.quantity, 0));
        setLowStock((inventories as any[]).filter((i) => i.quantity <= i.min_threshold).slice(0, 5));
      }

      // pengajuan stok dari cabang yang perlu diproses admin pusat
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/pending`);
      const pending = await res.json();
      setPendingCount(pending.length);
      setPendingRequests(pending.slice(0, 5));
    };

    fetchAll();
  }, []);

  return (
    <div>
      <Topbar title="Dashboard Pusat" subtitle="Ringkasan operasional toko pusat" />

      <div className="p-6">
        {/* 4 kartu ringkasan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
            <p className="text-2xl font-semibold text-gray-900">{totalTransaksi}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Omzet</p>
            <p className="text-2xl font-semibold text-gray-900" suppressHydrationWarning>
              Rp{totalOmzet.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Stok Gudang</p>
            <p className="text-2xl font-semibold text-gray-900">{totalStok}</p>
          </div>
          <Link
            href="/admin-pusat/persetujuan-stok"
            className="bg-white p-4 rounded-lg border border-gray-200 hover:border-orange-300 transition"
          >
            <p className="text-xs text-gray-500 mb-1">Pengajuan Stok Menunggu</p>
            <p className="text-2xl font-semibold text-orange-500">{pendingCount}</p>
          </Link>
        </div>

        {/* grafik + stok menipis */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Omzet Bulanan Toko Pusat</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bulan" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: any) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  return `Rp${Number(v ?? 0).toLocaleString('id-ID')}`;
                }}/>
                <Bar dataKey="omzet" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Stok Menipis</p>
            {lowStock.length === 0 && <p className="text-xs text-gray-500">Tidak ada stok menipis</p>}
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <p className="text-sm text-gray-700">{item.product?.name}</p>
                <span className="text-sm font-medium text-red-500">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2 panel bawah */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Transaksi Terbaru</p>
            {recentTrx.length === 0 && <p className="text-xs text-gray-500">Belum ada transaksi</p>}
            {recentTrx.map((trx) => (
              <div key={trx.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <div>
                  <p className="text-sm text-gray-700">{trx.id.slice(0, 8)}...</p>
                  <p className="text-xs text-gray-500">
                    {new Date(trx.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-sm font-medium text-gray-900" suppressHydrationWarning>
                  Rp{trx.total.toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700">Pengajuan Stok dari Cabang</p>
              <Link href="/admin-pusat/persetujuan-stok" className="text-xs text-blue-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            {pendingRequests.length === 0 && <p className="text-xs text-gray-500">Tidak ada pengajuan pending</p>}
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <div>
                  <p className="text-sm text-gray-700">{req.product?.name}</p>
                  <p className="text-xs text-gray-500">{req.from_store?.name}</p>
                </div>
                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">
                  {req.qty_requested} unit
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}