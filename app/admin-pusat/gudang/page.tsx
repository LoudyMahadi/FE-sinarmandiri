'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { Plus, ArrowDownCircle, ArrowUpCircle, X } from 'lucide-react';

type InventoryRow = {
  id: string;
  product_id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string; sku: string; price: number } | null;
};

type Movement = {
  id: string;
  tipe: 'masuk' | 'keluar';
  qty: number;
  catatan: string | null;
  created_at: string;
  product: { name: string } | null;
};

export default function ManajemenGudangPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  // modal tambah barang baru
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newPrice, setNewPrice] = useState<number | ''>(0);
  const [newQty, setNewQty] = useState<number | ''>(0);
  const [newTipe, setNewTipe] = useState<'barang' | 'jasa'>('barang');
  // modal stok masuk/keluar
  const [movementTarget, setMovementTarget] = useState<InventoryRow | null>(null);
  const [movementTipe, setMovementTipe] = useState<'masuk' | 'keluar'>('masuk');
  const [movementQty, setMovementQty] = useState<number | ''>(1);
  const [movementNote, setMovementNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInventories = async (store_id: string) => {
    const { data } = await supabase
      .from('inventories')
      .select('id, product_id, quantity, min_threshold, product:products(name, sku, price)')
      .eq('store_id', store_id)
      .order('product_id');
    setInventories((data as any) ?? []);
  };

  const fetchMovements = async (store_id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements/store/${store_id}`);
    setMovements(await res.json());
  };

  useEffect(() => {
    const init = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (!store) return;
      setStoreId(store.id);
      fetchInventories(store.id);
      fetchMovements(store.id);
    };
    init();
  }, []);

  const filtered = inventories.filter((inv) =>
    inv.product?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddProduct = async () => {
    const parsedPrice = Number(newPrice);
    const parsedQty = Number(newQty);

    if (!newName || newPrice === '' || parsedPrice <= 0) {
      setMessage('Nama dan harga barang wajib diisi dengan benar');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, sku: newSku, price: parsedPrice, tipe: newTipe, store_id: storeId, initial_qty: Number.isFinite(parsedQty) ? parsedQty : 0 }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setMessage('Barang baru berhasil ditambahkan.');
      setShowAddModal(false);
      setNewName(''); setNewSku(''); setNewPrice(0); setNewQty(0); setNewTipe('barang');
      fetchInventories(storeId);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovementSubmit = async () => {
    const parsedMovementQty = Number(movementQty);

    if (!movementTarget || movementQty === '' || parsedMovementQty <= 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: movementTarget.product_id,
          store_id: storeId,
          tipe: movementTipe,
          qty: parsedMovementQty,
          catatan: movementNote,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setMessage(`Stok ${movementTipe} berhasil dicatat.`);
      setMovementTarget(null);
      setMovementQty(1);
      setMovementNote('');
      fetchInventories(storeId);
      fetchMovements(storeId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Manajemen Gudang" subtitle="Kelola data barang & stok gudang pusat" />

      <div className="p-6">
        {message && (
          <div className="bg-blue-50 text-blue-700 text-sm rounded-md px-4 py-2.5 mb-4">{message}</div>
        )}

        <div className="grid grid-cols-3 gap-6">
          {/* daftar barang */}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-3">
              <input
                type="text"
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 w-64"
              />
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
              >
                <Plus size={16} /> Tambah Barang
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
                  <tr>
                    <th className="text-left px-4 py-3">Nama Barang</th>
                    <th className="text-left px-4 py-3">SKU</th>
                    <th className="text-left px-4 py-3">Harga</th>
                    <th className="text-left px-4 py-3">Stok</th>
                    <th className="text-left px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-500">Belum ada barang</td></tr>
                  )}
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-800">{inv.product?.name}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.product?.sku ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-800">Rp{inv.product?.price?.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">
                        <span className={inv.quantity <= inv.min_threshold ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'}>
                          {inv.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setMovementTarget(inv); setMovementTipe('masuk'); }}
                            className="flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 text-green-600 hover:bg-green-50"
                          >
                            <ArrowDownCircle size={14} /> Masuk
                          </button>
                          <button
                            onClick={() => { setMovementTarget(inv); setMovementTipe('keluar'); }}
                            className="flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 text-red-500 hover:bg-red-50"
                          >
                            <ArrowUpCircle size={14} /> Keluar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* riwayat pergerakan stok */}
          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Riwayat Pergerakan Stok</h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {movements.length === 0 && <p className="text-sm text-gray-500 p-4">Belum ada pergerakan stok</p>}
              {movements.map((m) => (
                <div key={m.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-800">{m.product?.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${m.tipe === 'masuk' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {m.tipe === 'masuk' ? '+' : '-'}{m.qty}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(m.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {m.catatan && ` • ${m.catatan}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* modal tambah barang */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Tambah Barang Baru</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <label className="block text-sm text-gray-700 mb-1">Nama Barang</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />
            <label className="block text-sm text-gray-700 mb-1">Tipe</label>
            <select value={newTipe} onChange={(e) => setNewTipe(e.target.value as 'barang' | 'jasa')} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3">
            <option value="barang">Barang</option>
            <option value="jasa">Jasa</option>
            </select>
            <label className="block text-sm text-gray-700 mb-1">SKU (opsional)</label>
            <input value={newSku} onChange={(e) => setNewSku(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />

            <label className="block text-sm text-gray-700 mb-1">Harga</label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
            />

            <label className="block text-sm text-gray-700 mb-1">Stok Awal</label>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4"
            />

            <button onClick={handleAddProduct} disabled={submitting} className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-md disabled:bg-gray-400">
              {submitting ? 'Menyimpan...' : 'Simpan Barang'}
            </button>
          </div>
        </div>
      )}

      {/* modal stok masuk/keluar */}
      {movementTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setMovementTarget(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                Stok {movementTipe === 'masuk' ? 'Masuk' : 'Keluar'}: {movementTarget.product?.name}
              </h2>
              <button onClick={() => setMovementTarget(null)}><X size={20} className="text-gray-400" /></button>
            </div>

            <p className="text-xs text-gray-500 mb-3">Stok saat ini: {movementTarget.quantity}</p>

            <label className="block text-sm text-gray-700 mb-1">Jumlah</label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={movementQty}
              onChange={(e) => setMovementQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
            />

            <label className="block text-sm text-gray-700 mb-1">Catatan (opsional)</label>
            <input value={movementNote} onChange={(e) => setMovementNote(e.target.value)} placeholder="misal: pembelian dari supplier" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />

            <button
              onClick={handleMovementSubmit}
              disabled={submitting}
              className={`w-full text-white text-sm py-2.5 rounded-md disabled:bg-gray-400 ${movementTipe === 'masuk' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
            >
              {submitting ? 'Menyimpan...' : `Konfirmasi Stok ${movementTipe === 'masuk' ? 'Masuk' : 'Keluar'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}