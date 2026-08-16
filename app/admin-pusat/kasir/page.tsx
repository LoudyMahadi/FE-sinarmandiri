'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';

type Product = { id: string; name: string; price: number; tipe: 'barang' | 'jasa' };
type CartItem = { product_id: string; name: string; price: number; qty: number };

export default function KasirPusatPage() {
  const supabase = createClient();

  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const [qtyInputs, setQtyInputs] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipe, setFilterTipe] = useState<'semua' | 'barang' | 'jasa'>('semua');

  const fetchStock = async (store_id: string) => {
    const { data } = await supabase
      .from('inventories')
      .select('product_id, quantity')
      .eq('store_id', store_id);

    const map: Record<string, number> = {};
    (data ?? []).forEach((row) => { map[row.product_id] = row.quantity; });
    setStockMap(map);
  };

  useEffect(() => {
    const fetchInitial = async () => {
      const { data: store } = await supabase.from('stores').select('id').eq('type', 'pusat').single();
      if (!store) return;
      setStoreId(store.id);
      fetchStock(store.id);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`);
      const data = await res.json();
      setProducts(data);

      const initialQty: Record<string, number> = {};
      data.forEach((p: Product) => { initialQty[p.id] = 1; });
      setQtyInputs(initialQty);
    };
    fetchInitial();
  }, []);

  // sisa stok yang boleh ditambah = stok gudang - yang sudah ada di keranjang
  const getRemainingStock = (productId: string, tipe: 'barang' | 'jasa') => {
    if (tipe === 'jasa') return Infinity; // jasa gak punya batasan stok fisik
    const stock = stockMap[productId] ?? 0;
    const inCart = cart.find((c) => c.product_id === productId)?.qty ?? 0;
    return stock - inCart;
  };

  const handleQtyChange = (productId: string, value: number, tipe: 'barang' | 'jasa') => {
    const remaining = getRemainingStock(productId, tipe);
    const capped = Math.min(Math.max(1, value), remaining === Infinity ? value : Math.max(remaining, 1));
    setQtyInputs((prev) => ({ ...prev, [productId]: capped }));
  };

  const addToCart = (product: Product) => {
    const remaining = getRemainingStock(product.id, product.tipe);
    if (remaining <= 0) {
      setMessage(`Stok ${product.name} habis`);
      return;
    }

    const qty = Math.min(qtyInputs[product.id] || 1, remaining === Infinity ? (qtyInputs[product.id] || 1) : remaining);

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
    setMessage('');
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const filteredProducts = products.filter((p) => {
    const matchTipe = filterTipe === 'semua' || p.tipe === filterTipe;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchTipe && matchSearch;
  });

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
      fetchStock(storeId); // refresh sisa stok setelah transaksi
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

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm text-gray-800"
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-[520px] overflow-y-auto">
            {filteredProducts.length === 0 && (
              <p className="text-sm text-gray-500 p-4">Produk tidak ditemukan</p>
            )}
            {filteredProducts.map((product) => {
              const remaining = getRemainingStock(product.id, product.tipe);
              const isOutOfStock = remaining <= 0;
              return (
                <div key={product.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-800">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      Rp{product.price.toLocaleString('id-ID')}
                      {product.tipe === 'barang' && (
                        <span className={isOutOfStock ? 'text-red-500 ml-2' : 'text-gray-400 ml-2'}>
                          • Stok: {stockMap[product.id] ?? 0}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={remaining === Infinity ? undefined : remaining}
                      value={qtyInputs[product.id] ?? 1}
                      onChange={(e) => handleQtyChange(product.id, Number(e.target.value), product.tipe)}
                      disabled={isOutOfStock}
                      className="w-14 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center disabled:bg-gray-100"
                    />
                    <button
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isOutOfStock ? 'Habis' : 'Tambah'}
                    </button>
                  </div>
                </div>
              );
            })}
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