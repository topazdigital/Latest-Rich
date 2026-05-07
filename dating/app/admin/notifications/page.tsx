import prisma from '@/lib/prisma'
import AdminSendNotification from '@/components/admin/AdminSendNotification'

export default async function AdminNotifications() {
  const recentNotifications = await prisma.userNotification.findMany({
    orderBy: { time: 'desc' },
    take: 50,
  }).catch(() => [])

  return <AdminSendNotification recent={recentNotifications as any} />
}
