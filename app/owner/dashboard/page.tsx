'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bell, Download, FileText, Printer, TrendingUp, Wallet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Store = { id: string; name: string; type: string };
type Trx = { id: string; total: number; created_at: string; store_id: string };
type Pengeluaran = { nominal: number; store_id: string; tanggal: string };
type Inv = {
  id: string;
  quantity: number;
  min_threshold: number;
  store_id: string;
  product: { name: string } | null;
  store: { name: string } | null;
};
type Ticket = {
  id: string;
  machine_name: string;
  description: string | null;
  status: string;
  created_at: string;
  store_id: string;
  store: { name: string } | null;
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const STORE_COLORS = ['#0EA5E9', '#7C3AED', '#F97316', '#10B981', '#EF4444'];

const TICKET_BADGE: Record<string, { label: string; cls: string }> = {
  dilaporkan: { label: 'DILAPORKAN', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  dicek: { label: 'DICEK', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  diperbaiki: { label: 'SEDANG DIPERBAIKI', cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  selesai: { label: 'SELESAI', cls: 'bg-green-50 text-green-600 border-green-200' },
};

const fmt = (n: number) => {
  const sign = n < 0 ? '-' : '';
  return sign + Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
const rupiah = (n: number) => `Rp ${fmt(n)}`;
const compact = (v: number) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)} Jt`;
  if (v >= 1000) return `${Math.round(v / 1000)} rb`;
  return `${v}`;
};
const shortName = (n?: string | null) => (n ?? '-').replace(/^Toko\s+/i, '');

export default function DashboardOwnerPage() {
  const supabase = createClient();

  const [loaded, setLoaded] = useState(false);
  const [greeting, setGreeting] = useState('Halo');
  const [ownerName, setOwnerName] = useState('Owner');
  const [selectedStore, setSelectedStore] = useState('semua');
  const [exportOpen, setExportOpen] = useState(false);

  const [stores, setStores] = useState<Store[]>([]);
  const [trx, setTrx] = useState<Trx[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [inventories, setInventories] = useState<Inv[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const hour = new Date().getHours();
        setGreeting(hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam');

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
          if (profile?.full_name) setOwnerName(profile.full_name);
        }

        const { data: storeData } = await supabase.from('stores').select('id, name, type');
        const sortedStores = [...((storeData ?? []) as Store[])].sort((a, b) =>
          a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'pusat' ? -1 : 1
        );
        setStores(sortedStores);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: trxData } = await supabase
          .from('transactions')
          .select('id, total, created_at, store_id')
          .gte('created_at', sixtyDaysAgo.toISOString());
        setTrx((trxData as Trx[]) ?? []);

        const { data: expData } = await supabase
          .from('financial_records')
          .select('nominal, store_id, tanggal')
          .eq('tipe', 'pengeluaran')
          .gte('tanggal', thirtyDaysAgo.toISOString());
        setPengeluaran((expData as Pengeluaran[]) ?? []);

        const { data: invData } = await supabase
          .from('inventories')
          .select('id, quantity, min_threshold, store_id, product:products(name), store:stores(name)');
        setInventories((invData as any) ?? []);

        const { data: ticketData } = await supabase
          .from('machine_tickets')
          .select('id, machine_name, description, status, created_at, store_id, store:stores(name)')
          .order('created_at', { ascending: false });
        setTickets((ticketData as any) ?? []);
      } finally {
        setLoaded(true);
      }
    };
    fetchAll();
  }, []);

  const visibleStores = useMemo(
    () => (selectedStore === 'semua' ? stores : stores.filter((s) => s.id === selectedStore)),
    [stores, selectedStore]
  );

  const colorOf = (id: string) => STORE_COLORS[Math.max(0, stores.findIndex((s) => s.id === id)) % STORE_COLORS.length];

  const selectedLabel =
    selectedStore === 'semua' ? 'Semua Lokasi' : stores.find((s) => s.id === selectedStore)?.name ?? '-';

  // ringkasan 30 hari terakhir vs 30 hari sebelumnya
  const stats = useMemo(() => {
    const now = new Date();
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);
    const start60 = new Date(now);
    start60.setDate(start60.getDate() - 60);

    const scoped = trx.filter((t) => selectedStore === 'semua' || t.store_id === selectedStore);
    const cur = scoped.filter((t) => new Date(t.created_at) >= start30);
    const prev = scoped.filter((t) => {
      const d = new Date(t.created_at);
      return d >= start60 && d < start30;
    });

    const omzet = cur.reduce((s, t) => s + t.total, 0);
    const omzetPrev = prev.reduce((s, t) => s + t.total, 0);
    const growth = omzetPrev > 0 ? ((omzet - omzetPrev) / omzetPrev) * 100 : null;

    const biaya = pengeluaran
      .filter((p) => selectedStore === 'semua' || p.store_id === selectedStore)
      .reduce((s, p) => s + p.nominal, 0);
    const laba = omzet - biaya;
    const margin = omzet > 0 ? (laba / omzet) * 100 : null;

    return { omzet, growth, count: cur.length, laba, margin };
  }, [trx, pengeluaran, selectedStore]);

  // data grafik: 30 hari x toko
  const chartData = useMemo(() => {
    if (!loaded) return [];
    const result: Record<string, number | string>[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const row: Record<string, number | string> = {
        label: `${String(d.getDate()).padStart(2, '0')} ${MONTH_SHORT[d.getMonth()]}`,
        _key: d.toDateString(),
      };
      visibleStores.forEach((s) => { row[s.name] = 0; });
      result.push(row);
    }
    trx.forEach((t) => {
      const store = visibleStores.find((s) => s.id === t.store_id);
      if (!store) return;
      const row = result.find((r) => r._key === new Date(t.created_at).toDateString());
      if (row) row[store.name] = (row[store.name] as number) + t.total;
    });
    return result;
  }, [loaded, trx, visibleStores]);

  const lowStock = inventories
    .filter((i) => (selectedStore === 'semua' || i.store_id === selectedStore) && i.quantity <= i.min_threshold)
    .sort((a, b) => a.quantity - b.quantity);

  const scopedTickets = tickets.filter((t) => selectedStore === 'semua' || t.store_id === selectedStore);
  const activeTickets = scopedTickets.filter((t) => t.status !== 'selesai');
  const monitorTickets = [...activeTickets, ...scopedTickets.filter((t) => t.status === 'selesai')].slice(0, 5);
  const storesWithIssue = Array.from(new Set(activeTickets.map((t) => shortName(t.store?.name))));

  const notifCount = lowStock.length + activeTickets.length;

  const subtitle =
    selectedStore === 'semua'
      ? `Ringkasan performa bisnis dan monitoring operasional konsolidasi ${stores.length} gerai toko.`
      : `Ringkasan performa bisnis dan monitoring operasional ${selectedLabel}.`;

  const omzetPerToko = visibleStores.map((s) => ({
    name: s.name,
    total: chartData.reduce((sum, row) => sum + ((row[s.name] as number) || 0), 0),
  }));

  const handleExportExcel = () => {
    const ringkasan = [
      { Metrik: 'Lokasi', Nilai: selectedLabel },
      { Metrik: 'Periode', Nilai: '30 hari terakhir' },
      { Metrik: 'Total Omzet', Nilai: stats.omzet },
      { Metrik: 'Total Transaksi', Nilai: stats.count },
      { Metrik: 'Estimasi Laba Bersih', Nilai: stats.laba },
      { Metrik: 'Margin (%)', Nilai: stats.margin !== null ? Number(stats.margin.toFixed(1)) : '-' },
      { Metrik: 'Tiket Mesin Aktif', Nilai: activeTickets.length },
      { Metrik: 'Barang Stok Kritis', Nilai: lowStock.length },
    ];

    const harian = chartData.map((row) => {
      const out: Record<string, string | number> = { Tanggal: row.label as string };
      visibleStores.forEach((s) => { out[s.name] = row[s.name] as number; });
      return out;
    });

    const stokKritis = lowStock.map((i) => ({
      Komoditas: i.product?.name ?? '-',
      Lokasi: i.store?.name ?? '-',
      Stok: i.quantity,
      'Batas Minimum': i.min_threshold,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(harian), 'Omzet 30 Hari');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stokKritis), 'Stok Kritis');
    XLSX.writeFile(wb, `Dashboard-Eksekutif-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Dashboard Eksekutif - Toko Sinar Mandiri', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Lokasi: ${selectedLabel}  |  Periode: 30 hari terakhir`, 14, 21);

    autoTable(doc, {
      startY: 27,
      head: [['Metrik', 'Nilai']],
      body: [
        ['Total Omzet', rupiah(stats.omzet)],
        ['Total Transaksi', `${stats.count} nota`],
        ['Estimasi Laba Bersih', rupiah(stats.laba)],
        ['Margin', stats.margin !== null ? `${stats.margin.toFixed(1).replace('.', ',')}%` : '-'],
        ['Tiket Mesin Aktif', `${activeTickets.length}`],
        ['Barang Stok Kritis', `${lowStock.length}`],
      ],
      headStyles: { fillColor: [26, 34, 51] },
      styles: { fontSize: 9 },
    });

    let nextY = ((doc as any).lastAutoTable?.finalY ?? 80) + 8;
    autoTable(doc, {
      startY: nextY,
      head: [['Toko', 'Omzet 30 Hari']],
      body: omzetPerToko.map((o) => [o.name, rupiah(o.total)]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });

    nextY = ((doc as any).lastAutoTable?.finalY ?? 120) + 8;
    autoTable(doc, {
      startY: nextY,
      head: [['Komoditas', 'Lokasi', 'Stok', 'Batas Minimum']],
      body: lowStock.map((i) => [i.product?.name ?? '-', i.store?.name ?? '-', i.quantity, i.min_threshold]),
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 9 },
    });

    doc.save(`Dashboard-Eksekutif-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div>
      {/* header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard Eksekutif</h1>

        <div className="flex items-center gap-3">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white"
          >
            <option value="semua">-- Semua Lokasi (Pusat & Cabang) --</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="relative p-2 text-gray-500">
            <Bell size={20} />
            {notifCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              <Download size={16} />
              Ekspor Laporan PDF/Excel
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => { handleExportExcel(); setExportOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => { handleExportPDF(); setExportOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{greeting}, {ownerName}!</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        {/* 4 kartu ringkasan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Omzet Konsolidasi</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{rupiah(stats.omzet)}</p>
                {stats.growth !== null ? (
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded mt-1.5 ${
                    stats.growth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {stats.growth >= 0 ? '↑ +' : '↓ '}{stats.growth.toFixed(1).replace('.', ',')}% vs 30 hari sebelumnya
                  </span>
                ) : (
                  <span className="inline-block text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded mt-1.5">
                    30 hari terakhir
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Transaksi Nota</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{fmt(stats.count)} Nota</p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {selectedStore === 'semua' ? `Gabungan ${stores.length} Toko` : selectedLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimasi Laba Bersih</p>
                <p className={`text-xl font-semibold mt-0.5 ${stats.laba >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                  {rupiah(stats.laba)}
                </p>
                <p className="text-xs text-gray-500 mt-1.5">
                  {stats.margin !== null ? `Margin ${stats.margin.toFixed(1).replace('.', ',')}%` : 'Belum ada data margin'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                <Printer size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Kondisi Perangkat Mesin</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{activeTickets.length} Tiket Aktif</p>
                {activeTickets.length > 0 ? (
                  <span className="inline-block text-[11px] font-medium bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded mt-1.5">
                    ⚠ Perlu servis: {storesWithIssue.join(', ')}
                  </span>
                ) : (
                  <span className="inline-block text-[11px] font-medium bg-green-50 text-green-600 px-2 py-0.5 rounded mt-1.5">
                    ✓ Semua mesin normal
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* grafik */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">Perbandingan Tren Pendapatan 30 Hari Terakhir</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {visibleStores.map((s) => (
                <span key={s.id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorOf(s.id) }} />
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barCategoryGap="20%" barGap={1}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="label" fontSize={11} tickLine={false} interval={1} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => compact(v)} />
              <Tooltip formatter={(value) => rupiah(Number(value ?? 0))} />
              {visibleStores.map((s) => (
                <Bar key={s.id} dataKey={s.name} fill={colorOf(s.id)} radius={[2, 2, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 2 tabel monitoring */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Peringatan Stok Kritis</p>
              <Link href="/owner/laporan/inventori" className="text-xs text-blue-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left font-medium pb-2">Komoditas</th>
                  <th className="text-left font-medium pb-2">Lokasi</th>
                  <th className="text-left font-medium pb-2">Stok vs Batas</th>
                  <th className="text-left font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-xs text-gray-500">Tidak ada stok kritis</td></tr>
                )}
                {lowStock.slice(0, 5).map((item) => (
                  <tr key={item.id} className={`border-t border-gray-100 ${item.quantity === 0 ? 'bg-red-50' : ''}`}>
                    <td className="py-2.5 pr-2 font-medium text-gray-800">{item.product?.name}</td>
                    <td className="py-2.5 pr-2 text-gray-600">{shortName(item.store?.name)}</td>
                    <td className="py-2.5 pr-2 text-gray-600">{item.quantity} (min. {item.min_threshold})</td>
                    <td className="py-2.5">
                      {item.quantity === 0 ? (
                        <span className="text-[10px] font-semibold bg-red-500 text-white px-2.5 py-1 rounded-full">HABIS</span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-orange-100 text-orange-600 px-2.5 py-1 rounded-full">MENIPIS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Monitoring Status Aset Mesin Produksi</p>
              <Link href="/owner/laporan/perbaikan-mesin" className="text-xs text-blue-600 hover:underline">
                Lihat semua
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500">
                <tr>
                  <th className="text-left font-medium pb-2">Unit Mesin</th>
                  <th className="text-left font-medium pb-2">Lokasi Toko</th>
                  <th className="text-left font-medium pb-2">Kendala</th>
                  <th className="text-left font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {monitorTickets.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-xs text-gray-500">Belum ada tiket kerusakan</td></tr>
                )}
                {monitorTickets.map((t) => {
                  const badge = TICKET_BADGE[t.status] ?? TICKET_BADGE.dilaporkan;
                  return (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-2.5 pr-2 font-medium text-gray-800">{t.machine_name}</td>
                      <td className="py-2.5 pr-2 text-gray-600">{t.store?.name}</td>
                      <td className="py-2.5 pr-2 text-gray-600 max-w-[140px] truncate">{t.description || '-'}</td>
                      <td className="py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-1 rounded border whitespace-nowrap ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}