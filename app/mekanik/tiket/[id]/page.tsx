'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  ClipboardList,
  MapPin,
  Package,
  Printer,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ToastProvider';

const STATUS_FLOW = [
  { key: 'dilaporkan', label: 'Dilaporkan', description: 'Laporan diterima oleh sistem' },
  { key: 'dicek', label: 'Pemeriksaan & Diagnosa', description: 'Pengecekan fisik komponen oleh mekanik' },
  { key: 'diperbaiki', label: 'Eksekusi Tindakan Perbaikan', description: 'Penggantian suku cadang dan perbaikan mekanis' },
  { key: 'selesai', label: 'Pengujian & Verifikasi Fungsi', description: 'Verifikasi kelayakan fungsi mesin' },
];

type TicketDetail = {
  id: string;
  machine_name: string;
  description: string;
  urgency: string;
  status: string;
  sparepart_needed: string | null;
  sparepart_fulfilled: boolean;
  created_at: string;
  store: { name: string } | null;
};

type Log = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

type TicketResponse = {
  ticket?: TicketDetail;
  logs?: Log[];
  error?: string;
};

const ticketStatusLabel: Record<string, string> = {
  dilaporkan: 'Menunggu pemeriksaan',
  dicek: 'Pemeriksaan mekanik',
  diperbaiki: 'Eksekusi perbaikan mekanik',
  selesai: 'Selesai',
};

export default function TiketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const router = useRouter();
  const toast = useToast();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sparepartInput, setSparepartInput] = useState('');
  const [submittingSparepart, setSubmittingSparepart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const fetchDetail = useCallback(async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticketId}`);
    const result = await response.json() as TicketResponse;
    if (!response.ok) throw new Error(result.error ?? 'Gagal memuat detail tiket.');
    if (!result.ticket || !Array.isArray(result.logs)) {
      throw new Error('Data detail tiket tidak lengkap.');
    }

    setTicket(result.ticket);
    setLogs(result.logs);
  }, [ticketId]);

  useEffect(() => {
    let active = true;

    const loadTicket = async () => {
      try {
        await fetchDetail();
      } catch (error) {
        if (active) {
          setPageError(error instanceof Error ? error.message : 'Gagal memuat detail tiket.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTicket();
    return () => {
      active = false;
    };
  }, [fetchDetail]);

  const currentIndex = ticket ? STATUS_FLOW.findIndex((step) => step.key === ticket.status) : -1;
  const nextStatus = currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIndex + 1]
    : null;

  const formatDate = (date: string) =>
    new Date(date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleUpdateStatus = async () => {
    if (!nextStatus || !ticket) return;
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus.key, note, mechanic_id: user?.id }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        toast.error('Gagal Memperbarui Status', result.error ?? 'Silakan coba lagi.');
        return;
      }

      toast.success('Status Tiket Diperbarui!', `${ticket.machine_name} kini berstatus ${nextStatus.label}.`);
      setNote('');
      await fetchDetail();
      if (nextStatus.key === 'selesai') {
        setTimeout(() => router.push('/mekanik/tiket'), 1000);
      }
    } catch (error) {
      toast.error('Gagal Memperbarui Status', error instanceof Error ? error.message : 'Tidak dapat menghubungi server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSparepart = async () => {
    if (!ticket || !sparepartInput.trim()) return;
    setSubmittingSparepart(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tickets/${ticket.id}/sparepart`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sparepart_needed: sparepartInput.trim() }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        toast.error('Gagal Mencatat Sparepart', result.error ?? 'Silakan coba lagi.');
        return;
      }

      toast.success('Kebutuhan Sparepart Dicatat!', 'Owner dapat melihatnya di Laporan Perbaikan Mesin.');
      setSparepartInput('');
      await fetchDetail();
    } catch (error) {
      toast.error('Gagal Mencatat Sparepart', error instanceof Error ? error.message : 'Tidak dapat menghubungi server.');
    } finally {
      setSubmittingSparepart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <h1 className="text-sm font-semibold text-slate-900">Detail Tiket Perbaikan Mesin</h1>
        </header>
        <p className="p-6 text-sm text-slate-500">Memuat detail tiket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-5 py-4">
          <h1 className="text-sm font-semibold text-slate-900">Detail Tiket Perbaikan Mesin</h1>
        </header>
        <div role="alert" className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError || 'Detail tiket tidak tersedia.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <ClipboardList size={18} className="text-slate-600" />
        <h1 className="text-sm font-semibold text-slate-900">Detail Tiket Perbaikan Mesin</h1>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
          ticket.status === 'selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          STATUS TIKET: {ticketStatusLabel[ticket.status]?.toUpperCase() ?? ticket.status.toUpperCase()}
        </span>
      </header>

      {pageError && (
        <div role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-5">
          {pageError}
        </div>
      )}

      <main className="grid grid-cols-1 items-start gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="mb-4 text-xs font-semibold text-slate-900">Identitas Aset Mesin &amp; Lokasi</h2>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="rounded-lg bg-sky-50 p-2.5 text-sky-500">
                <Printer size={21} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{ticket.machine_name}</h3>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 pt-4 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-[10px] text-slate-500"><MapPin size={12} /> Penempatan</dt>
                <dd className="mt-1 text-xs font-medium text-slate-800">{ticket.store?.name ?? 'Lokasi tidak tersedia'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[10px] text-slate-500"><Wrench size={12} /> Tingkat Urgensi</dt>
                <dd className={`mt-1 text-xs font-semibold ${
                  ticket.urgency === 'urgent' ? 'text-red-600' : 'text-slate-800'
                }`}>
                  {ticket.urgency === 'urgent' ? 'Mendesak' : ticket.urgency === 'low' ? 'Rendah' : 'Normal'}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[10px] text-slate-500"><Clock3 size={12} /> Waktu Lapor</dt>
                <dd className="mt-1 text-xs font-medium text-slate-800">{formatDate(ticket.created_at)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[10px] text-slate-500"><ClipboardList size={12} /> Status Saat Ini</dt>
                <dd className="mt-1 text-xs font-medium text-slate-800">
                  {ticketStatusLabel[ticket.status] ?? ticket.status}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-xs font-semibold text-slate-900">
              Kronologi Keluhan Kerusakan <span className="font-normal text-slate-400">(Read-Only)</span>
            </h2>
            <p className="mb-2 mt-4 text-[11px] text-slate-500">Deskripsi kerusakan fisik terlapor:</p>
            <blockquote className="rounded-lg border-l-[3px] border-sky-400 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
              {ticket.description || 'Tidak ada deskripsi tambahan untuk kerusakan ini.'}
            </blockquote>

            {ticket.sparepart_needed && (
              <div className={`mt-4 rounded-lg border p-3 ${
                ticket.sparepart_fulfilled
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-amber-200 bg-amber-50'
              }`}>
                <p className="flex items-center gap-2 text-[11px] font-semibold text-slate-800">
                  <Package size={14} /> Kebutuhan Sparepart
                </p>
                <p className="mt-1 text-xs text-slate-700">{ticket.sparepart_needed}</p>
                <p className={`mt-1 text-[10px] ${
                  ticket.sparepart_fulfilled ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {ticket.sparepart_fulfilled ? 'Sparepart sudah tersedia' : 'Menunggu pengadaan dari pusat'}
                </p>
              </div>
            )}

            {ticket.status !== 'selesai' && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <label htmlFor="sparepart" className="mb-1.5 block text-[11px] font-medium text-slate-700">
                  Catat kebutuhan sparepart (opsional)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="sparepart"
                    value={sparepartInput}
                    onChange={(event) => setSparepartInput(event.target.value)}
                    placeholder="Contoh: cartridge printer"
                    className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitSparepart}
                    disabled={submittingSparepart || !sparepartInput.trim()}
                    className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingSparepart ? 'Menyimpan...' : ticket.sparepart_needed ? 'Perbarui' : 'Simpan'}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="mb-5 text-xs font-semibold text-slate-900">Tahapan Progres Penanganan Mesin</h2>

          <div className="space-y-0">
            {STATUS_FLOW.map((step, index) => {
              const isDone = index < currentIndex || ticket.status === 'selesai';
              const isCurrent = index === currentIndex && ticket.status !== 'selesai';
              const stepLog = [...logs].reverse().find((log) => log.status === step.key);
              const isFuture = !isDone && !isCurrent;

              return (
                <div key={step.key} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < STATUS_FLOW.length - 1 && (
                    <span className={`absolute left-[11px] top-6 h-[calc(100%-8px)] w-px ${
                      isDone ? 'bg-emerald-400' : 'bg-slate-200'
                    }`} />
                  )}
                  <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                        ? 'bg-amber-500 text-white'
                        : 'border border-slate-200 bg-slate-100 text-slate-400'
                  }`}>
                    {isDone ? <Check size={14} /> : index + 1}
                  </div>
                  <div className={`min-w-0 flex-1 rounded-lg ${
                    isCurrent ? 'border border-amber-200 bg-amber-50/70 p-3' : 'pb-1 pt-0.5'
                  }`}>
                    <h3 className={`text-xs font-semibold ${
                      isDone ? 'text-emerald-700' : isCurrent ? 'text-amber-800' : 'text-slate-700'
                    }`}>
                      {step.label}
                    </h3>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{step.description}</p>
                    {stepLog && (
                      <div className="mt-2 text-[10px] leading-relaxed text-slate-600">
                        <p>{formatDate(stepLog.created_at)}</p>
                        {stepLog.note && <p className="mt-1 whitespace-pre-wrap text-slate-700">{stepLog.note}</p>}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="mt-3">
                        <label htmlFor="action-note" className="mb-1.5 block text-[10px] font-medium text-amber-800">
                          Catatan tindakan teknis
                        </label>
                        <textarea
                          id="action-note"
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={3}
                          placeholder="Catat hasil pemeriksaan atau tindakan perbaikan..."
                          className="w-full resize-y rounded-md border border-amber-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-400"
                        />
                      </div>
                    )}
                    {isFuture && step.key === 'selesai' && (
                      <div className="mt-1 flex items-start gap-1 text-[10px] text-slate-400">
                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                        <span>Tahap ini tersedia setelah perbaikan selesai.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            {nextStatus ? (
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={submitting}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {nextStatus.key === 'selesai' ? <CheckCircle2 size={15} /> : <Wrench size={15} />}
                {submitting
                  ? 'Memperbarui status...'
                  : nextStatus.key === 'selesai'
                    ? 'Tandai Pengujian & Selesaikan'
                    : `Lanjut ke ${nextStatus.label}`}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={16} /> Tiket ini sudah selesai ditangani
              </div>
            )}
          </div>

          {logs.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-800">
                <Clock3 size={13} /> Riwayat tindakan
              </h3>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-md bg-slate-50 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="text-[10px] font-medium text-slate-700">
                        {STATUS_FLOW.find((step) => step.key === log.status)?.label ?? log.status}
                      </p>
                      <p className="text-[9px] text-slate-400">{formatDate(log.created_at)}</p>
                    </div>
                    {log.note && <p className="mt-1 whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600">{log.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
