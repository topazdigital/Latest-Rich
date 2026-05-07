import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { sendEmail, welcomeEmailTemplate } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, gender, lookingFor, birthday, city, country } = await req.json()

    if (!name || !email || !password) return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const config = await prisma.config.findFirst().catch(() => null)
    const hashedPass = await bcrypt.hash(password, 12)
    const now = Math.floor(Date.now() / 1000)

    // Calculate age from birthday
    let age = 25
    if (birthday) {
      const b = new Date(birthday)
      age = Math.floor((Date.now() - b.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    // Determine country code from country name
    const countryCodeMap: Record<string, string> = {
      'Kenya': 'KE', 'Tanzania': 'TZ', 'Uganda': 'UG', 'Rwanda': 'RW',
      'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA',
      'Australia': 'AU', 'Nigeria': 'NG', 'Ghana': 'GH', 'South Africa': 'ZA',
    }
    const countryCode = countryCodeMap[country] || ''

    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 999)

    const user = await prisma.user.create({
      data: {
        name, email, password: hashedPass, pass: hashedPass,
        age, birthday: birthday || '',
        city: city || '', country: country || '',
        countryCode,
        gender: parseInt(gender) || 1,
        looking: parseInt(lookingFor) || 2,
        verified: 0, credits: config?.freeCredits || 50,
        joinDate: new Date().toLocaleDateString(),
        joinDateTime: String(now),
        lastAccess: String(now),
        username,
      },
    })

    // Create extended profile
    await prisma.userExtended.create({ data: { userId: user.id } }).catch(() => {})

    // Welcome email
    const siteUrl = process.env.NEXTAUTH_URL || 'https://richdatingnetwork.com'
    await sendEmail({ to: email, subject: 'Welcome to Rich Dating Network!', html: welcomeEmailTemplate(name, siteUrl) })

    return NextResponse.json({ success: true, userId: user.id })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
