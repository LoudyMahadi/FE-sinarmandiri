'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type FinancialRecord = {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori: string;
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  profile: { full_name: string } | null;
};

const ITEMS_PER_PAGE = 5;
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function LaporanKeuanganPage() {
  const supabase = createClient();

  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [search, setSearch] = useState('');
  const [tipeFilter, setTipeFilter] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('financial_records')
        .select('id, tanggal, deskripsi, kategori, tipe, nominal, profile:profiles(full_name)')
        .order('tanggal', { ascending: false });

      setRecords((data as any) ?? []);
    };
    fetchData();
  }, []);

  // ringkasan
  const totalPemasukan = records.filter((r) => r.tipe === 'pemasukan').reduce((s, r) => s + r.nominal, 0);
  const totalPengeluaran = records.filter((r) => r.tipe === 'pengeluaran').reduce((s, r) => s + r.nominal, 0);
  const labaBersih = totalPemasukan - totalPengeluaran;
  const totalTransaksi = records.length;

  // data grafik per bulan
  const chartData = MONTH_NAMES.map((bulan, index) => {
    const pemasukan = records
      .filter((r) => r.tipe === 'pemasukan' && new Date(r.tanggal).getMonth() === index)
      .reduce((s, r) => s + r.nominal, 0);
    const pengeluaran = records
      .filter((r) => r.tipe === 'pengeluaran' && new Date(r.tanggal).getMonth() === index)
      .reduce((s, r) => s + r.nominal, 0);
    return { bulan, pemasukan, pengeluaran };
  });

  // filter tabel
  const filtered = records.filter((r) => {
    const matchTipe = tipeFilter === 'semua' || r.tipe === tipeFilter;
    const matchSearch =
      r.deskripsi?.toLowerCase().includes(search.toLowerCase()) ||
      r.kategori?.toLowerCase().includes(search.toLowerCase());
    return matchTipe && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <Topbar title="Laporan Keuangan" subtitle="Pemantauan kondisi keuangan toko berdasarkan periode" />

      <div className="p-6">
        {/* 4 kartu ringkasan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Pemasukan</p>
            <p className="text-2xl font-semibold text-green-600" suppressHydrationWarning>
              Rp{totalPemasukan.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-semibold text-red-500" suppressHydrationWarning>
              Rp{totalPengeluaran.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Laba Bersih</p>
            <p className={`text-2xl font-semibold ${labaBersih >= 0 ? 'text-gray-800' : 'text-red-500'}`} suppressHydrationWarning>
              Rp{labaBersih.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-400 mb-1">Total Catatan</p>
            <p className="text-2xl font-semibold text-gray-800">{totalTransaksi}</p>
          </div>
        </div>

        {/* grafik tren */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">Tren Pemasukan & Pengeluaran</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="bulan" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value: any) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  return `Rp${Number(v ?? 0).toLocaleString('id-ID')}`;
                }}/>
              <Legend />
              <Line type="monotone" dataKey="pemasukan" name="Pemasukan (Rp)" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="pengeluaran" name="Pengeluaran (Rp)" stroke="#EF4444" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* filter + search tabel */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-700">Rincian Transaksi Keuangan</p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Cari deskripsi/kategori..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-56"
            />
            <select
              value={tipeFilter}
              onChange={(e) => { setTipeFilter(e.target.value); setCurrentPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="semua">Semua Tipe</option>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
          </div>
        </div>

        {/* tabel */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">No</th>
                <th className="text-left px-4 py-3">Tanggal</th>
                <th className="text-left px-4 py-3">Deskripsi</th>
                <th className="text-left px-4 py-3">Kategori</th>
                <th className="text-left px-4 py-3">Tipe</th>
                <th className="text-left px-4 py-3">Nominal</th>
                <th className="text-left px-4 py-3">Dibuat Oleh</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">Belum ada catatan keuangan</td>
                </tr>
              )}
              {paginatedData.map((record, i) => (
                <tr key={record.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                  <td className="px-4 py-3">
                    {new Date(record.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">{record.deskripsi}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{record.kategori}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${record.tipe === 'pemasukan' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {record.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-medium ${record.tipe === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`} suppressHydrationWarning>
                    {record.tipe === 'pemasukan' ? '+' : '-'}Rp{record.nominal.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{record.profile?.full_name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">Menampilkan {paginatedData.length} dari {filtered.length} data</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 border border-gray-300 rounded-md text-sm disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-md text-sm ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600'}`}
              >{page}</button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 border border-gray-300 rounded-md text-sm disabled:opacity-40"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  );
}