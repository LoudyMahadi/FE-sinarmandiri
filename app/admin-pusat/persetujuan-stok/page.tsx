'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { Check, X } from 'lucide-react';

type PendingRequest = {
  id: string;
  qty_requested: number;
  created_at: string;
  product: { id: string; name: string } | null;
  from_store: { id: string; name: string } | null;
};

export default function PersetujuanStokPage() {
  const supabase = createClient();

  const [pusatStoreId, setPusatStoreId] = useState('');
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState('');

  const fetchPending = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/pending`);
    setRequests(await res.json());
  };

  useEffect(() => {
    const init = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (store) setPusatStoreId(store.id);
      fetchPending();
    };
    init();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user?.id, pusat_store_id: pusatStoreId }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
      } else {
        setMessage('Pengajuan disetujui, stok berhasil dipindahkan ke cabang.');
        fetchPending();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stock-requests/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: user?.id, reject_reason: rejectReason || 'Tidak ada alasan diberikan' }),
      });

      if (res.ok) {
        setMessage('Pengajuan ditolak.');
        setRejectingId(null);
        setRejectReason('');
        fetchPending();
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <Topbar title="Persetujuan Pengajuan Stok" subtitle="Kelola permintaan stok dari seluruh cabang" />

      <div className="p-6">
        {message && (
          <div className="bg-blue-50 text-blue-700 text-sm rounded-md px-4 py-2.5 mb-4">{message}</div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {requests.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">Tidak ada pengajuan yang menunggu persetujuan</p>
          )}
          {requests.map((req) => (
            <div key={req.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{req.product?.name}</p>
                  <p className="text-xs text-gray-500">
                    Diajukan oleh {req.from_store?.name} •{' '}
                    {new Date(req.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-800">{req.qty_requested} unit</span>
              </div>

              {rejectingId === req.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Alasan penolakan..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="bg-red-500 text-white text-sm px-4 py-2 rounded-md hover:bg-red-600"
                  >
                    Konfirmasi Tolak
                  </button>
                  <button
                    onClick={() => setRejectingId(null)}
                    className="text-sm text-gray-500 px-3 py-2"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                  >
                    <Check size={16} />
                    {processingId === req.id ? 'Memproses...' : 'Setujui'}
                  </button>
                  <button
                    onClick={() => setRejectingId(req.id)}
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-50"
                  >
                    <X size={16} />
                    Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}