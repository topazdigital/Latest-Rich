import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join('/')
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = MIME_TYPES[ext] || 'image/jpeg'

  // Security: no path traversal
  if (filePath.includes('..')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const uploadsDir = path.join(process.cwd(), '..', 'assets', 'sources', 'uploads')
  const fullPath = path.join(uploadsDir, filePath)

  try {
    const fileBuffer = await readFile(fullPath)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    // Return default avatar
    const defaultAvatar = path.join(process.cwd(), 'public', 'images', 'default-avatar.png')
    try {
      const buffer = await readFile(defaultAvatar)
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
      })
    } catch {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }
}
