export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="h-1 bg-blue-500" />
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-4">
          {/* <button className="text-blue-500 hover:opacity-70 transition">🔔</button> */}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
            U
          </div>
        </div>
      </div>
    </div>
  );
}