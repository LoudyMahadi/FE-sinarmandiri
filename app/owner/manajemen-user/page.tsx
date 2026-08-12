'use client';
import { useEffect, useState } from 'react';
import Topbar from '@/components/topbar';
import { createClient } from '@/lib/supabase/client';

type Profile = {
  id: string;
  full_name: string;
  role: string;
  store: { name: string } | null;
};

export default function ManajemenUserPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, role, store:stores(name)');
      setUsers((data as any) ?? []);
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <Topbar title="Manajemen User" subtitle="Kelola akun pengguna sistem" />
      <div className="p-6">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Lokasi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{user.full_name}</td>
                  <td className="px-4 py-3 capitalize">{user.role?.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{user.store?.name ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}