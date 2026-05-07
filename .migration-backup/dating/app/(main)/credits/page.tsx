import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import CreditsPage from '@/components/credits/CreditsPage'

export default async function Credits() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)

  const [user, packages, orders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { credits: true, premium: true, countryCode: true } }).catch(() => null),
    prisma.creditPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => [
      { id: 1, credits: 100, price: 4.99, popular: 0, description: 'Starter Pack', discount: 0 },
      { id: 2, credits: 250, price: 9.99, popular: 1, description: 'Popular', discount: 10 },
      { id: 3, credits: 500, price: 17.99, popular: 0, description: 'Value Pack', discount: 20 },
      { id: 4, credits: 1000, price: 29.99, popular: 0, description: 'Best Value', discount: 40 },
    ]),
    prisma.order.findMany({ where: { uid: userId }, orderBy: { time: 'desc' }, take: 10 }).catch(() => []),
  ])

  return <CreditsPage user={user as any} packages={packages as any} orders={orders as any} />
}
