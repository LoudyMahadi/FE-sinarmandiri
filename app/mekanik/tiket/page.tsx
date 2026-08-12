'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import Link from 'next/link';

type Ticket = {
  id: string;
  machine_name: string;
  description: string;
  urgency: string;
  status: string;
  created_at: string;
  store: { name: string } | null;
};

const URGENCY_LABEL: Record<string, string> = { low: 'Rendah', normal: 'Normal', urgent: 'Mendesak' };
const URGENCY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-600',
  urgent: 'bg-red-50 text-red-500',
};
const STATUS_LABEL: Record<string, string> = {
  dilaporkan: 'Dilaporkan', dicek: 'Dicek', diperbaiki: 'Diperbaiki',
};

export default function TiketMekanikPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [urgencyFilter, setUrgencyFilter] = useState('semua');

  const fetchTickets = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets?active_only=true&urgency=${urgencyFilter}`);
    setTickets(await res.json());
  };

  useEffect(() => {
    fetchTickets();
  }, [urgencyFilter]);

  return (
    <div>
      <Topbar title="Tiket Kerusakan Mesin" subtitle="Daftar tiket aktif dari seluruh lokasi toko" />

      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800"
          >
            <option value="semua">Semua Urgensi</option>
            <option value="urgent">Mendesak</option>
            <option value="normal">Normal</option>
            <option value="low">Rendah</option>
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {tickets.length === 0 && (
            <p className="text-sm text-gray-500 p-6 text-center">Tidak ada tiket aktif saat ini</p>
          )}
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/mekanik/tiket/${t.id}`}
              className="block p-5 hover:bg-gray-50 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">{t.machine_name}</p>
                <span className={`text-xs px-2 py-1 rounded ${URGENCY_COLOR[t.urgency]}`}>
                  {URGENCY_LABEL[t.urgency]}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{t.store?.name} • Status: {STATUS_LABEL[t.status]}</p>
              {t.description && <p className="text-sm text-gray-600 line-clamp-1">{t.description}</p>}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}