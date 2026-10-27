'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Clock3,
  Info,
  Package,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';

type PendingRequest = {
  id: string;
  qty_requested: number;
  created_at: string;
  status?: string;
  catatan?: string | null;
  note?: string | null;
  product: { id: string; name: string } | null;
  from_store: { id: string; name: string } | null;
};

type InventoryRow = {
  product_id: string;
  quantity: number;
};

export default function PersetujuanStokPage() {
  const toast = useToast();
  const [pusatStoreId, setPusatStoreId] = useState('');
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchPending = useCallback(async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/pending`);
    if (!response.ok) throw new Error('Gagal memuat daftar pengajuan stok.');

    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error('Format data pengajuan stok tidak sesuai.');
    const pending = data as PendingRequest[];
    setRequests(pending);
    setSelectedId((current) =>
      current && pending.some((request) => request.id === current)
        ? current
        : pending[0]?.id ?? null
    );
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const supabase = createClient();
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('type', 'pusat')
          .single();
        if (storeError) throw storeError;
        if (!store) throw new Error('Data toko pusat tidak ditemukan.');

        const { data: stocks, error: inventoryError } = await supabase
          .from('inventories')
          .select('product_id, quantity')
          .eq('store_id', store.id);
        if (inventoryError) throw inventoryError;

        if (!active) return;
        setPusatStoreId(store.id);
        setInventory(stocks ?? []);
        await fetchPending();
      } catch (error) {
        if (active) {
          setPageError(error instanceof Error ? error.message : 'Halaman gagal dimuat.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, [fetchPending]);

  const selectedRequest = requests.find((request) => request.id === selectedId) ?? null;
  const availableStock = selectedRequest?.product
    ? inventory.find((item) => item.product_id === selectedRequest.product?.id)?.quantity ?? 0
    : 0;
  const hasEnoughStock = Boolean(selectedRequest && availableStock >= selectedRequest.qty_requested);

  const handleApprove = async () => {
    if (!selectedRequest || !pusatStoreId) return;
    if (!hasEnoughStock) {
      toast.error('Stok Tidak Mencukupi', 'Jumlah stok gudang pusat tidak cukup untuk memenuhi pengajuan ini.');
      return;
    }

    setProcessingId(selectedRequest.id);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/${selectedRequest.id}/approve`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved_by: user?.id, pusat_store_id: pusatStoreId }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        toast.error('Gagal Menyetujui', result.error ?? 'Silakan coba lagi.');
        return;
      }

      toast.success('Pengajuan Disetujui!', 'Stok berhasil dipindahkan dari gudang pusat ke cabang.');
      setPageError('');
      await fetchPending();
      setRejecting(false);
      setRejectReason('');
    } catch (error) {
      toast.error('Gagal Terhubung', error instanceof Error ? error.message : 'Tidak dapat menghubungi server.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessingId(selectedRequest.id);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/${selectedRequest.id}/reject`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approved_by: user?.id,
            reject_reason: rejectReason.trim() || 'Tidak ada alasan diberikan',
          }),
        }
      );

      if (!response.ok) {
        const result = await response.json();
        toast.error('Gagal Menolak', result.error ?? 'Silakan coba lagi.');
        return;
      }

      toast.info('Pengajuan Ditolak', 'Alasan penolakan telah diteruskan ke cabang.');
      setRejecting(false);
      setRejectReason('');
      await fetchPending();
    } catch (error) {
      toast.error('Gagal Terhubung', error instanceof Error ? error.message : 'Tidak dapat menghubungi server.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: string, withYear = false) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      ...(withYear ? { year: 'numeric' } : {}),
      hour: '2-digit',
      minute: '2-digit',
    });
  const storeLabel = (name?: string | null) => {
    if (!name) return 'Cabang';
    return name.toLowerCase().startsWith('toko ') ? name : `Toko ${name}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex min-h-[58px] items-center gap-4 border-b border-slate-200 bg-white px-5 sm:px-7">
        <ClipboardList size={18} className="text-slate-700" />
        <h1 className="text-base font-semibold text-slate-900">Persetujuan Pengajuan Logistik Cabang</h1>
      </header>

      <main className="grid flex-1 grid-cols-1 content-start md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-900">Pending Requests</h2>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {requests.length} Menunggu
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {requests.map((request) => {
              const isSelected = request.id === selectedId;
              return (
                <button
                  type="button"
                  key={request.id}
                  onClick={() => {
                    setSelectedId(request.id);
                    setRejecting(false);
                    setRejectReason('');
                  }}
                  className={`min-w-[245px] rounded-lg border p-3 text-left transition md:min-w-0 ${
                    isSelected
                      ? 'border-sky-400 bg-sky-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <ClipboardList size={17} className={isSelected ? 'mt-0.5 text-sky-500' : 'mt-0.5 text-slate-400'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-800">
                        {request.product?.name ?? 'Pengajuan stok'}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        {storeLabel(request.from_store?.name)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Clock3 size={12} />
                    <span>{formatDate(request.created_at, true)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                      MENUNGGU ACC
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-700">
                    <Package size={13} className="shrink-0 text-slate-400" />
                    <span>Jumlah diminta:</span>
                    <span className="shrink-0 font-medium">{request.qty_requested} unit</span>
                  </div>
                  {request.qty_requested > (inventory.find((item) => item.product_id === request.product?.id)?.quantity ?? 0) && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-red-600">
                      <AlertTriangle size={11} /> Stok gudang pusat tidak mencukupi
                    </p>
                  )}
                </button>
              );
            })}
            {!loading && requests.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">
                Tidak ada pengajuan yang menunggu persetujuan.
              </p>
            )}
            {loading && (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-400">
                Memuat antrean pengajuan...
              </p>
            )}
          </div>
        </aside>

        <section className="flex flex-col bg-white">
          {pageError && (
            <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          {selectedRequest ? (
            <>
              <div className="p-4 sm:p-5">
                <div className="mb-4 flex items-start gap-3">
                  <div className="rounded-lg bg-sky-50 p-2.5 text-sky-500">
                    <ClipboardList size={21} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Pengajuan stok dari {storeLabel(selectedRequest.from_store?.name)}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Catatan: “{selectedRequest.catatan ?? selectedRequest.note ?? 'Tidak ada catatan dari cabang.'}”
                    </p>
                  </div>
                </div>

                <h3 className="mb-2 text-xs font-semibold text-slate-800">Verifikasi Ketersediaan Stok Gudang Pusat</h3>
                <div className="grid overflow-hidden rounded-lg border border-slate-200 sm:grid-cols-2">
                  <div className="bg-sky-50/80 p-4">
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                      <ClipboardList size={12} /> Permintaan Cabang
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{selectedRequest.product?.name ?? '-'}</p>
                    <p className="text-[11px] text-slate-500">{storeLabel(selectedRequest.from_store?.name)}</p>
                    <p className="mt-2 text-[9px] uppercase tracking-wide text-slate-400">Jumlah diminta</p>
                    <p className="text-lg font-bold leading-tight text-sky-700">{selectedRequest.qty_requested} unit</p>
                  </div>
                  <div className={`p-4 ${hasEnoughStock ? 'bg-emerald-50/80' : 'bg-red-50/80'}`}>
                    <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${hasEnoughStock ? 'text-emerald-600' : 'text-red-600'}`}>
                      <Package size={12} /> Stok Gudang Pusat
                    </p>
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">Tersedia Sekarang</p>
                    <p className={`text-lg font-bold leading-tight ${hasEnoughStock ? 'text-emerald-700' : 'text-red-600'}`}>
                      {availableStock} unit {hasEnoughStock ? '(Tersedia)' : '(Tidak Mencukupi)'}
                    </p>
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-semibold text-white ${hasEnoughStock ? 'bg-emerald-600' : 'bg-red-500'}`}>
                      {hasEnoughStock ? <Check size={12} /> : <AlertTriangle size={12} />}
                      {hasEnoughStock ? 'SIAP DIKIRIM' : 'STOK KURANG'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-xs leading-relaxed text-sky-700">
                  <Info size={15} className="mt-0.5 shrink-0" />
                  <p>
                    Jika disetujui, stok gudang utama berkurang {selectedRequest.qty_requested} unit dan dikirim ke {storeLabel(selectedRequest.from_store?.name)}.
                  </p>
                </div>

                {rejecting && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <label htmlFor="reject-reason" className="mb-1.5 block text-xs font-medium text-red-800">
                      Alasan penolakan
                    </label>
                    <textarea
                      id="reject-reason"
                      value={rejectReason}
                      onChange={(event) => setRejectReason(event.target.value)}
                      placeholder="Tulis alasan penolakan untuk cabang..."
                      rows={2}
                      className="w-full resize-y rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejecting(false)}
                        className="rounded-md px-3 py-1.5 text-xs text-slate-600 hover:bg-white"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleReject}
                        disabled={processingId === selectedRequest.id}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {processingId === selectedRequest.id ? 'Memproses...' : 'Konfirmasi Tolak'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white p-3 sm:flex-row sm:justify-between sm:px-4">
                <button
                  type="button"
                  onClick={() => {
                    setRejecting((current) => !current);
                    setRejectReason('');
                  }}
                  disabled={Boolean(processingId)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-red-400 px-4 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 sm:min-w-[220px]"
                >
                  <X size={14} /> Tolak Permintaan
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={Boolean(processingId) || !hasEnoughStock}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-xs font-semibold text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[270px]"
                >
                  <Check size={14} />
                  {processingId === selectedRequest.id ? 'Memproses...' : 'Setujui Pengiriman (ACC Bon)'}
                </button>
              </footer>
            </>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400"><ClipboardList size={22} /></div>
              <h2 className="text-sm font-semibold text-slate-800">
                {loading ? 'Memuat pengajuan...' : 'Belum ada pengajuan untuk ditinjau'}
              </h2>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Pengajuan stok dari cabang akan muncul di antrean setelah dikirim.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
