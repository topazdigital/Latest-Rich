import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import NotificationsPage from '@/components/notifications/NotificationsPage'

export default async function Notifications() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)
  const notifications = await prisma.userNotification.findMany({
    where: { uid: userId },
    orderBy: { time: 'desc' },
    take: 50,
  }).catch(() => [])
  await prisma.userNotification.updateMany({ where: { uid: userId, read: 0 }, data: { read: 1 } }).catch(() => {})
  return <NotificationsPage notifications={notifications as any} />
}
