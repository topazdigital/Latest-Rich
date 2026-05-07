import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainNav from '@/components/layout/MainNav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav />
      <main className="pt-14 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  )
}
