'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import * as XLSX from 'xlsx';

type InventoryRow = {
  id: string;
  quantity: number;
  min_threshold: number;
  product: { name: string; sku: string; price: number };
  store: { name: string };
};

export default function InventoriPage() {
  const [data, setData] = useState<InventoryRow[]>([]);
  const [search, setSearch] = useState('');
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: rows } = await supabase
        .from('inventories')
        .select('id, quantity, min_threshold, product:products(name, sku, price), store:stores(name)');
      setData((rows as any) ?? []);
    };
    fetchData();
  }, []);

  const filtered = data.filter((row) =>
    row.product?.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalItem = data.length;
  const totalStok = data.reduce((sum, row) => sum + row.quantity, 0);
  const stokMenipis = data.filter((row) => row.quantity <= row.min_threshold).length;
  const lokasiToko = new Set(data.map((row) => row.store?.name)).size;

  const handleExportExcel = () => {
    const exportData = filtered.map((row, i) => ({
      No: i + 1,
      'Nama Barang': row.product?.name,
      SKU: row.product?.sku ?? '-',
      Lokasi: row.store?.name,
      Harga: row.product?.price,
      Stok: row.quantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 10 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Inventori');
    XLSX.writeFile(workbook, `Laporan-Inventori-${new Date().toLocaleDateString('id-ID')}.xlsx`);
  };

  return (
    <div>
      <Topbar title="Laporan Inventori" subtitle="Monitoring stok seluruh lokasi toko" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            placeholder="Cari barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 w-64"
          />
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-500 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <span>Export Excel</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Jenis Barang</p>
            <p className="text-2xl font-semibold text-gray-900">{totalItem}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Stok</p>
            <p className="text-2xl font-semibold text-gray-900">{totalStok}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Stok Menipis</p>
            <p className="text-2xl font-semibold text-red-500">{stokMenipis}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Lokasi Toko</p>
            <p className="text-2xl font-semibold text-gray-900">{lokasiToko}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">No</th>
                <th className="text-left px-4 py-3">Nama Barang</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Lokasi</th>
                <th className="text-left px-4 py-3">Harga</th>
                <th className="text-left px-4 py-3">Stok</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-500">
                    Tidak ada data barang
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-800">{row.product?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{row.product?.sku}</td>
                  <td className="px-4 py-3 text-gray-800">{row.store?.name}</td>
                  <td className="px-4 py-3 text-gray-800">Rp{row.product?.price?.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">
                    <span className={row.quantity <= row.min_threshold ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'}>
                      {row.quantity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}