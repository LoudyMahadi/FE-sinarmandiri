'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg('Email atau password salah');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    switch (profile?.role) {
      case 'owner':
        router.push('/owner/dashboard');
        break;
      case 'admin_pusat':
        router.push('/admin-pusat/dashboard');
        break;
      case 'admin_cabang':
        router.push('/admin-cabang/dashboard');
        break;
      case 'mekanik':
        router.push('/mekanik/tiket');
        break;
      default:
        setErrorMsg('Role tidak dikenali');
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Nama toko */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#1A2233] rounded-xl mx-auto mb-4 flex items-center justify-center shadow-sm">
            <span className="text-white font-semibold text-2xl">S</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Toko Sinar Mandiri</h1>
          <p className="text-sm text-gray-400 mt-1">Sistem Informasi Operasional</p>
        </div>

        {/* Card form */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@sinarmandiri.com"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.5 12c1.5 3.5 4.5 6.5 10.5 6.5 3.5 0 6.2-1.1 8.3-2.8M9.88 9.88A3 3 0 1 1 14.12 14.12M21.5 12c-1.5 3.5-4.5 6.5-10.5 6.5-1.8 0-3.3-.3-4.7-.8M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 4.5 12 4.5 21.5 12 21.5 12 18 19.5 12 19.5 2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-3.5 py-2.5">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A2233] hover:bg-[#151d2d] disabled:bg-slate-400 text-white text-sm font-medium py-2.5 rounded-lg transition shadow-sm"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2026 Toko Sinar Mandiri. Sistem internal operasional.
        </p>
      </div>
    </div>
  );
}