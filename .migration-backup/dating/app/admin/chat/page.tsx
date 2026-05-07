import prisma from '@/lib/prisma'
import Link from 'next/link'
import { getPhotoUrl, timeAgo, truncate } from '@/lib/utils'

export default async function AdminChat() {
  const recentChats = await prisma.chat.findMany({
    include: {
      sender: { select: { id: true, name: true, photo: true, fake: true } },
      receiver: { select: { id: true, name: true, photo: true, fake: true } },
    },
    orderBy: { time: 'desc' },
    take: 50,
  }).catch(() => [])

  const totalMessages = await prisma.chat.count().catch(() => 0)
  const todayMessages = await prisma.chat.count({ where: { time: { gte: Math.floor(Date.now() / 1000) - 86400 } } }).catch(() => 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Chat Monitor</h1>
        <div className="flex gap-3">
          <div className="card px-4 py-2 text-center">
            <p className="text-xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Messages</p>
          </div>
          <div className="card px-4 py-2 text-center">
            <p className="text-xl font-bold text-green-600">{todayMessages.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Today</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-gray-50">
          <p className="text-sm text-gray-500">Showing recent messages. Bot messages are marked with 🤖</p>
        </div>
        <div className="divide-y divide-gray-50">
          {recentChats.map((chat: any) => (
            <div key={chat.id} className="flex items-start gap-3 p-4 hover:bg-gray-50">
              <div className="flex gap-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img src={getPhotoUrl(chat.sender?.photo)} alt="" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/admin/users/${chat.sender?.id}`} className="text-sm font-medium text-gray-900 hover:text-brand-500">
                    {chat.sender?.name}
                    {chat.sender?.fake ? ' 🤖' : ''}
                  </Link>
                  <span className="text-xs text-gray-400">→</span>
                  <Link href={`/admin/users/${chat.receiver?.id}`} className="text-sm text-gray-600 hover:text-brand-500">
                    {chat.receiver?.name}
                    {chat.receiver?.fake ? ' 🤖' : ''}
                  </Link>
                  <span className="text-xs text-gray-300 ml-auto flex-shrink-0">{timeAgo(chat.time)}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{truncate(chat.message?.replace(/<[^>]*>/g, ''), 100)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
