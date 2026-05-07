import prisma from '@/lib/prisma'
import AdminUsers from '@/components/admin/AdminUsers'

export default async function AdminUsersPage({ searchParams }: { searchParams: { page?: string; search?: string; type?: string } }) {
  const page = parseInt(searchParams.page || '1')
  const search = searchParams.search || ''
  const type = searchParams.type || 'all'
  const perPage = 20

  const where: any = {}
  if (search) where.OR = [{ name: { contains: search } }, { email: { contains: search } }, { username: { contains: search } }]
  if (type === 'fake') where.fake = 1
  if (type === 'real') where.fake = 0
  if (type === 'premium') where.premium = 1
  if (type === 'blocked') where.blocked = 1

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, photo: true, fake: true, premium: true, verified: true, blocked: true, suspend: true, admin: true, credits: true, country: true, joinDateTime: true, lastAccess: true, gender: true },
      orderBy: { id: 'desc' },
      take: perPage,
      skip: (page - 1) * perPage,
    }).catch(() => []),
    prisma.user.count({ where }).catch(() => 0),
  ])

  return <AdminUsers users={users as any} total={total} page={page} perPage={perPage} search={search} type={type} />
}
