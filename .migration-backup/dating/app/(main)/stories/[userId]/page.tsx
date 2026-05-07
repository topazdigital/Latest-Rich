import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getPhotoUrl } from '@/lib/utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { X, Heart } from 'lucide-react'

export default async function StoryViewer({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const storyUserId = parseInt(params.userId)
  const [user, stories] = await Promise.all([
    prisma.user.findUnique({ where: { id: storyUserId }, select: { id: true, name: true, photo: true } }).catch(() => null),
    prisma.userStory.findMany({ where: { uid: storyUserId }, orderBy: { time: 'desc' }, take: 10 }).catch(() => []),
  ])
  if (!user || stories.length === 0) redirect('/home')
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-sm h-full">
        <img src={getPhotoUrl((stories[0] as any).photo)} alt="story" className="w-full h-full object-cover" />
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white">
            <img src={getPhotoUrl(user.photo)} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div className="text-white flex-1">
            <p className="font-semibold text-sm">{user.name}</p>
          </div>
          <Link href="/home" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
            <X size={18} className="text-white" />
          </Link>
        </div>
      </div>
    </div>
  )
}
