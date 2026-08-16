'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { X } from 'lucide-react';

type Transaction = {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
};

type TransactionItem = {
  id: string;
  qty: number;
  subtotal: number;
  product: { name: string } | null;
};

const ITEMS_PER_PAGE = 10;

export default function RiwayatTransaksiPusatPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [trxItems, setTrxItems] = useState<TransactionItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (!store) return;
      setStoreId(store.id);

      const { data } = await supabase
        .from('transactions')
        .select('id, total, payment_method, created_at')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      setTransactions(data ?? []);
    };
    init();
  }, []);

  const filtered = transactions.filter((trx) => trx.id.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalOmzetHariIni = transactions
    .filter((trx) => new Date(trx.created_at).toDateString() === new Date().toDateString())
    .reduce((sum, trx) => sum + trx.total, 0);
  const jumlahTransaksiHariIni = transactions.filter(
    (trx) => new Date(trx.created_at).toDateString() === new Date().toDateString()
  ).length;

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

  return (
    <div>
      <Topbar title="Riwayat Transaksi" subtitle="Transaksi yang telah selesai di toko pusat" />

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Transaksi Hari Ini</p>
            <p className="text-2xl font-semibold text-gray-900">{jumlahTransaksiHariIni}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Omzet Hari Ini</p>
            <p className="text-2xl font-semibold text-gray-900" suppressHydrationWarning>
              Rp{totalOmzetHariIni.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Cari ID transaksi..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 w-64 mb-4"
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">No</th>
                <th className="text-left px-4 py-3">ID Transaksi</th>
                <th className="text-left px-4 py-3">Tanggal</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Metode Pembayaran</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">Belum ada transaksi</td></tr>
              )}
              {paginatedData.map((trx, i) => (
                <tr key={trx.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</td>
                  <td className="px-4 py-3 text-gray-600">{trx.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-gray-800">
                    {new Date(trx.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium" suppressHydrationWarning>
                    Rp{trx.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-gray-800 capitalize">{trx.payment_method}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleLihatDetail(trx)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-700 font-medium hover:bg-gray-50"
                    >
                      Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">Menampilkan {paginatedData.length} dari {filtered.length} data</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-40">‹</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
              <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-md text-sm font-medium ${currentPage === page ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700'}`}>{page}</button>
            ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="w-8 h-8 border border-gray-300 rounded-md text-sm text-gray-700 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {selectedTrx && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Detail Transaksi</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedTrx.id}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tanggal</span>
                <span className="text-gray-800">
                  {new Date(selectedTrx.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Metode Pembayaran</span>
                <span className="text-gray-800 capitalize">{selectedTrx.payment_method}</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 mb-3">
              <p className="text-xs font-medium text-gray-500 mb-2">Rincian Barang</p>
              {loadingDetail && <p className="text-sm text-gray-400">Memuat...</p>}
              {!loadingDetail && trxItems.length === 0 && <p className="text-sm text-gray-400">Tidak ada rincian item</p>}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {trxItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.product?.name} <span className="text-gray-400">x{item.qty}</span></span>
                    <span className="text-gray-800 font-medium" suppressHydrationWarning>Rp{item.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-lg font-semibold text-gray-900" suppressHydrationWarning>Rp{selectedTrx.total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}