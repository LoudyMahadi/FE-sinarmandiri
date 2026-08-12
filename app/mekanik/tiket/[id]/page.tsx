'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

const STATUS_FLOW = [
  { key: 'dilaporkan', label: 'Dilaporkan' },
  { key: 'dicek', label: 'Dicek' },
  { key: 'diperbaiki', label: 'Diperbaiki' },
  { key: 'selesai', label: 'Selesai' },
];

type TicketDetail = {
  id: string;
  machine_name: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  store: { name: string } | null;
};

type Log = { id: string; status: string; note: string | null; created_at: string };

export default function TiketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDetail = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${params.id}`);
    const result = await res.json();
    setTicket(result.ticket);
    setLogs(result.logs);
  };

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  const currentIndex = ticket ? STATUS_FLOW.findIndex((s) => s.key === ticket.status) : -1;
  const nextStatus = currentIndex >= 0 && currentIndex < 3 ? STATUS_FLOW[currentIndex + 1] : null;

  const handleUpdateStatus = async () => {
    if (!nextStatus || !ticket) return;
    setSubmitting(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus.key, note, mechanic_id: user?.id }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setNote('');
      fetchDetail();
      if (nextStatus.key === 'selesai') {
        setTimeout(() => router.push('/mekanik/tiket'), 1000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!ticket) {
    return (
      <div>
        <Topbar title="Detail Tiket" subtitle="Memuat data..." />
      </div>
    );
  }

  return (
    <div>
      <Topbar title={ticket.machine_name} subtitle={`Lokasi: ${ticket.store?.name}`} />

      <div className="p-6 grid grid-cols-3 gap-6">
        {/* linimasa status */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-4">
            <p className="text-sm text-gray-700 mb-4">{ticket.description || 'Tidak ada deskripsi tambahan'}</p>

            <div className="space-y-4">
              {STATUS_FLOW.map((step, idx) => {
                const isDone = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isDone ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isDone ? <Check size={14} /> : idx + 1}
                    </div>
                    <span className={`text-sm ${isCurrent ? 'font-semibold text-gray-900' : isDone ? 'text-gray-700' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {nextStatus && (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Perbarui ke tahap: <span className="text-blue-600">{nextStatus.label}</span>
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Catatan tindakan (opsional)..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
              />
              <button
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? 'Memproses...' : `Tandai ${nextStatus.label}`}
              </button>
              {message && <p className="text-sm text-red-500 mt-2">{message}</p>}
            </div>
          )}

          {ticket.status === 'selesai' && (
            <div className="bg-green-50 text-green-700 text-sm rounded-md px-4 py-3">
              Tiket ini sudah selesai ditangani.
            </div>
          )}
        </div>

        {/* riwayat log */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Riwayat Tindakan</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-3">
                <p className="text-sm text-gray-800 capitalize">{log.status}</p>
                {log.note && <p className="text-xs text-gray-500 mt-0.5">{log.note}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}