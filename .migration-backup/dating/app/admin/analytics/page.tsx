import prisma from '@/lib/prisma'
import AdminAnalytics from '@/components/admin/AdminAnalytics'

export default async function Analytics() {
  const now = Math.floor(Date.now() / 1000)
  const last7days = now - 7 * 86400
  const last30days = now - 30 * 86400

  const [
    newUsersWeek, newUsersMonth,
    messagesWeek, messagesMonth,
    revenueWeek, revenueMonth,
    topCountries,
  ] = await Promise.all([
    prisma.user.count({ where: { joinDateTime: { gte: String(last7days) } } }).catch(() => 0),
    prisma.user.count({ where: { joinDateTime: { gte: String(last30days) } } }).catch(() => 0),
    prisma.chat.count({ where: { time: { gte: last7days } } }).catch(() => 0),
    prisma.chat.count({ where: { time: { gte: last30days } } }).catch(() => 0),
    prisma.order.aggregate({ where: { status: 'completed', time: { gte: last7days } }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.order.aggregate({ where: { status: 'completed', time: { gte: last30days } }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
    prisma.$queryRaw<any[]>`SELECT country, COUNT(*) as cnt FROM users WHERE country != '' GROUP BY country ORDER BY cnt DESC LIMIT 10`.catch(() => []),
  ])

  return <AdminAnalytics stats={{ newUsersWeek, newUsersMonth, messagesWeek, messagesMonth, revenueWeek: revenueWeek._sum?.amount || 0, revenueMonth: revenueMonth._sum?.amount || 0, topCountries }} />
}
