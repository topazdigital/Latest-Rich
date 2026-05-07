import prisma from '@/lib/prisma'

export default async function AdminGifts() {
  const gifts = await prisma.gift.findMany({ orderBy: { price: 'asc' } }).catch(() => [])
  const giftsSent = await prisma.userGift.count().catch(() => 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gifts</h1>
        <div className="card px-4 py-2 text-center">
          <p className="text-xl font-bold text-gray-900">{giftsSent.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Gifts Sent</p>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-4">Virtual Gifts Library</h3>
        {gifts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No gifts configured yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add gifts to the database via Prisma Studio or the setup script.</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {gifts.map(gift => (
              <div key={gift.id} className="text-center p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl mb-1">{gift.image}</div>
                <div className="text-xs font-medium text-gray-700">{gift.name}</div>
                <div className="text-xs text-brand-600">{gift.price} cr</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-gray-900 mb-3">Default Gifts Setup</h3>
        <p className="text-sm text-gray-500 mb-4">Run this to add default gifts to your database:</p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-sm overflow-x-auto">
{`cd dating && npx prisma db seed`}</pre>
      </div>
    </div>
  )
}
