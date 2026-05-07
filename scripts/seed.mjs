import pg from 'pg'
import crypto from 'crypto'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function now() { return Math.floor(Date.now() / 1000) }
function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw + 'salt_rdn_2024').digest('hex')
}

const fakeUsers = [
  { name: 'Sophia Laurent', email: 'sophia@rdn.fake', gender: 2, age: 28, city: 'Paris', country: 'France', bio: 'Art lover and world traveler. Looking for someone to share adventures with. I run a boutique gallery in the heart of Paris.', occupation: 'Gallery Owner', education: 'École des Beaux-Arts', height: "5'7\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/1.jpg' },
  { name: 'James Whitmore', email: 'james@rdn.fake', gender: 1, age: 35, city: 'London', country: 'UK', bio: 'Entrepreneur and finance professional. Love sailing, fine dining, and jazz. Looking for a genuine connection.', occupation: 'Investment Banker', education: 'Oxford University', height: "6'1\"", bodyType: 'Athletic', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/men/2.jpg' },
  { name: 'Isabella Chen', email: 'isabella@rdn.fake', gender: 2, age: 31, city: 'Hong Kong', country: 'Hong Kong', bio: 'Tech entrepreneur and amateur chef. Passionate about innovation and good food. Fluent in Mandarin, English and French.', occupation: 'Startup Founder', education: 'Harvard Business School', height: "5'5\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/3.jpg' },
  { name: 'Alexander Novak', email: 'alex@rdn.fake', gender: 1, age: 40, city: 'New York', country: 'USA', bio: 'Real estate developer with a passion for architecture and modern art. Weekend pilot. Looking for someone who appreciates the finer things.', occupation: 'Real Estate Developer', education: 'Columbia University', height: "6'2\"", bodyType: 'Athletic', premium: 1, photo: 'https://randomuser.me/api/portraits/men/4.jpg' },
  { name: 'Victoria Rose', email: 'victoria@rdn.fake', gender: 2, age: 26, city: 'Monaco', country: 'Monaco', bio: 'Former model turned interior designer. Love horses, yachting and travelling in style. Based in Monaco but travel constantly.', occupation: 'Interior Designer', education: 'Parsons School of Design', height: "5'9\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/5.jpg' },
  { name: 'Marcus Sterling', email: 'marcus@rdn.fake', gender: 1, age: 44, city: 'Dubai', country: 'UAE', bio: 'CEO of a hospitality group. Love travel, sports cars and philanthropy. Looking for a genuine partner to share life\'s adventures.', occupation: 'CEO', education: 'INSEAD', height: "6'0\"", bodyType: 'Athletic', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/men/6.jpg' },
  { name: 'Natalia Petrov', email: 'natalia@rdn.fake', gender: 2, age: 29, city: 'Geneva', country: 'Switzerland', bio: 'International lawyer specializing in human rights. Polyglot — speak 5 languages. Passionate about justice and fine wine.', occupation: 'Lawyer', education: 'Sciences Po Paris', height: "5'6\"", bodyType: 'Slim', premium: 1, photo: 'https://randomuser.me/api/portraits/women/7.jpg' },
  { name: 'Oliver Hartmann', email: 'oliver@rdn.fake', gender: 1, age: 38, city: 'Berlin', country: 'Germany', bio: 'Surgeon and classical pianist. Enjoy long walks, museum visits and cooking for friends. Looking for depth over superficiality.', occupation: 'Cardiac Surgeon', education: 'Charité – Berlin', height: "6'0\"", bodyType: 'Slim', premium: 0, photo: 'https://randomuser.me/api/portraits/men/8.jpg' },
  { name: 'Camille Dubois', email: 'camille@rdn.fake', gender: 2, age: 33, city: 'Cannes', country: 'France', bio: 'Film producer and fashion aficionado. Between Cannes, Milan and NYC. Looking for a man who values sophistication and spontaneity.', occupation: 'Film Producer', education: 'ESEC Paris', height: "5'8\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/9.jpg' },
  { name: 'Ryan Ashford', email: 'ryan@rdn.fake', gender: 1, age: 32, city: 'Sydney', country: 'Australia', bio: 'Venture capitalist with a love for surfing and tech. Founded three successful startups. Adventure seeker with a serious side.', occupation: 'Venture Capitalist', education: 'University of Melbourne', height: "6'1\"", bodyType: 'Athletic', premium: 0, photo: 'https://randomuser.me/api/portraits/men/10.jpg' },
  { name: 'Elena Vasquez', email: 'elena@rdn.fake', gender: 2, age: 27, city: 'Barcelona', country: 'Spain', bio: 'Architect and yoga instructor. Believe beautiful spaces and a healthy mind go hand in hand. Weekend traveler.', occupation: 'Architect', education: 'ETSAB Barcelona', height: "5'6\"", bodyType: 'Athletic', premium: 0, photo: 'https://randomuser.me/api/portraits/women/11.jpg' },
  { name: 'Sebastian Reyes', email: 'sebastian@rdn.fake', gender: 1, age: 36, city: 'Miami', country: 'USA', bio: 'Art collector and Latin music enthusiast. Run a family-owned real estate empire. Fluent in English, Spanish, Portuguese.', occupation: 'Art Collector', education: 'University of Miami', height: "5'11\"", bodyType: 'Average', premium: 1, photo: 'https://randomuser.me/api/portraits/men/12.jpg' },
  { name: 'Amelia Worth', email: 'amelia@rdn.fake', gender: 2, age: 30, city: 'Singapore', country: 'Singapore', bio: 'Private equity analyst by day, sommelier in training by night. Love exploring Asia and finding hidden culinary gems.', occupation: 'Private Equity', education: 'London School of Economics', height: "5'5\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/13.jpg' },
  { name: 'Ethan Drake', email: 'ethan@rdn.fake', gender: 1, age: 42, city: 'Los Angeles', country: 'USA', bio: 'Film director with two award-winning documentaries. Dog dad, hiking enthusiast and amateur astronomer. Looking for a creative soul.', occupation: 'Film Director', education: 'UCLA Film School', height: "6'0\"", bodyType: 'Average', premium: 0, photo: 'https://randomuser.me/api/portraits/men/14.jpg' },
  { name: 'Diana Moreau', email: 'diana@rdn.fake', gender: 2, age: 34, city: 'Brussels', country: 'Belgium', bio: 'EU diplomat with a passion for global affairs. Love opera, reading and discovering new cuisines. Looking for a cultured partner.', occupation: 'EU Diplomat', education: 'College of Europe', height: "5'7\"", bodyType: 'Average', premium: 1, photo: 'https://randomuser.me/api/portraits/women/15.jpg' },
  { name: 'Noah Blackwell', email: 'noah@rdn.fake', gender: 1, age: 29, city: 'Toronto', country: 'Canada', bio: 'Neuroscientist and avid skier. Believe in work-life balance and meaningful connections. Looking for intellectual conversations.', occupation: 'Neuroscientist', education: 'University of Toronto', height: "5'11\"", bodyType: 'Athletic', premium: 0, photo: 'https://randomuser.me/api/portraits/men/16.jpg' },
  { name: 'Priya Sharma', email: 'priya@rdn.fake', gender: 2, age: 28, city: 'Mumbai', country: 'India', bio: 'Fashion designer with boutiques in Mumbai and London. Love Bollywood, meditation and sustainable fashion. Always on the move.', occupation: 'Fashion Designer', education: 'NIFT Mumbai', height: "5'4\"", bodyType: 'Slim', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/women/17.jpg' },
  { name: 'Lucas Fontaine', email: 'lucas@rdn.fake', gender: 1, age: 37, city: 'Lyon', country: 'France', bio: 'Michelin-star chef with restaurants in Paris and Tokyo. Food is my love language. Looking for someone who appreciates culinary art.', occupation: 'Executive Chef', education: 'Le Cordon Bleu', height: "5'10\"", bodyType: 'Average', premium: 0, photo: 'https://randomuser.me/api/portraits/men/18.jpg' },
  { name: 'Zoe Sterling', email: 'zoe@rdn.fake', gender: 2, age: 25, city: 'New York', country: 'USA', bio: 'Broadway actress and voice coach. Passionate about theatre, fitness and brunch. Looking for someone who can match my energy.', occupation: 'Actress', education: 'NYU Tisch School', height: "5'7\"", bodyType: 'Athletic', premium: 1, photo: 'https://randomuser.me/api/portraits/women/19.jpg' },
  { name: 'Christopher Kane', email: 'christopher@rdn.fake', gender: 1, age: 45, city: 'Edinburgh', country: 'UK', bio: 'Whisky distillery owner and golf enthusiast. Scotland is home but I travel the world for business. Old-fashioned values, modern outlook.', occupation: 'Distillery Owner', education: 'University of Edinburgh', height: "6'2\"", bodyType: 'Average', premium: 1, verified: 1, photo: 'https://randomuser.me/api/portraits/men/20.jpg' },
]

const feedPosts = [
  'Just returned from an amazing trip to the Amalfi Coast. The sunsets were absolutely breathtaking! 🌅',
  'Nothing beats a perfectly aged Bordeaux on a rainy evening. What\'s your favorite wine? 🍷',
  'Closed a major deal today — time to celebrate! Heading to my favorite restaurant in Monaco tonight.',
  'Morning yoga on the beach followed by a cold-pressed juice. Starting the day right ✨',
  'Just attended the most incredible private gallery opening in Chelsea. Art is food for the soul.',
  'Spent the weekend skiing in Courchevel. The powder was perfect! Who else loves the mountains? ⛷️',
  'Finally tried truffle pasta at that Michelin star restaurant everyone\'s been talking about. Worth every penny.',
  'My private jet was grounded so I had to fly first class. The horror 😂 Just kidding, it was lovely.',
  'Working from my villa in Ibiza this week. Remote work never looked so beautiful 🌊',
  'Just donated to three different charities today. Success means nothing if you don\'t give back.',
]

async function seed() {
  const client = await pool.connect()
  try {
    console.log('🌱 Starting seed...')

    // Check if already seeded
    const existing = await client.query("SELECT COUNT(*) as count FROM users WHERE fake = 1")
    if (parseInt(existing.rows[0].count) >= 10) {
      console.log('✅ Already seeded, skipping')
      return
    }

    const password = hashPassword('password123')
    const insertedIds = []

    for (const u of fakeUsers) {
      const ts = now() - Math.floor(Math.random() * 86400 * 30)
      const lastAccess = Math.random() > 0.4 
        ? String(now() - Math.floor(Math.random() * 3600)) // online recently
        : String(now() - Math.floor(Math.random() * 86400 * 7)) // offline

      const result = await client.query(
        `INSERT INTO users (name, email, password, photo, photo_thumb, gender, age, city, country, bio, looking, verified, premium, fake, credits, last_access, created, popular)
         VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, 1, $13, $14, $15, $16)
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [
          u.name, u.email, password, u.photo, u.gender, u.age, u.city, u.country, u.bio,
          u.gender === 2 ? 1 : 2, // women look for men, men look for women
          u.verified ? 1 : 0, u.premium ? 1 : 0,
          Math.floor(Math.random() * 500) + 50,
          lastAccess, ts, u.premium ? 1 : 0
        ]
      )
      if (result.rows.length > 0) {
        const userId = result.rows[0].id
        insertedIds.push(userId)

        // Insert extended info
        await client.query(
          `INSERT INTO user_extended (user_id, occupation, education, height, body_type)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [userId, u.occupation || '', u.education || '', u.height || '', u.bodyType || '']
        )
        console.log(`  ✓ Created ${u.name} (id: ${userId})`)
      }
    }

    // Insert feed posts for the fake users
    for (let i = 0; i < insertedIds.length && i < feedPosts.length; i++) {
      await client.query(
        `INSERT INTO feed (user_id, content, likes_count, comments_count, time)
         VALUES ($1, $2, $3, $4, $5)`,
        [insertedIds[i], feedPosts[i], Math.floor(Math.random() * 30), Math.floor(Math.random() * 8), now() - Math.floor(Math.random() * 86400 * 3)]
      )
    }

    // Seed fake message templates if none exist
    const msgCount = await client.query("SELECT COUNT(*) as count FROM fake_message_templates")
    if (parseInt(msgCount.rows[0].count) === 0) {
      const templates = [
        'Hi! Your profile caught my eye. How are you? 😊',
        'Hello! I love your photos. Where was that taken?',
        'Hey there! We seem to have a lot in common. Want to chat?',
        'You have such a beautiful smile! How\'s your day going?',
        'I noticed you\'re from {{city}}. I\'ve always wanted to visit!',
        'Your bio is fascinating. Tell me more about yourself!',
        'Hi! Hope you\'re having a wonderful day 🌟',
        'I love what you wrote about yourself. Very intriguing!',
        'You seem like exactly the kind of person I\'ve been looking for.',
        'Hey! Want to get to know each other better? 😊',
      ]
      for (const msg of templates) {
        await client.query("INSERT INTO fake_message_templates (message, active) VALUES ($1, 1)", [msg])
      }
      console.log('  ✓ Seeded message templates')
    }

    // Seed gifts if none exist
    const giftCount = await client.query("SELECT COUNT(*) as count FROM gifts")
    if (parseInt(giftCount.rows[0].count) === 0) {
      const gifts = [
        ['Red Rose', '🌹', 5], ['Box of Chocolates', '🍫', 10], ['Champagne', '🥂', 20],
        ['Diamond Ring', '💍', 100], ['Teddy Bear', '🧸', 15], ['Heart', '❤️', 5],
        ['Kiss', '💋', 8], ['Luxury Watch', '⌚', 150], ['Yacht', '⛵', 500], ['Private Jet', '✈️', 1000],
      ]
      for (const [name, emoji, credits] of gifts) {
        await client.query("INSERT INTO gifts (name, emoji, credits, active) VALUES ($1, $2, $3, 1)", [name, emoji, credits])
      }
      console.log('  ✓ Seeded gifts')
    }

    console.log(`✅ Seed complete! Created ${insertedIds.length} users.`)
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
