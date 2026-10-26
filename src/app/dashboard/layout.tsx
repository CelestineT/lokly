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
      <main className="flex-1 min-w-0 w-full p-2 sm:p-4 md:p-8">
        {children}
      </main>
      <MobileInfoTooltips />
    </div>
  )
}