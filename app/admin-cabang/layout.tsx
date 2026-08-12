import SidebarAdminCabang from '@/components/sidebaradmincabang';
import { CabangSessionProvider } from '@/context/cabangsessioncontext';

export default function AdminCabangLayout({ children }: { children: React.ReactNode }) {
  return (
    <CabangSessionProvider>
      <div className="flex bg-gray-50 min-h-screen">
        <SidebarAdminCabang />
        <main className="flex-1">{children}</main>
      </div>
    </CabangSessionProvider>
  );
}