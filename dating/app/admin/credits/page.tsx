import prisma from '@/lib/prisma'

export default async function AdminCreditsPage() {
  const [creditPackages, premiumPackages, recentCreditLogs] = await Promise.all([
    prisma.creditPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => []),
    prisma.premiumPackage.findMany({ orderBy: { price: 'asc' } }).catch(() => []),
    prisma.userCredit.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { time: 'desc' },
      take: 20,
    }).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Credits & Premium</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Credit Packages</h3>
          <div className="space-y-3">
            {creditPackages.length === 0 ? (
              <p className="text-gray-400 text-sm">No credit packages. Add via database.</p>
            ) : creditPackages.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{p.credits} Credits</p>
                  <p className="text-sm text-gray-500">{p.description}</p>
                </div>
                <p className="font-bold text-brand-500">${p.price}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-gray-900 mb-4">Premium Packages</h3>
          <div className="space-y-3">
            {premiumPackages.length === 0 ? (
              <p className="text-gray-400 text-sm">No premium packages. Add via database.</p>
            ) : premiumPackages.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.days} days</p>
                </div>
                <p className="font-bold text-brand-500">${p.price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-900">Recent Credit Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentCreditLogs.map((log: any) => (
                <tr key={log.id}>
                  <td className="px-4 py-3">{log.user?.name}</td>
                  <td className={`px-4 py-3 font-semibold ${log.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{log.type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-400">{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
