'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';

type Ticket = {
  id: string;
  machine_name: string;
  urgency: string;
  status: string;
  sparepart_needed: string | null;
  sparepart_fulfilled: boolean;
  created_at: string;
  updated_at: string;
  store: { name: string } | null;
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
const STATUS_COLOR: Record<string, string> = {
  dilaporkan: 'bg-gray-100 text-gray-600',
  dicek: 'bg-yellow-50 text-yellow-600',
  diperbaiki: 'bg-blue-50 text-blue-600',
  selesai: 'bg-green-50 text-green-600',
};

export default function LaporanPerbaikanMesinPage() {
  const supabase = createClient();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from('machine_tickets')
        .select('id, machine_name, urgency, status, sparepart_needed, sparepart_fulfilled, created_at, updated_at, store:stores(name)')
        .order('created_at', { ascending: false });
      setTickets((data as any) ?? []);
    };
    fetchAll();
  }, []);
      const handleMarkFulfilled = async (ticketId: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticketId}/sparepart/fulfilled`, {
      method: 'PATCH',
    });
    const res = await supabase
      .from('machine_tickets')
      .select('id, machine_name, urgency, status, sparepart_needed, sparepart_fulfilled, created_at, updated_at, store:stores(name)')
      .order('created_at', { ascending: false });
    setTickets((res.data as any) ?? []);
  };

  const filtered = tickets.filter((t) => {
    const matchStatus = statusFilter === 'semua' || t.status === statusFilter;
    const matchSearch = t.machine_name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
  const needsSparepartCount = tickets.filter((t) => t.sparepart_needed && !t.sparepart_fulfilled).length;
  const activeCount = tickets.filter((t) => t.status !== 'selesai').length;
  const urgentCount = tickets.filter((t) => t.urgency === 'urgent' && t.status !== 'selesai').length;
  const doneCount = tickets.filter((t) => t.status === 'selesai').length;

  return (
    <div>
      <Topbar title="Laporan Perbaikan Mesin" subtitle="Monitoring tiket kerusakan lintas lokasi toko" />

      <div className="p-6">
       <div className="grid grid-cols-4 gap-4 mb-6">
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <p className="text-xs text-gray-500 mb-1">Tiket Aktif</p>
    <p className="text-2xl font-semibold text-gray-900">{activeCount}</p>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <p className="text-xs text-gray-500 mb-1">Mendesak (Belum Selesai)</p>
    <p className="text-2xl font-semibold text-red-500">{urgentCount}</p>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <p className="text-xs text-gray-500 mb-1">Butuh Sparepart</p>
    <p className="text-2xl font-semibold text-orange-500">{needsSparepartCount}</p>
  </div>
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <p className="text-xs text-gray-500 mb-1">Sudah Selesai</p>
    <p className="text-2xl font-semibold text-green-600">{doneCount}</p>
  </div>
</div>
      
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari nama mesin..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="semua">Semua Status</option>
            <option value="dilaporkan">Dilaporkan</option>
            <option value="dicek">Dicek</option>
            <option value="diperbaiki">Diperbaiki</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">Mesin</th>
                <th className="text-left px-4 py-3">Lokasi</th>
                <th className="text-left px-4 py-3">Urgensi</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Dilaporkan</th>
                <th className="text-left px-4 py-3">Update Terakhir</th>
                <th className="text-left px-4 py-3">Sparepart</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">Tidak ada data tiket</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{t.machine_name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.store?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${URGENCY_COLOR[t.urgency]}`}>
                      {URGENCY_LABEL[t.urgency]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(t.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(t.updated_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
  {t.sparepart_needed ? (
    t.sparepart_fulfilled ? (
      <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">Tersedia</span>
    ) : (
      <div className="flex items-center gap-2">
        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded" title={t.sparepart_needed}>
          Perlu Beli
        </span>
        <button
          onClick={() => handleMarkFulfilled(t.id)}
          className="text-xs text-blue-600 hover:underline"
        >
          Tandai Beli
        </button>
      </div>
    )
  ) : (
    <span className="text-xs text-gray-400">-</span>
  )}
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