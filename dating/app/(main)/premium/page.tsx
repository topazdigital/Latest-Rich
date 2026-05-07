import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import PremiumPage from '@/components/premium/PremiumPage'

export default async function Premium() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { premium: true, countryCode: true } }).catch(() => null)

  const packages = await prisma.premiumPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => [
    { id: 1, name: '1 Month', days: 30, price: 9.99, popular: 0, description: 'Flexible monthly plan' },
    { id: 2, name: '3 Months', days: 90, price: 24.99, popular: 1, description: 'Save 17%' },
    { id: 3, name: '6 Months', days: 180, price: 39.99, popular: 0, description: 'Save 33%' },
    { id: 4, name: '1 Year', days: 365, price: 59.99, popular: 0, description: 'Best value — Save 50%' },
  ])

  return <PremiumPage user={user as any} packages={packages as any} />
}
