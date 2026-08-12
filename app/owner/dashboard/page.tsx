'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type LowStockItem = {
  id: string;
  quantity: number;
  product: { name: string } | null;
  store: { name: string } | null;
};

type StoreOmzet = {
  store: string;
  total: number;
};

type StockRequest = {
  id: string;
  qty_requested: number;
  status: string;
  product: { name: string } | null;
  from_store: { name: string } | null;
};

type Ticket = {
  id: string;
  machine_name: string;
  status: string;
  created_at: string;
  store: { name: string } | null;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [totalTransaksi, setTotalTransaksi] = useState(0);
  const [totalOmzet, setTotalOmzet] = useState(0);
  const [totalStok, setTotalStok] = useState(0);
  const [tiketAktif, setTiketAktif] = useState(0);

  const [monthlyData, setMonthlyData] = useState<{ bulan: string; omzet: number }[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [storeOmzet, setStoreOmzet] = useState<StoreOmzet[]>([]);
  const [stockRequests, setStockRequests] = useState<StockRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      // total transaksi & omzet
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, total, created_at, store:stores(name)');

      if (transactions) {
        setTotalTransaksi(transactions.length);
        setTotalOmzet(transactions.reduce((sum: number, t: any) => sum + t.total, 0));

        // grafik per bulan
        const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const grouped: Record<string, number> = {};
        transactions.forEach((t: any) => {
          const month = new Date(t.created_at).getMonth();
          const label = monthNames[month];
          grouped[label] = (grouped[label] || 0) + t.total;
        });
        setMonthlyData(monthNames.map((m) => ({ bulan: m, omzet: grouped[m] || 0 })));

        // omzet per toko
        const perToko: Record<string, number> = {};
        transactions.forEach((t: any) => {
          const storeName = t.store?.name ?? 'Tidak diketahui';
          perToko[storeName] = (perToko[storeName] || 0) + t.total;
        });
        setStoreOmzet(Object.entries(perToko).map(([store, total]) => ({ store, total })));
      }

      // total stok & barang menipis
      const { data: inventories } = await supabase
        .from('inventories')
        .select('id, quantity, min_threshold, product:products(name), store:stores(name)');

      if (inventories) {
        setTotalStok(inventories.reduce((sum: number, i: any) => sum + i.quantity, 0));
        setLowStock(
          (inventories as any[])
            .filter((i) => i.quantity <= i.min_threshold)
            .slice(0, 4)
        );
      }

      // tiket aktif (belum selesai)
      const { data: ticketData } = await supabase
        .from('machine_tickets')
        .select('id, machine_name, status, created_at, store:stores(name)')
        .neq('status', 'selesai')
        .order('created_at', { ascending: false });

      if (ticketData) {
        setTiketAktif(ticketData.length);
        setTickets((ticketData as any[]).slice(0, 4));
      }

      // permintaan stok pending
      const { data: requestData } = await supabase
        .from('stock_requests')
        .select('id, qty_requested, status, product:products(name), from_store:stores(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(4);

      setStockRequests((requestData as any[]) ?? []);
    };

    fetchAll();
  }, []);

  return (
    <div>
      <Topbar title="Dashboard" subtitle="Ringkasan operasional seluruh toko" />

      <div className="p-6">
        {/* 4 kartu ringkasan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Transaksi</p>
            <p className="text-2xl font-semibold text-gray-800">{totalTransaksi}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Omzet</p>
            <p className="text-2xl font-semibold text-gray-800">Rp{totalOmzet.toLocaleString('id-ID')}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Stok Barang</p>
            <p className="text-2xl font-semibold text-gray-800">{totalStok}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Tiket Aktif</p>
            <p className="text-2xl font-semibold text-red-500">{tiketAktif}</p>
          </div>
        </div>

        {/* grafik + panel stok menipis */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Omzet Bulanan</p>
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
            {lowStock.length === 0 && <p className="text-xs text-gray-400">Tidak ada stok menipis</p>}
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <div>
                  <p className="text-sm text-gray-700">{item.product?.name}</p>
                  <p className="text-xs text-gray-400">{item.store?.name}</p>
                </div>
                <span className="text-sm font-medium text-red-500">{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 panel bawah */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Omzet per Toko</p>
            <table className="w-full text-sm">
              <tbody>
                {storeOmzet.map((row) => (
                  <tr key={row.store} className="border-t border-gray-100">
                    <td className="py-2 text-gray-600">{row.store}</td>
                    <td className="py-2 text-right font-medium text-gray-800">
                      Rp{row.total.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="w-full mt-3 border border-gray-300 rounded-md py-2 text-sm text-gray-600">
              Lihat Laporan Penjualan
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Permintaan Stok Pending</p>
            {stockRequests.length === 0 && <p className="text-xs text-gray-400">Tidak ada permintaan pending</p>}
            {stockRequests.map((req) => (
              <div key={req.id} className="py-2 border-t border-gray-100 first:border-t-0">
                <p className="text-sm text-gray-700">{req.product?.name} x{req.qty_requested}</p>
                <p className="text-xs text-gray-400">{req.from_store?.name}</p>
              </div>
            ))}
            <button className="w-full mt-3 border border-gray-300 rounded-md py-2 text-sm text-gray-600">
              Lihat Semua Permintaan
            </button>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-4">Tiket Kerusakan Terbaru</p>
            {tickets.length === 0 && <p className="text-xs text-gray-400">Tidak ada tiket aktif</p>}
            {tickets.map((ticket) => (
              <div key={ticket.id} className="flex justify-between items-center py-2 border-t border-gray-100 first:border-t-0">
                <div>
                  <p className="text-sm text-gray-700">{ticket.machine_name}</p>
                  <p className="text-xs text-gray-400">{ticket.store?.name} • {ticket.status}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(ticket.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            <button className="w-full mt-3 border border-gray-300 rounded-md py-2 text-sm text-gray-600">
              Lihat Semua Tiket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}