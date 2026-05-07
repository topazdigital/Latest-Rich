import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create site config
  await prisma.config.upsert({
    where: { name: 'Rich Dating Network' },
    create: {
      name: 'Rich Dating Network',
      title: 'Rich Dating Network | Exclusive Dating for Affluent Singles',
      description: 'Join Rich Dating Network and connect with successful, affluent singles looking for genuine relationships.',
      keywords: 'rich dating, affluent singles, wealthy singles, exclusive dating',
      lang: '1',
      email: 'admin@richdatingnetwork.com',
      currency: 'USD',
      mainColor: '#FF192C',
      freeCredits: 50,
      freePremium: 0,
      photoReview: 0,
      emailVerification: 0,
      fAI: 'Yes',
      fEngage: 'Yes',
      fEngageTime: 10,
      fEngageLimit: 100,
    },
    update: {},
  })

  // Admin user
  const adminEmail = 'patrickndungu.pnn@gmail.com'
  const adminPass = await bcrypt.hash('dj@Topaz27899310', 12)
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: adminPass,
        pass: adminPass,
        admin: 1,
        verified: 1,
        premium: 1,
        credits: 999999,
        age: 30,
        gender: 1,
        joinDate: new Date().toLocaleDateString(),
        joinDateTime: String(Math.floor(Date.now() / 1000)),
        lastAccess: String(Math.floor(Date.now() / 1000)),
        country: 'Kenya',
        countryCode: 'KE',
      },
    })
    await prisma.userExtended.create({ data: { userId: admin.id } }).catch(() => {})
    console.log('Admin user created:', adminEmail)
  } else {
    // Update admin password
    await prisma.user.update({
      where: { email: adminEmail },
      data: { password: adminPass, pass: adminPass, admin: 1, premium: 1, credits: 999999 },
    })
    console.log('Admin user updated')
  }

  // Credit packages
  const creditPkgs = [
    { credits: 100, price: 4.99, popular: 0, description: 'Starter Pack', discount: 0 },
    { credits: 250, price: 9.99, popular: 1, description: 'Most Popular', discount: 10 },
    { credits: 500, price: 17.99, popular: 0, description: 'Value Pack', discount: 20 },
    { credits: 1000, price: 29.99, popular: 0, description: 'Best Value', discount: 40 },
  ]
  for (const pkg of creditPkgs) {
    const existing = await prisma.creditPackage.findFirst({ where: { credits: pkg.credits } })
    if (!existing) await prisma.creditPackage.create({ data: pkg })
  }

  // Premium packages
  const premiumPkgs = [
    { name: '1 Month', days: 30, price: 9.99, popular: 0, description: 'Flexible monthly plan' },
    { name: '3 Months', days: 90, price: 24.99, popular: 1, description: 'Save 17%' },
    { name: '6 Months', days: 180, price: 39.99, popular: 0, description: 'Save 33%' },
    { name: '1 Year', days: 365, price: 59.99, popular: 0, description: 'Best value — Save 50%' },
  ]
  for (const pkg of premiumPkgs) {
    const existing = await prisma.premiumPackage.findFirst({ where: { name: pkg.name } })
    if (!existing) await prisma.premiumPackage.create({ data: pkg })
  }

  // Virtual gifts
  const gifts = [
    { name: 'Rose', image: '🌹', price: 10 },
    { name: 'Heart', image: '❤️', price: 15 },
    { name: 'Kiss', image: '💋', price: 20 },
    { name: 'Chocolate', image: '🍫', price: 25 },
    { name: 'Teddy Bear', image: '🧸', price: 30 },
    { name: 'Champagne', image: '🥂', price: 50 },
    { name: 'Sunflower', image: '🌻', price: 35 },
    { name: 'Stars', image: '⭐', price: 40 },
    { name: 'Diamond Ring', image: '💍', price: 100 },
    { name: 'Crown', image: '👑', price: 200 },
    { name: 'Yacht', image: '⛵', price: 500 },
    { name: 'Sports Car', image: '🏎️', price: 1000 },
  ]
  for (const gift of gifts) {
    const existing = await prisma.gift.findFirst({ where: { name: gift.name } })
    if (!existing) await prisma.gift.create({ data: { ...gift, enabled: 1 } })
  }

  // Default fake messages
  const fakeMessages = [
    'Hey! How are you doing today? 😊',
    'Your profile caught my eye! Tell me more about yourself.',
    'I love your photos! You seem like such an interesting person.',
    'Hi there! I\'m new here and you seem really interesting 💝',
    'What do you do for fun? I love meeting new people!',
    'Your smile is amazing! Would love to chat more 😍',
    'I noticed we have a lot in common! Want to talk?',
    'Hey gorgeous! How\'s your day going? ☀️',
    'I\'d love to get to know you better!',
    'You seem like exactly the kind of person I\'ve been looking for!',
    'Hi! I just joined and you were the first profile I liked 💕',
    'Your profile is so interesting! What are your hobbies?',
    'I love traveling too! Where\'s the best place you\'ve visited?',
    'You look amazing! Hope we can chat soon 🌹',
    'I\'m impressed by your profile. Would love to know more about you.',
  ]
  for (const message of fakeMessages) {
    const existing = await prisma.fakeMessage.findFirst({ where: { message } })
    if (!existing) await prisma.fakeMessage.create({ data: { message } })
  }

  console.log('Database seeded successfully!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
