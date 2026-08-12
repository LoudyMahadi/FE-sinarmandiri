import Topbar from '@/components/topbar';

export default function Page() {
  return (
    <div>
      <Topbar title="Transaksi Kasir" subtitle="Halaman ini masih dalam pengembangan" />
      <div className="p-6">
        <p className="text-gray-500 text-sm">Segera hadir.</p>
      </div>
    </div>
  );
}