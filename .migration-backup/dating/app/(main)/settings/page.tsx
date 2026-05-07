import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import SettingsPage from '@/components/settings/SettingsPage'

export default async function Settings() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { userExtended: true, photos: { where: { approved: 1 }, orderBy: { isPrimary: 'desc' } } },
  }).catch(() => null)
  return <SettingsPage user={user as any} />
}
