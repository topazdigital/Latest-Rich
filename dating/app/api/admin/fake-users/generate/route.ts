import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

const FEMALE_NAMES = ['Emma','Sofia','Olivia','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Elizabeth','Mila','Ella','Avery','Camila','Aria','Scarlett','Victoria','Madison','Luna','Grace','Chloe','Penelope','Layla','Riley','Zoey','Nora','Lily','Eleanor','Hannah','Lillian','Addison','Aubrey','Ellie','Stella','Natalie','Zoe','Leah','Hazel']
const MALE_NAMES = ['James','Oliver','William','Benjamin','Elijah','Lucas','Mason','Ethan','Daniel','Henry','Alexander','Michael','Owen','Sebastian','Carter','Julian','Liam','Noah','Aiden','Jackson','Logan','Jack','Luke','Samuel','David','Joseph','John','Ryan','Nathan','Andrew','Christian','Joshua','Dylan','Aaron','Leo','Charles']
const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin','Lee','White','Harris','Thompson','Lewis','Robinson','Walker','Hall','Young','Allen']
const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','Netherlands','Sweden','Norway','Denmark']
const CITIES_US = ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','Austin']
const CITIES_UK = ['London','Birmingham','Manchester','Glasgow','Leeds','Liverpool','Edinburgh','Bristol','Cardiff','Leicester']
const BIOS_F = [
  "I'm looking for someone to share life's adventures with. Passionate about travel, food, and great conversations.",
  "Life is too short to not enjoy every moment. I love hiking, cooking, and meeting new people.",
  "Professional by day, adventurer by weekend. Looking for someone who can keep up!",
  "I believe in making memories, not just plans. Let's explore the world together.",
  "Coffee lover, bookworm, and weekend hiker. Looking for my partner in crime.",
  "Success-driven but always make time for the people I care about. Ready to find my person.",
  "I love the finer things in life but equally happy with a sunset and good company.",
  "Spontaneous yet dependable. Looking for real connection in a world full of distractions.",
  "Entrepreneur and globe-trotter. Looking for someone equally ambitious and adventurous.",
  "Kind-hearted and driven. I believe in treating people well and making every day count.",
]
const BIOS_M = [
  "Successful professional looking for genuine connection. I work hard and play harder.",
  "Love adventure, good food, and even better conversations. Looking for my partner in crime.",
  "Building something great with my life and want someone amazing to share it with.",
  "Passionate about finance, fitness, and finding the right person. Life is better shared.",
  "World traveler and entrepreneur. Looking for someone who can match my energy and ambition.",
  "I believe in quality over quantity in all things — including relationships.",
  "Work hard, play harder. Looking for someone who has their life together and wants more.",
  "Family-oriented and driven. Looking for a woman who knows what she wants.",
  "Successful, honest, and ready to build something real with the right person.",
  "Life is an adventure and I'm looking for a co-pilot. Are you up for it?",
]

// Placeholder photos from a public API
const FEMALE_PHOTOS = Array.from({length:30}, (_, i) => `https://randomuser.me/api/portraits/women/${i+1}.jpg`)
const MALE_PHOTOS = Array.from({length:30}, (_, i) => `https://randomuser.me/api/portraits/men/${i+1}.jpg`)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count = 10, gender = '0' } = await req.json()
  const createCount = Math.min(parseInt(count) || 10, 100)

  const config = await prisma.config.findFirst().catch(() => null)
  const hashedPass = await bcrypt.hash('testuser123', 10)
  const now = Math.floor(Date.now() / 1000)
  let created = 0

  for (let i = 0; i < createCount; i++) {
    try {
      const isFemale = gender === '0' ? Math.random() > 0.4 : gender === '2'
      const genderNum = isFemale ? 2 : 1
      const names = isFemale ? FEMALE_NAMES : MALE_NAMES
      const bios = isFemale ? BIOS_F : BIOS_M
      const photos = isFemale ? FEMALE_PHOTOS : MALE_PHOTOS

      const firstName = names[Math.floor(Math.random() * names.length)]
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
      const name = `${firstName} ${lastName.charAt(0)}.`
      const age = 22 + Math.floor(Math.random() * 35)
      const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]
      const cities = country === 'United Kingdom' ? CITIES_UK : CITIES_US
      const city = cities[Math.floor(Math.random() * cities.length)]
      const bio = bios[Math.floor(Math.random() * bios.length)]
      const photo = photos[Math.floor(Math.random() * photos.length)]
      const email = `${firstName.toLowerCase()}${Math.floor(Math.random() * 99999)}@ymail.com`
      const username = `${firstName.toLowerCase()}${Math.floor(Math.random() * 9999)}`

      await prisma.user.create({
        data: {
          name, email, password: hashedPass, pass: hashedPass,
          age, birthday: `January 1, ${new Date().getFullYear() - age}`,
          city, country, gender: genderNum,
          looking: isFemale ? 1 : 2,
          photo, photoThumb: photo,
          verified: Math.random() > 0.3 ? 1 : 0,
          premium: Math.random() > 0.7 ? 1 : 0,
          fake: 1,
          credits: 2000,
          bio,
          joinDate: new Date().toLocaleDateString(),
          joinDateTime: String(now - Math.floor(Math.random() * 30 * 86400)),
          lastAccess: String(now - Math.floor(Math.random() * 3 * 86400)),
          lat: (30 + Math.random() * 15).toFixed(6),
          lng: (-120 + Math.random() * 100).toFixed(6),
          username,
          popular: Math.random() > 0.7 ? 1 : 0,
        },
      })
      created++
    } catch (err) {
      // Skip duplicates
    }
  }

  return NextResponse.json({ success: true, created })
}
