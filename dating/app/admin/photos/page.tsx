import prisma from '@/lib/prisma'
import { getPhotoUrl } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminPhotos({ searchParams }: { searchParams: { status?: string } }) {
  const status = searchParams.status || 'pending'
  const where = status === 'pending' ? { approved: 0 } : status === 'approved' ? { approved: 1 } : {}

  const photos = await prisma.userPhoto.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { time: 'desc' },
    take: 60,
  }).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Photo Review</h1>
        <div className="flex gap-2">
          {['pending', 'approved', 'all'].map(s => (
            <a key={s} href={`/admin/photos?status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${status === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {s}
            </a>
          ))}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400">No {status} photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
          {photos.map((photo: any) => (
            <div key={photo.id} className="card overflow-hidden group">
              <div className="aspect-square relative">
                <img src={getPhotoUrl(photo.thumb || photo.photo)} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {status === 'pending' && (
                    <>
                      <form action={`/api/admin/photos/${photo.id}?action=approve`} method="POST">
                        <button type="submit" className="px-3 py-1 bg-green-500 text-white text-xs rounded-lg">✓ Approve</button>
                      </form>
                      <form action={`/api/admin/photos/${photo.id}?action=reject`} method="POST">
                        <button type="submit" className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg">✕ Reject</button>
                      </form>
                    </>
                  )}
                </div>
                {photo.approved === 0 && <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full" />}
              </div>
              <div className="p-1.5">
                <Link href={`/admin/users/${photo.user?.id}`} className="text-xs text-gray-600 hover:text-brand-500 truncate block">{photo.user?.name}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
