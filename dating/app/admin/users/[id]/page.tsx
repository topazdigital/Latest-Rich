import prisma from '@/lib/prisma'
import { notFound } from 'next/navigation'
import AdminUserEdit from '@/components/admin/AdminUserEdit'

export default async function AdminUserEditPage({ params }: { params: { id: string } }) {
  const userId = parseInt(params.id)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userExtended: true,
      photos: { take: 20, orderBy: { isPrimary: 'desc' } },
      orders: { take: 5, orderBy: { time: 'desc' } },
    },
  }).catch(() => null)
  if (!user) notFound()
  return <AdminUserEdit user={user as any} />
}
