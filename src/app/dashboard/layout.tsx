import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
   <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto bg-blue-50">
        {children}
      <main className="flex-1 p-4 md:p-8">
    </div>
  )
}
