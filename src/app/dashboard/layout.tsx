import './dashboard.css'
import Sidebar from '@/components/Sidebar'
import MobileInfoTooltips from '@/components/MobileInfoTooltips'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f1f6fc]">
      <Sidebar />
      <div className="flex-1 min-w-0"><header className="hidden md:flex items-center justify-between bg-[#08075a] text-white h-14 px-6"><a href="/dashboard" className="text-sm">⌂ &nbsp; Mon parc immobilier</a><a href="/dashboard/parametres" className="text-sm rounded-full border border-blue-300/40 px-3 py-1">Mon compte</a></header><main className="min-w-0 p-3 pb-24 md:p-5">{children}</main></div>
      <MobileInfoTooltips />
    </div>
  )
}