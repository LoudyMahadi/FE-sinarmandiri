import SidebarAdminPusat from '@/components/sidebaradminpusat';

export default function AdminPusatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <SidebarAdminPusat />
      <main className="flex-1">{children}</main>
    </div>
  );
}