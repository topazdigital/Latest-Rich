import prisma from '@/lib/prisma'
import Link from 'next/link'
import { Heart } from 'lucide-react'

export default async function Terms() {
  const config = await prisma.config.findFirst().catch(() => null)
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center"><Heart size={14} className="text-white fill-white" /></div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-gray max-w-none">
          {config?.terms ? <div dangerouslySetInnerHTML={{ __html: config.terms }} /> : (
            <p className="text-gray-500">Terms of service content will be displayed here once configured by the administrator.</p>
          )}
        </div>
      </div>
    </div>
  )
}
