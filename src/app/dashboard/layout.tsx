import {House,UserRound,ChevronDown} from 'lucide-react'
import './dashboard.css'
import Sidebar from '@/components/Sidebar'
import MobileInfoTooltips from '@/components/MobileInfoTooltips'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="ekolocs-shell">
      <Sidebar />
      <div className="ekolocs-workspace"><header className="ekolocs-topbar"><a href="/dashboard"><House size={18}/> Mon parc immobilier</a><a href="/dashboard/compte" aria-label="Mon compte"><span className="ekolocs-avatar"><UserRound size={18}/></span><ChevronDown size={15}/></a></header><main className="ekolocs-main">{children}</main></div>
      <MobileInfoTooltips />
    </div>
  )
}