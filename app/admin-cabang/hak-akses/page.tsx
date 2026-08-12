'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { useCabangSession } from '@/context/cabangsessioncontext';
import { createClient } from '@/lib/supabase/client';
import { ShieldAlert, ShieldCheck, Plus, X } from 'lucide-react';

type FinancialRecord = {
  id: string;
  tanggal: string;
  deskripsi: string;
  kategori: string;
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
};

export default function HakAksesPage() {
  const { activeStaff } = useCabangSession();
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [pengeluaranList, setPengeluaranList] = useState<FinancialRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [desc, setDesc] = useState('');
  const [kategori, setKategori] = useState('');
  const [nominal, setNominal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async (store_id: string) => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total')
      .eq('store_id', store_id);
    setTotalPemasukan((transactions ?? []).reduce((sum, t) => sum + t.total, 0));

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/financial-records/store/${store_id}`);
    const records = await res.json();
    setPengeluaranList(records.filter((r: FinancialRecord) => r.tipe === 'pengeluaran'));
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user.id).single();
      if (profile?.store_id) {
        setStoreId(profile.store_id);
        fetchData(profile.store_id);
      }
    };
    if (activeStaff?.is_supervisor) init();
  }, [activeStaff]);

  const totalPengeluaran = pengeluaranList.reduce((sum, r) => sum + r.nominal, 0);
  const labaBersih = totalPemasukan - totalPengeluaran;

  const handleSubmit = async () => {
    if (!desc || nominal <= 0) {
      setMessage('Deskripsi dan nominal wajib diisi dengan benar');
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/financial-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, deskripsi: desc, kategori, nominal, dibuat_oleh: user?.id }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setShowAddModal(false);
      setDesc(''); setKategori(''); setNominal(0);
      fetchData(storeId);
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeStaff) {
    return (
      <div>
        <Topbar title="Pengaturan Hak Akses" subtitle="Laporan keuangan & laba-rugi cabang" />
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">
              Belum ada kasir yang aktif. Silakan masuk lewat halaman <span className="font-medium">Transaksi Kasir</span> terlebih dahulu.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!activeStaff.is_supervisor) {
    return (
      <div>
        <Topbar title="Pengaturan Hak Akses" subtitle="Laporan keuangan & laba-rugi cabang" />
        <div className="p-6">
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <ShieldAlert size={32} className="text-red-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Akses Ditolak</p>
            <p className="text-sm text-gray-500">
              Halaman ini hanya dapat diakses oleh supervisor. Kasir aktif saat ini:{' '}
              <span className="font-medium text-gray-700">{activeStaff.staff_name}</span> (Staf biasa).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Laporan Laba-Rugi Cabang" subtitle="Khusus akses supervisor" />

      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-3">
          <ShieldCheck size={20} className="text-blue-600" />
          <p className="text-sm text-gray-700">
            Masuk sebagai <span className="font-medium">{activeStaff.staff_name}</span> (Supervisor)
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Pemasukan (Transaksi)</p>
            <p className="text-2xl font-semibold text-green-600" suppressHydrationWarning>
              Rp{totalPemasukan.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-semibold text-red-500" suppressHydrationWarning>
              Rp{totalPengeluaran.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Laba Bersih Cabang</p>
            <p className={`text-2xl font-semibold ${labaBersih >= 0 ? 'text-gray-900' : 'text-red-500'}`} suppressHydrationWarning>
              Rp{labaBersih.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">Rincian Pengeluaran Cabang</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-md hover:bg-gray-800"
          >
            <Plus size={16} /> Catat Pengeluaran
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {pengeluaranList.length === 0 && (
            <p className="text-sm text-gray-500 p-5">Belum ada pengeluaran tercatat</p>
          )}
          {pengeluaranList.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-gray-800">{r.deskripsi}</p>
                <p className="text-xs text-gray-500">
                  {r.kategori} •{' '}
                  {new Date(r.tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-sm font-medium text-red-500" suppressHydrationWarning>
                -Rp{r.nominal.toLocaleString('id-ID')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Catat Pengeluaran</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} className="text-gray-400" /></button>
            </div>

            <label className="block text-sm text-gray-700 mb-1">Deskripsi</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="misal: Bayar listrik cabang" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />

            <label className="block text-sm text-gray-700 mb-1">Kategori</label>
            <input value={kategori} onChange={(e) => setKategori(e.target.value)} placeholder="misal: Operasional" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-3" />

            <label className="block text-sm text-gray-700 mb-1">Nominal</label>
            <input type="number" value={nominal} onChange={(e) => setNominal(Number(e.target.value))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4" />

            {message && <p className="text-sm text-red-500 mb-3">{message}</p>}

            <button onClick={handleSubmit} disabled={submitting} className="w-full bg-gray-900 text-white text-sm py-2.5 rounded-md disabled:bg-gray-400">
              {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}