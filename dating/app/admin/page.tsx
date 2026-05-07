import prisma from '@/lib/prisma'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminDashboardPage() {
  const [
    totalUsers, fakeUsers, realUsers, premiumUsers,
    totalOrders, totalRevenue, todayUsers, onlineUsers,
    pendingPhotos, totalMessages, openReports
  ] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.user.count({ where: { fake: 1 } }).catch(() => 0),
    prisma.user.count({ where: { fake: 0 } }).catch(() => 0),
    prisma.user.count({ where: { premium: 1 } }).catch(() => 0),
    prisma.order.count({ where: { status: 'completed' } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.user.count({ where: { joinDateTime: { gte: String(Math.floor(Date.now() / 1000) - 86400) } } }).catch(() => 0),
    prisma.user.count({ where: { lastAccess: { gte: String(Math.floor(Date.now() / 1000) - 300) } } }).catch(() => 0),
    prisma.userPhoto.count({ where: { approved: 0 } }).catch(() => 0),
    prisma.chat.count().catch(() => 0),
    prisma.report.count({ where: { status: 'pending' } }).catch(() => 0),
  ])

  const stats = {
    totalUsers, fakeUsers, realUsers, premiumUsers,
    totalOrders,
    totalRevenue: (totalRevenue._sum?.amount || 0).toFixed(2),
    todayUsers, onlineUsers, pendingPhotos, totalMessages, openReports,
  }

  const recentUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, photo: true, fake: true, premium: true, verified: true, joinDateTime: true, country: true },
    orderBy: { id: 'desc' },
    take: 10,
  }).catch(() => [])

  const recentOrders = await prisma.order.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { time: 'desc' },
    take: 5,
  }).catch(() => [])

  return <AdminDashboard stats={stats} recentUsers={recentUsers as any} recentOrders={recentOrders as any} />
}
