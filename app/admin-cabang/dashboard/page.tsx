'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

type StockRequest = {
  id: string;
  qty_requested: number;
  status: string;
  product: { name: string } | null;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

export default function DashboardAdminCabangPage() {
  const supabase = createClient();

  const [storeName, setStoreName] = useState('');
  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [totalStok, setTotalStok] = useState(0);
  const [permintaanPending, setPermintaanPending] = useState(0);

  const [monthlyData, setMonthlyData] = useState<{ bulan: string; omzet: number }[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [recentTrx, setRecentTrx] = useState<Transaction[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id, store:stores(name)')
        .eq('id', user.id)
        .single();

      const storeId = (profile as any)?.store_id;
      setStoreName((profile as any)?.store?.name ?? '-');

      if (!storeId) return;

      // transaksi & omzet cabang ini saja
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, total, created_at')
        .eq('store_id', storeId)
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

      // stok cabang ini saja
      const { data: inventories } = await supabase
        .from('inventories')
        .select('id, quantity, min_threshold, product:products(name)')
        .eq('store_id', storeId);

      if (inventories) {
        setTotalStok(inventories.reduce((sum, i: any) => sum + i.quantity, 0));
        setLowStock((inventories as any[]).filter((i) => i.quantity <= i.min_threshold).slice(0, 5));
      }

      // permintaan stok yang diajukan cabang ini, masih pending
      const { data: requests } = await supabase
        .from('stock_requests')
        .select('id, qty_requested, status, product:products(name)')
        .eq('from_store_id', storeId)
        .eq('status', 'pending');

      setPermintaanPending(requests?.length ?? 0);
      setStockRequests((requests as any[]) ?? []);
    };

    fetchAll();
  }, []);

  return (
    <div>
      <Topbar title="Dashboard Cabang" subtitle={`Ringkasan operasional ${storeName}`} />

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
            <p className="text-xs text-gray-500 mb-1">Total Stok Barang</p>
            <p className="text-2xl font-semibold text-gray-900">{totalStok}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Permintaan Stok Pending</p>
            <p className="text-2xl font-semibold text-orange-500">{permintaanPending}</p>
          </div>
        </div>

        {/* grafik + stok menipis */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Omzet Bulanan Cabang</p>
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
            <p className="text-sm font-medium text-gray-700 mb-4">Permintaan Stok Menunggu Persetujuan</p>
            {stockRequests.length === 0 && <p className="text-xs text-gray-500">Tidak ada permintaan pending</p>}
            {stockRequests.map((req) => (
              <div key={req.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <p className="text-sm text-gray-700">{req.product?.name}</p>
                <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">
                  {req.qty_requested} unit • pending
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}