'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { X } from 'lucide-react';

type Transaction = {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
  store: { name: string } | null;
};

type Store = {
  id: string;
  name: string;
};

type TransactionItem = {
  id: string;
  qty: number;
  subtotal: number;
  product: { name: string } | null;
};

const ITEMS_PER_PAGE = 10;
const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function LaporanPenjualanPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('semua');
  const [selectedMonth, setSelectedMonth] = useState('semua');
  const [selectedYear, setSelectedYear] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);

  // state buat modal detail
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [trxItems, setTrxItems] = useState<TransactionItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: storeData } = await supabase.from('stores').select('id, name');
      setStores(storeData ?? []);

      const { data: trxData } = await supabase
        .from('transactions')
        .select('id, total, payment_method, created_at, store:stores(name)')
        .order('created_at', { ascending: false });

      setTransactions((trxData as any) ?? []);
    };
    fetchData();
  }, []);

  const availableYears = Array.from(
    new Set(transactions.map((trx) => new Date(trx.created_at).getFullYear()))
  ).sort((a, b) => b - a);

  const filtered = transactions.filter((trx) => {
    const date = new Date(trx.created_at);
    const matchStore = selectedStore === 'semua' || trx.store?.name === selectedStore;
    const matchSearch =
      trx.id.toLowerCase().includes(search.toLowerCase()) ||
      trx.store?.name?.toLowerCase().includes(search.toLowerCase());
    const matchMonth = selectedMonth === 'semua' || date.getMonth() === Number(selectedMonth);
    const matchYear = selectedYear === 'semua' || date.getFullYear() === Number(selectedYear);
    return matchStore && matchSearch && matchMonth && matchYear;
  });

  const totalOmzet = filtered.reduce((sum, trx) => sum + trx.total, 0);
  const totalTransaksi = filtered.length;
  const rataRata = totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const periodeLabel =
    (selectedMonth === 'semua' ? 'Semua Bulan' : MONTH_NAMES[Number(selectedMonth)]) +
    ' ' +
    (selectedYear === 'semua' ? 'Semua Tahun' : selectedYear);

  const handleLihatDetail = async (trx: Transaction) => {
    setSelectedTrx(trx);
    setLoadingDetail(true);
    setTrxItems([]);

    const { data } = await supabase
      .from('transaction_items')
      .select('id, qty, subtotal, product:products(name)')
      .eq('transaction_id', trx.id);

    setTrxItems((data as any) ?? []);
    setLoadingDetail(false);
  };

  const closeModal = () => {
    setSelectedTrx(null);
    setTrxItems([]);
  };

  const handleExportExcel = () => {
    const exportData = filtered.map((trx, i) => ({
      No: i + 1,
      'ID Transaksi': trx.id,
      Tanggal: new Date(trx.created_at).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
      Cabang: trx.store?.name ?? '-',
      'Total Harga': trx.total,
      'Metode Pembayaran': trx.payment_method,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [
      { wch: 5 }, { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Penjualan');
    XLSX.writeFile(workbook, `Laporan-Penjualan-${periodeLabel.replace(/\s+/g, '-')}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('Laporan Penjualan - Toko Sinar Mandiri', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periode: ${periodeLabel}`, 14, 21);
    doc.text(`Total Omzet: Rp${totalOmzet.toLocaleString('id-ID')}  |  Total Transaksi: ${totalTransaksi}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [['No', 'ID Transaksi', 'Tanggal', 'Cabang', 'Total Harga', 'Metode Pembayaran']],
      body: filtered.map((trx, i) => [
        i + 1,
        trx.id.slice(0, 8) + '...',
        new Date(trx.created_at).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        trx.store?.name ?? '-',
        `Rp${trx.total.toLocaleString('id-ID')}`,
        trx.payment_method,
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan-Penjualan-${periodeLabel.replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <div>
      <Topbar title="Laporan Penjualan" subtitle="Data transaksi seluruh cabang toko" />

      <div className="p-6">
        {/* baris filter */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            value={selectedMonth}
            onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white"
          >
            <option value="semua">Semua Bulan</option>
            {MONTH_NAMES.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white"
          >
            <option value="semua">Semua Tahun</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={selectedStore}
            onChange={(e) => { setSelectedStore(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 bg-white"
          >
            <option value="semua">Semua Cabang</option>
            {stores.map((store) => (
              <option key={store.id} value={store.name}>{store.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Cari ID transaksi / cabang..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 flex-1 max-w-xs"
          />

          <div className="flex-1" />

          <button
            onClick={handleExportPDF}
            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-600 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center justify-center rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            Excel
          </button>
        </div>

        {/* 4 kartu ringkasan */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Omzet</p>
            <p className="text-2xl font-semibold text-gray-900" suppressHydrationWarning>
              Rp{totalOmzet.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Transaksi</p>
            <p className="text-2xl font-semibold text-gray-900">{totalTransaksi}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Rata-rata per Transaksi</p>
            <p className="text-2xl font-semibold text-gray-900" suppressHydrationWarning>
              Rp{rataRata.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Cabang Aktif</p>
            <p className="text-2xl font-semibold text-gray-900">{stores.length}</p>
          </div>
        </div>

        {/* tabel transaksi */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">No</th>
                <th className="text-left px-4 py-3">ID Transaksi</th>
                <th className="text-left px-4 py-3">Tanggal</th>
                <th className="text-left px-4 py-3">Cabang</th>
                <th className="text-left px-4 py-3">Total Harga</th>
                <th className="text-left px-4 py-3">Metode Pembayaran</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    Belum ada data transaksi untuk periode ini
                  </td>
                </tr>
              )}
              {paginatedData.map((trx, i) => (
                <tr key={trx.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                  <td className="px-4 py-3 text-gray-600">{trx.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-800">
                    {new Date(trx.created_at).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{trx.store?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium" suppressHydrationWarning>
                    Rp{trx.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-gray-800 capitalize">{trx.payment_method}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleLihatDetail(trx)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Menampilkan {paginatedData.length} dari {filtered.length} data
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-40"
            >‹</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-md text-sm font-medium ${
                  currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'
                }`}
              >{page}</button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-40"
            >›</button>
          </div>
        </div>
      </div>

      {/* modal detail transaksi */}
      {selectedTrx && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Detail Transaksi</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTrx.id}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tanggal</span>
                <span className="text-gray-800">
                  {new Date(selectedTrx.created_at).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cabang</span>
                <span className="text-gray-800">{selectedTrx.store?.name ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Metode Pembayaran</span>
                <span className="text-gray-800 capitalize">{selectedTrx.payment_method}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mb-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Rincian Barang</p>
              {loadingDetail && <p className="text-sm text-gray-400">Memuat...</p>}
              {!loadingDetail && trxItems.length === 0 && (
                <p className="text-sm text-gray-400">Tidak ada rincian item</p>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trxItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product?.name} <span className="text-gray-400">x{item.qty}</span>
                    </span>
                    <span className="text-gray-800 font-medium" suppressHydrationWarning>
                      Rp{item.subtotal.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-lg font-semibold text-gray-900" suppressHydrationWarning>
                Rp{selectedTrx.total.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}