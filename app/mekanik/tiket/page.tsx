'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, CheckCircle2, MapPin, Search, Wrench } from 'lucide-react';

type Ticket = {
  id: string;
  machine_name: string;
  description: string | null;
  urgency: string;
  status: string;
  sparepart_needed: string | null;
  sparepart_fulfilled: boolean | null;
  created_at: string;
  updated_at: string;
  store_id: string;
  store: { name: string } | null;
};

type Store = { id: string; name: string };

const ITEMS_PER_PAGE = 8;

const URGENCY_RANK: Record<string, number> = { urgent: 0, normal: 1, low: 2 };

const URGENCY_BADGE: Record<string, { label: string; cls: string }> = {
  urgent: { label: 'URGENT', cls: 'bg-red-100 text-red-500' },
  normal: { label: 'SEDANG', cls: 'bg-amber-100 text-amber-700' },
  low: { label: 'RENDAH', cls: 'bg-gray-100 text-gray-600' },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  dilaporkan: { label: 'DILAPORKAN', cls: 'bg-red-50 text-red-500' },
  dicek: { label: 'DICEK', cls: 'bg-amber-100 text-amber-700' },
  diperbaiki: { label: 'DIPERBAIKI', cls: 'bg-blue-50 text-blue-600' },
  selesai: { label: 'SELESAI', cls: 'bg-green-100 text-green-700' },
};

const actionFor = (status: string) => {
  switch (status) {
    case 'dilaporkan':
      return { label: 'Mulai Cek Mesin', cls: 'bg-sky-500 text-white hover:bg-sky-600' };
    case 'dicek':
      return { label: 'Lanjut Perbaikan', cls: 'bg-sky-50 text-sky-700 hover:bg-sky-100' };
    case 'diperbaiki':
      return { label: 'Selesaikan Tiket', cls: 'bg-sky-50 text-sky-700 hover:bg-sky-100' };
    default:
      return { label: 'Lihat Rekap', cls: 'bg-gray-100 text-gray-700 hover:bg-gray-200' };
  }
};

export default function TiketMekanikPage() {
  const supabase = createClient();

  const [mechanicName, setMechanicName] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('semua');
  const [urgencyFilter, setUrgencyFilter] = useState('semua');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        if (profile?.full_name) setMechanicName(profile.full_name);
      }

      const { data: storeData } = await supabase.from('stores').select('id, name').order('name');
      setStores(storeData ?? []);

      const { data } = await supabase
        .from('machine_tickets')
        .select('id, machine_name, description, urgency, status, sparepart_needed, sparepart_fulfilled, created_at, updated_at, store_id, store:stores(name)');
      setTickets((data as any) ?? []);
    };
    fetchAll();
  }, []);

  const stats = useMemo(() => {
    const active = tickets.filter((t) => t.status !== 'selesai');
    const urgent = active
      .filter((t) => t.urgency === 'urgent')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const now = new Date();
    const doneThisMonth = tickets.filter((t) => {
      if (t.status !== 'selesai') return false;
      const d = new Date(t.updated_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    return {
      active: active.length,
      urgent: urgent.length,
      urgentStore: urgent[0]?.store?.name ?? null,
      done: doneThisMonth.length,
    };
  }, [tickets]);

  const sorted = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = tickets.filter((t) => {
      const matchSearch =
        t.machine_name.toLowerCase().includes(q) || (t.store?.name ?? '').toLowerCase().includes(q);
      const matchStore = storeFilter === 'semua' || t.store_id === storeFilter;
      const matchUrgency = urgencyFilter === 'semua' || t.urgency === urgencyFilter;
      return matchSearch && matchStore && matchUrgency;
    });

    return [...filtered].sort((a, b) => {
      const aDone = a.status === 'selesai' ? 1 : 0;
      const bDone = b.status === 'selesai' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone; // tiket aktif di atas, selesai di bawah

      if (aDone === 0) {
        const u = (URGENCY_RANK[a.urgency] ?? 9) - (URGENCY_RANK[b.urgency] ?? 9);
        if (u !== 0) return u; // urgent dulu
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // antrean terlama dulu
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(); // selesai: terbaru dulu
    });
  }, [tickets, search, storeFilter, urgencyFilter]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-6">
      {/* sapaan */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Selamat bertugas{mechanicName ? `, Mas ${mechanicName}` : ''}!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Pantau antrean aduan kerusakan perangkat produksi dan tentukan skala prioritas penanganan hari ini.
        </p>
      </div>

      {/* 3 kartu ringkasan */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0">
            <Wrench size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-600">Antrean Tugas Aktif</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{stats.active} Tiket</p>
            <p className="text-xs text-gray-500 mt-0.5">Perlu penanganan teknisi</p>
          </div>
        </div>

        <div className="bg-red-50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-600">Kerusakan Kritis / Urgent</p>
            <p className="text-2xl font-bold text-red-500 leading-tight">{stats.urgent} Mesin Macet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.urgentStore ? `${stats.urgentStore} (Prioritas 1)` : 'Tidak ada kerusakan kritis'}
            </p>
          </div>
        </div>

        <div className="bg-green-50 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-gray-600">Sukses Diperbaiki Bulan Ini</p>
            <p className="text-2xl font-bold text-green-600 leading-tight">{stats.done} Unit Mesin</p>
            <p className="text-xs text-gray-500 mt-0.5">Tiket selesai bulan ini</p>
          </div>
        </div>
      </div>

      {/* tabel antrean */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-5">
          <h2 className="text-sm font-bold text-gray-900">Antrean Tiket Perbaikan Mesin Masuk</h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari unit mesin atau lokasi..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-64 h-10 border border-gray-200 rounded-lg pl-9 pr-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </div>

            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={storeFilter}
                onChange={(e) => { setStoreFilter(e.target.value); setCurrentPage(1); }}
                className="h-10 border border-gray-200 rounded-lg pl-9 pr-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <option value="semua">Semua Lokasi</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <select
              value={urgencyFilter}
              onChange={(e) => { setUrgencyFilter(e.target.value); setCurrentPage(1); }}
              className="h-10 border border-gray-200 rounded-lg px-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              <option value="semua">Semua Urgensi</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Sedang</option>
              <option value="low">Rendah</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="text-left pl-6 pr-3 py-3">Unit Mesin</th>
                <th className="text-left px-3 py-3">Lokasi Toko</th>
                <th className="text-left px-3 py-3">Urgensi</th>
                <th className="text-left px-3 py-3">Deskripsi Kendala Fisik</th>
                <th className="text-left px-3 py-3">Status Alur</th>
                <th className="text-left pl-3 pr-6 py-3">Aksi Kerja</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    Tidak ada tiket yang cocok
                  </td>
                </tr>
              )}
              {paginated.map((t) => {
                const isUrgentActive = t.urgency === 'urgent' && t.status !== 'selesai';
                const urgency = URGENCY_BADGE[t.urgency] ?? URGENCY_BADGE.normal;
                const status = STATUS_BADGE[t.status] ?? STATUS_BADGE.dilaporkan;
                const action = actionFor(t.status);

                return (
                  <tr
                    key={t.id}
                    className={`border-t border-gray-100 transition-colors ${
                      isUrgentActive ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td
                      className={`pl-6 pr-3 py-4 font-semibold text-gray-900 whitespace-nowrap ${
                        isUrgentActive ? 'shadow-[inset_4px_0_0_0_#ef4444]' : ''
                      }`}
                    >
                      {t.machine_name}
                    </td>
                    <td className="px-3 py-4 text-gray-600 whitespace-nowrap">{t.store?.name ?? '-'}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full ${urgency.cls}`}>
                        {urgency.label}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-gray-700 max-w-[260px]">
                      <p className="line-clamp-2">{t.description || '-'}</p>
                      {t.sparepart_needed && !t.sparepart_fulfilled && t.status !== 'selesai' && (
                        <p className="text-[11px] text-orange-600 mt-1">
                          ⚠ Menunggu sparepart: {t.sparepart_needed}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-4">
                      <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="pl-3 pr-6 py-4">
                      <Link
                        href={`/mekanik/tiket/${t.id}`}
                        className={`inline-block min-w-[140px] text-center text-xs font-semibold px-4 py-2.5 rounded-lg transition ${action.cls}`}
                      >
                        {action.label}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Menampilkan {paginated.length} dari {sorted.length} tiket
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-md text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >‹</button>
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-md text-sm font-medium ${
                  currentPage === page ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >{page}</button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages || 1, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="w-8 h-8 rounded-md text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
            >›</button>
          </div>
        </div>
      </div>
    </div>
  );
}