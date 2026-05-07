import prisma from '@/lib/prisma'

export default async function AdminPayments({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  const page = parseInt(searchParams.page || '1')
  const status = searchParams.status || 'all'
  const where: any = status !== 'all' ? { status } : {}

  const [orders, total, revenue] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true, country: true } } },
      orderBy: { time: 'desc' },
      take: 25,
      skip: (page - 1) * 25,
    }).catch(() => []),
    prisma.order.count({ where }).catch(() => 0),
    prisma.order.aggregate({ where: { status: 'completed' }, _sum: { amount: true } }).catch(() => ({ _sum: { amount: 0 } })),
  ])

  const gateways = await prisma.order.groupBy({ by: ['gateway'], _count: { id: true }, _sum: { amount: true }, where: { status: 'completed' } }).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <div className="text-right">
          <p className="text-3xl font-bold text-green-600">${(revenue._sum?.amount || 0).toFixed(2)}</p>
          <p className="text-sm text-gray-400">Total Revenue</p>
        </div>
      </div>

      {/* Gateway breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {gateways.map((g: any) => (
          <div key={g.gateway} className="card p-4 text-center">
            <p className="text-xs text-gray-400 capitalize mb-1">{g.gateway}</p>
            <p className="text-xl font-bold text-gray-900">${(g._sum?.amount || 0).toFixed(2)}</p>
            <p className="text-xs text-gray-500">{g._count.id} transactions</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all','completed','pending','failed'].map(s => (
          <a key={s} href={`/admin/payments?status=${s}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${status === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Gateway</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{o.user?.name}</p>
                    <p className="text-xs text-gray-400">{o.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">{o.type}{o.credits > 0 ? ` (${o.credits} cr)` : ''}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-gray-100 text-gray-600 capitalize">{o.gateway}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">${o.amount} {o.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${o.status === 'completed' ? 'bg-green-100 text-green-700' : o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.time * 1000).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
