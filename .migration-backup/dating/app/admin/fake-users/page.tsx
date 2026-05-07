import prisma from '@/lib/prisma'
import FakeUsersPage from '@/components/admin/FakeUsersPage'

export default async function AdminFakeUsers() {
  const fakeUsers = await prisma.user.findMany({
    where: { fake: 1 },
    select: { id: true, name: true, photo: true, age: true, country: true, gender: true, credits: true, lastAccess: true },
    orderBy: { id: 'desc' },
    take: 50,
  }).catch(() => [])

  const fakeMessages = await prisma.fakeMessage.findMany({ take: 20 }).catch(() => [])

  return <FakeUsersPage fakeUsers={fakeUsers as any} fakeMessages={fakeMessages as any} />
}
