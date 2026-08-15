'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { useCabangSession } from '@/context/cabangsessioncontext';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, ShieldCheck } from 'lucide-react';

type Product = { id: string; name: string; price: number; tipe: 'barang' | 'jasa' };
type CartItem = { product_id: string; name: string; price: number; qty: number };
type ActiveStaff = { staff_pin_id: string; staff_name: string; is_supervisor: boolean };

export default function KasirCabangPage() {
  const supabase = createClient();
  const { setActiveStaff: setSessionActiveStaff } = useCabangSession();

  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [qtyInputs, setQtyInputs] = useState<Record<string, number>>({});
  const [filterTipe, setFilterTipe] = useState<'semua' | 'barang' | 'jasa'>('semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('store_id')
        .eq('id', user.id)
        .single();

      if (profile?.store_id) setStoreId(profile.store_id);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
      const data = await res.json();
      setProducts(data);

      const initialQty: Record<string, number> = {};
      data.forEach((p: Product) => { initialQty[p.id] = 1; });
      setQtyInputs(initialQty);
    };
    fetchInitial();
  }, []);

  const handlePinSubmit = async () => {
    if (!storeId) {
      setPinError('Toko belum teridentifikasi, refresh halaman');
      return;
    }
    setPinLoading(true);
    setPinError('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/pin-auth/switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput, store_id: storeId }),
      });
      const result = await res.json();

      if (!result.success) {
        setPinError('PIN tidak dikenali');
        return;
      }

      const nextStaff = {
        staff_pin_id: result.staff_pin_id,
        staff_name: result.staff_name,
        is_supervisor: result.is_supervisor,
      };

      setActiveStaff(nextStaff);
      setSessionActiveStaff(nextStaff);
      setShowPinModal(false);
      setPinInput('');
    } catch (err) {
      setPinError('Gagal terhubung ke server. Cek koneksi backend.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleSwitchStaff = () => {
    setActiveStaff(null);
    setSessionActiveStaff(null);
    setShowPinModal(true);
    setCart([]);
  };

  const handleQtyChange = (productId: string, value: number) => {
    setQtyInputs((prev) => ({ ...prev, [productId]: Math.max(1, value) }));
  };

  const addToCart = (product: Product) => {
    const qty = qtyInputs[product.id] || 1;
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty }];
    });
    setQtyInputs((prev) => ({ ...prev, [product.id]: 1 }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const filteredProducts = products.filter(
    (p) => filterTipe === 'semua' || p.tipe === filterTipe
  );

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setMessage('Keranjang masih kosong');
      return;
    }
    setSubmitting(true);
    setMessage('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          items: cart.map((item) => ({ product_id: item.product_id, qty: item.qty })),
          payment_method: paymentMethod,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage(`Gagal: ${result.error}`);
        return;
      }

      setMessage(`Transaksi berhasil! Total: Rp${result.total.toLocaleString('id-ID')}`);
      setCart([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Transaksi Kasir Cabang" subtitle="Layani transaksi harian pelanggan" />

      {activeStaff && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            {activeStaff.is_supervisor ? (
              <ShieldCheck size={16} className="text-blue-600" />
            ) : (
              <KeyRound size={16} className="text-gray-400" />
            )}
            <span className="text-gray-800 font-medium">{activeStaff.staff_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeStaff.is_supervisor ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {activeStaff.is_supervisor ? 'Supervisor' : 'Staf'}
            </span>
          </div>
          <button
            onClick={handleSwitchStaff}
            className="text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
          >
            Ganti Kasir
          </button>
        </div>
      )}

      {activeStaff && (
        <div className="p-6 grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-700">Daftar Produk</h2>
              <div className="flex bg-gray-100 rounded-md p-1">
                {(['semua', 'barang', 'jasa'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterTipe(tab)}
                    className={`px-3 py-1 text-xs rounded ${
                      filterTipe === tab ? 'bg-white text-gray-900 font-medium shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab === 'semua' ? 'Semua' : tab === 'barang' ? 'Barang' : 'Jasa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {filteredProducts.length === 0 && (
                <p className="text-sm text-gray-500 p-4">Tidak ada produk di kategori ini</p>
              )}

              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">Rp{product.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={qtyInputs[product.id] ?? 1}
                      onChange={(e) => handleQtyChange(product.id, Number(e.target.value))}
                      className="w-14 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center"
                    />
                    <button
                      onClick={() => addToCart(product)}
                      className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-gray-700 mb-3">Keranjang</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              {cart.length === 0 && <p className="text-sm text-gray-400">Belum ada item</p>}
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm text-gray-800">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.qty} x Rp{item.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      Rp{(item.price * item.qty).toLocaleString('id-ID')}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}

              {cart.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <label className="block text-xs text-gray-500 mb-1.5">Metode Pembayaran</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-800"
                  >
                    <option value="cash">Tunai (Cash)</option>
                    <option value="qris">QRIS</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="text-lg font-semibold text-gray-900">
                  Rp{total.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full mt-4 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {submitting ? 'Memproses...' : 'Bayar & Simpan Transaksi'}
              </button>

              {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
            </div>
          </div>
        </div>
      )}

      {showPinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 bg-gray-900 rounded-full mx-auto mb-4 flex items-center justify-center">
              <KeyRound size={20} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">Masuk sebagai Kasir</h2>
            <p className="text-xs text-gray-500 mb-4">Masukkan PIN pribadi untuk mulai melayani transaksi</p>

            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="Masukkan PIN"
              className="w-full text-center tracking-widest text-lg border border-gray-300 rounded-lg py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {pinError && <p className="text-xs text-red-500 mb-3">{pinError}</p>}

            <button
              onClick={handlePinSubmit}
              disabled={pinLoading || pinInput.length === 0}
              className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg disabled:bg-gray-400"
            >
              {pinLoading ? 'Memeriksa...' : 'Masuk'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}