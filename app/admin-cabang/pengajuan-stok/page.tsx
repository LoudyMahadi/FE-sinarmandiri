'use client';
import { Suspense, useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { PackagePlus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type Product = { id: string; name: string };
type StockRequestRow = {
  id: string;
  qty_requested: number;
  status: string;
  reject_reason: string | null;
  created_at: string;
  product: { name: string } | null;
};

function PengajuanStokContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [requests, setRequests] = useState<StockRequestRow[]>([]);

  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState<number | ''>(1);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchRequests = async (store_id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/store/${store_id}`);
    setRequests(await res.json());
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (!profile?.store_id) return;
      setStoreId(profile.store_id);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
      setProducts(await res.json());

      fetchRequests(profile.store_id);

      const preselect = searchParams.get('product');
      if (preselect) setSelectedProduct(preselect);
    };

    init();
  }, [searchParams, supabase]);

  const handleSubmit = async () => {
    const parsedQty = Number(qty);

    if (!selectedProduct || qty === '' || parsedQty <= 0) {
      setMessage('Pilih produk dan masukkan jumlah yang valid');
      return;
    }
    setSubmitting(true);
    setMessage('');

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_store_id: storeId,
          product_id: selectedProduct,
          qty_requested: qty,
          requested_by: user?.id,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setMessage('Pengajuan berhasil dikirim ke pusat, menunggu persetujuan.');
      setSelectedProduct('');
      setQty(1);
      fetchRequests(storeId);
    } catch (err) {
      setMessage('Gagal terhubung ke server');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-orange-50 text-orange-600',
      approved: 'bg-green-50 text-green-600',
      rejected: 'bg-red-50 text-red-500',
    };
    const label: Record<string, string> = {
      pending: 'Menunggu Persetujuan',
      approved: 'Disetujui',
      rejected: 'Ditolak',
    };
    return <span className={`text-xs px-2 py-1 rounded ${map[status]}`}>{label[status]}</span>;
  };

  return (
    <div>
      <Topbar title="Pengajuan Permintaan Stok" subtitle="Ajukan tambahan stok barang ke toko pusat" />

      <div className="p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Buat Pengajuan Baru</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <label className="block text-sm text-gray-700 mb-1.5">Pilih Barang</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 mb-4"
            >
              <option value="">-- Pilih barang --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="block text-sm text-gray-700 mb-1.5">Jumlah Diminta</label>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Masukkan jumlah"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <PackagePlus size={16} />
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>

            {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Riwayat Pengajuan</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {requests.length === 0 && (
              <p className="text-sm text-gray-500 p-5">Belum ada pengajuan yang dibuat</p>
            )}
            {requests.map((req) => (
              <div key={req.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800">{req.product?.name}</p>
                  {statusBadge(req.status)}
                </div>
                <p className="text-xs text-gray-500">
                  {req.qty_requested} unit •{' '}
                  {new Date(req.created_at).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {req.status === 'rejected' && req.reject_reason && (
                  <p className="text-xs text-red-500 mt-1">Alasan: {req.reject_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PengajuanStokPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Memuat pengajuan stok...</div>}>
      <PengajuanStokContent />
    </Suspense>
  );
}