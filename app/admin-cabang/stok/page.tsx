'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, PackagePlus } from 'lucide-react';

type InventoryRow = {
  id: string;
  product_id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string; sku: string; price: number } | null;
};

export default function StokCabangPage() {
  const supabase = createClient();

  const [storeName, setStoreName] = useState('');
  const [inventories, setInventories] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  useEffect(() => {
    const init = async () => {
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

      const { data } = await supabase
        .from('inventories')
        .select('id, product_id, quantity, min_threshold, product:products(name, sku, price)')
        .eq('store_id', storeId)
        .order('product_id');

      setInventories((data as any) ?? []);
    };
    init();
  }, []);

  const filtered = inventories.filter((inv) => {
    const matchSearch = inv.product?.name.toLowerCase().includes(search.toLowerCase());
    const matchLowStock = !onlyLowStock || inv.quantity <= inv.min_threshold;
    return matchSearch && matchLowStock;
  });

  const lowStockCount = inventories.filter((inv) => inv.quantity <= inv.min_threshold).length;

  return (
    <div>
      <Topbar title="Cek Stok Cabang" subtitle={`Ketersediaan barang di ${storeName}`} />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Jenis Barang</p>
            <p className="text-2xl font-semibold text-gray-900">{inventories.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Stok</p>
            <p className="text-2xl font-semibold text-gray-900">
              {inventories.reduce((sum, i) => sum + i.quantity, 0)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Stok Menipis</p>
            <p className="text-2xl font-semibold text-red-500">{lowStockCount}</p>
          </div>
        </div>

        {lowStockCount > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4 flex items-center gap-2.5">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-700">
              Ada <span className="font-medium">{lowStockCount} barang</span> yang stoknya menipis. Segera ajukan permintaan stok ke pusat.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 w-64"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="rounded border-gray-300"
            />
            Tampilkan stok menipis saja
          </label>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">Nama Barang</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Harga</th>
                <th className="text-left px-4 py-3">Stok</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">Tidak ada data barang</td></tr>
              )}
              {filtered.map((inv) => {
                const isLow = inv.quantity <= inv.min_threshold;
                return (
                  <tr key={inv.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{inv.product?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.product?.sku ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-800">Rp{inv.product?.price?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span className={isLow ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'}>
                        {inv.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isLow ? (
                        <span className="text-xs bg-red-50 text-red-500 px-2 py-1 rounded">Stok Menipis</span>
                      ) : (
                        <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">Aman</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isLow && (
                        <Link
                          href={`/admin-cabang/pengajuan-stok?product=${inv.product_id}`}
                          className="flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 text-blue-600 hover:bg-blue-50 w-fit"
                        >
                          <PackagePlus size={14} /> Ajukan
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}