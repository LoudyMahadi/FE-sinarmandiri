'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';

type Product = { id: string; name: string; price: number };
type CartItem = { product_id: string; name: string; price: number; qty: number };

export default function KasirPusatPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (store) setStoreId(store.id);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
      setProducts(await res.json());
    };
    fetchInitial();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

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
    } catch (err) {
      setMessage('Gagal terhubung ke server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Topbar title="Transaksi Kasir Pusat" subtitle="Layani transaksi harian pelanggan toko pusat" />

      <div className="p-6 grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Daftar Produk</h2>
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {products.length === 0 && (
              <p className="text-sm text-gray-500 p-4">Memuat produk...</p>
            )}
            {products.map((product) => (
              <div key={product.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-800">{product.name}</p>
                  <p className="text-xs text-gray-500">Rp{product.price.toLocaleString('id-ID')}</p>
                </div>
                <button
                  onClick={() => addToCart(product)}
                  className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800"
                >
                  Tambah
                </button>
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
                  <option value="transfer">Transfer Bank</option>
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
    </div>
  );
}