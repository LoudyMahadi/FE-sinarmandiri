'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';

type Ticket = {
  id: string;
  machine_name: string;
  urgency: string;
  updated_at: string;
  store: { name: string } | null;
};

export default function RiwayatPerbaikanPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets?active_only=false`);
      setTickets(await res.json());
    };
    fetchData();
  }, []);

  return (
    <div>
      <Topbar title="Riwayat Perbaikan" subtitle="Tiket kerusakan yang sudah selesai ditangani" />
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">Mesin</th>
                <th className="text-left px-4 py-3">Lokasi</th>
                <th className="text-left px-4 py-3">Selesai Pada</th>
              </tr>
            </thead>
            <tbody>
              {tickets.length === 0 && (
                <tr><td colSpan={3} className="text-center py-6 text-gray-500">Belum ada riwayat perbaikan</td></tr>
              )}
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-800">{t.machine_name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.store?.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(t.updated_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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