'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle } from 'lucide-react';

type Ticket = {
  id: string;
  machine_name: string;
  urgency: string;
  status: string;
  created_at: string;
};

const URGENCY_LABEL: Record<string, string> = { low: 'Rendah', normal: 'Normal', urgent: 'Mendesak' };
const URGENCY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-600',
  urgent: 'bg-red-50 text-red-500',
};
const STATUS_LABEL: Record<string, string> = {
  dilaporkan: 'Dilaporkan', dicek: 'Dicek', diperbaiki: 'Diperbaiki', selesai: 'Selesai',
};

export default function LaporKerusakanPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [machineName, setMachineName] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);

  const fetchMyTickets = async (store_id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets?active_only=true`);
    const all = await res.json();
    setMyTickets(all.filter((t: any) => t.store?.name)); // tampilkan semua dulu, difilter tampilan client-side kalau perlu
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
      if (profile?.store_id) {
        setStoreId(profile.store_id);
        fetchMyTickets(profile.store_id);
      }
    };
    init();
  }, []);

  const handleSubmit = async () => {
    if (!machineName || !storeId) {
      setMessage('Nama mesin wajib diisi');
      return;
    }
    setSubmitting(true);
    setMessage('');
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          machine_name: machineName,
          description,
          urgency,
          reported_by: user?.id,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setMessage('Laporan kerusakan berhasil dikirim ke mekanik.');
      setMachineName('');
      setDescription('');
      setUrgency('normal');
      fetchMyTickets(storeId);
    } catch (err) {
      setMessage('Gagal terhubung ke server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Lapor Kerusakan Mesin" subtitle="Laporkan kendala teknis mesin ke mekanik" />

      <div className="p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Buat Laporan Baru</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <label className="block text-sm text-gray-700 mb-1.5">Nama/Jenis Mesin</label>
            <input
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              placeholder="misal: Mesin Fotokopi Canon IR-2006N"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 mb-4"
            />

            <label className="block text-sm text-gray-700 mb-1.5">Kronologi Kerusakan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Jelaskan kondisi kerusakan yang terjadi..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 mb-4"
            />

            <label className="block text-sm text-gray-700 mb-1.5">Tingkat Urgensi</label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 mb-4"
            >
              <option value="low">Rendah</option>
              <option value="normal">Normal</option>
              <option value="urgent">Mendesak</option>
            </select>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              <AlertTriangle size={16} />
              {submitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>

            {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Tiket Aktif Cabang Ini</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {myTickets.length === 0 && <p className="text-sm text-gray-500 p-5">Tidak ada tiket aktif</p>}
            {myTickets.map((t) => (
              <div key={t.id} className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800">{t.machine_name}</p>
                  <span className={`text-xs px-2 py-1 rounded ${URGENCY_COLOR[t.urgency]}`}>
                    {URGENCY_LABEL[t.urgency]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Status: {STATUS_LABEL[t.status]} •{' '}
                  {new Date(t.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}