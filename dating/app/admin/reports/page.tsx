import prisma from '@/lib/prisma'

export default async function AdminReports() {
  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, name: true, email: true } },
      reported: { select: { id: true, name: true, email: true, photo: true } },
    },
    orderBy: { time: 'desc' },
    take: 50,
  }).catch(() => [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports ({reports.length})</h1>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Reported User</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Reason</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Reporter</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.reported?.name}</p>
                    <p className="text-xs text-gray-400">{r.reported?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-700">{r.reporter?.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <a href={`/admin/users/${r.reported?.id}`} className="text-xs text-brand-500 hover:underline">View User</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
