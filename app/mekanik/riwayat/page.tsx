'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets?active_only=false`);
      setTickets(await res.json());
    };
    fetchData();
  }, []);

  const filtered = tickets.filter((t) => t.machine_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Topbar title="Riwayat Perbaikan" subtitle="Tiket kerusakan yang sudah selesai ditangani" />
      <div className="p-6">
        <input
          type="text"
          placeholder="Cari nama mesin..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800 w-64 mb-4"
        />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs font-medium">
              <tr>
                <th className="text-left px-4 py-3">Mesin</th>
                <th className="text-left px-4 py-3">Lokasi</th>
                <th className="text-left px-4 py-3">Selesai Pada</th>
                <th className="text-left px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-gray-500">Belum ada riwayat perbaikan</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-800">{t.machine_name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.store?.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(t.updated_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/mekanik/tiket/${t.id}`}
                      className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-600 hover:text-white hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      Lihat Detail
                    </Link>
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