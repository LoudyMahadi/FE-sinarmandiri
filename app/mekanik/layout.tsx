import SidebarMekanik from '@/components/sidebarmekanik';

export default function MekanikLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <SidebarMekanik />
      <main className="flex-1">{children}</main>
    </div>
  );
}