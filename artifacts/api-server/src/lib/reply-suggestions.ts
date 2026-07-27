/**
 * Rule-based reply suggestion engine for the moderator fake-user chat.
 * Analyses the real user's last message + recent context and returns
 * 3 contextually appropriate responses the moderator can click to use.
 */

interface Message {
  u1: number
  u2: number
  message: string
  time: number
}

interface SuggestionContext {
  lastRealMessage: string       // what the real user just said
  recentMessages: Message[]     // last ~6 messages for context
  fakeUserId: number
  fakeName: string
  realName: string
}

// ── Pattern banks ─────────────────────────────────────────────────────────────

const GREETINGS = [
  "Hey you! I was just thinking about you 😊",
  "Hey {real}! Perfect timing, I was hoping you'd message me 💫",
  "Hiii! So glad you reached out, I've been looking forward to this 😄",
  "Hey! You have no idea how happy I am to see your message 😍",
  "Oh hey! I literally smiled when I saw your name pop up 😊",
]

const HOW_ARE_YOU = [
  "I'm doing amazing now that I'm talking to you! How about yourself? 😊",
  "Better now 😊 Honestly, my day just got a lot more interesting. How are you?",
  "Can't complain! But more importantly, how are YOU doing?",
  "Great! Just been a bit busy but always happy to take a break for you 😄 What about you?",
  "Honestly? I've been thinking about you, so pretty great 💕 How's your day going?",
]

const COMPLIMENT_RECEIVED = [
  "Aww that's so sweet of you to say! You're making me blush 😊",
  "You're too kind! Though I have to say, you're not so bad yourself 😉",
  "Stop it, you're going to make me smile all day 😄",
  "That's honestly so sweet 💕 You always know what to say",
  "Haha thank you! I wasn't expecting that but I love it 😍",
]

const WHAT_ARE_YOU_DOING = [
  "Just relaxing and thinking about what kind of trouble we could get into together 😏",
  "Not much, just wishing I had better company right now 😊 What about you?",
  "Honestly? Daydreaming a little… don't judge me 😄 What are YOU up to?",
  "Just finished up some things, now I have all the time in the world. What's on your mind?",
  "Nothing exciting yet — but talking to you always changes that 😉",
]

const WHERE_ARE_YOU = [
  "I'm in {city} right now! Have you ever been here? 😊",
  "Just at home chilling. Where are you right now?",
  "I'm around! Not too far from you actually 😉 Why, are you trying to find me?",
  "Let's just say I'm closer than you think 😏 Why do you ask?",
  "Currently nowhere interesting… until you give me a reason to go somewhere 😄",
]

const MEETING_UP = [
  "I'd love that! 😍 When do you have time? I'm pretty flexible",
  "Ooh are you asking me out? Because yes, a thousand times yes 😄",
  "I've been hoping you'd bring this up! Let's make it happen 💕",
  "That sounds amazing honestly. Where were you thinking?",
  "I'm so in! Just tell me when and where 😊",
]

const WHAT_DO_YOU_LOOK_LIKE = [
  "You've seen my photos! But I'd say I'm even better in person 😄",
  "Well you've seen my pictures… what do you think? 😊 I'm curious",
  "Let's just say what you see is what you get — hopefully that's a good thing? 😉",
  "Haha! Check my profile 😄 But tell me, what do YOU look like when you smile?",
]

const WHAT_DO_YOU_DO = [
  "I keep myself pretty busy! I'm really into [fitness/travel/music] lately. You?",
  "Honestly a bit of everything 😄 But I'm most passionate about [my work/adventures/creativity]. What about you?",
  "I love staying active and exploring new things! What about you, what do you do?",
  "A little of this, a little of that 😄 But enough about me — tell me something interesting about you!",
]

const AGE_QUESTION = [
  "Old enough to know what I want, young enough to still chase it 😉 Why do you ask?",
  "Haha, you'll have to check my profile for that one! 😄 Does age matter much to you?",
  "I'm exactly the right age for you 😊 What makes you ask?",
]

const RELATIONSHIP_STATUS = [
  "Very much single and ready to change that 😊 What about you?",
  "Currently focused on meeting the right person… which is why I'm here! 😄",
  "Single! And honestly loving getting to know interesting people like you 💕",
]

const LOVE_ROMANCE = [
  "I believe in real connections over everything 💕 The kind that just feel right, you know?",
  "I'm a romantic at heart honestly 😊 I love the little gestures more than grand ones",
  "I think love should feel effortless — like talking to someone you've known forever 💫",
  "I'm looking for something real, not just something convenient 😊",
]

const FUNNY_JOKE = [
  "Hahaha okay you got me, that was actually funny 😄",
  "LOL okay I didn't see that coming 😂 You're hilarious",
  "Haha stop it! 😄 You're making me laugh way too hard at my phone right now",
  "Okay you're officially funny, adding that to the list of things I like about you 😊",
]

const COMPLIMENT_GIVING = [
  "You're so sweet 😊 And I think you're pretty amazing too, just so you know",
  "Aww thank you! That actually made my day 💕",
  "I love that you said that 😍 The feeling is completely mutual",
  "You're so kind! I was just thinking something similar about you honestly 😄",
]

const MISS_YOU = [
  "Aww I've been thinking about you too 💕 It's nice to know the feeling is mutual",
  "That's honestly really sweet to hear 😊 You've been on my mind too",
  "I love that! It makes me happy knowing I crossed your mind 💫",
  "You're so sweet 😍 I miss talking to you when we go a while without chatting",
]

const INTERESTED_IN_YOU = [
  "I'm really enjoying getting to know you too 😊 There's something different about you",
  "Honestly? You've been on my mind more than I expected 💕",
  "I feel the same way! You're easy to talk to which I appreciate a lot 😄",
  "You seem like exactly the kind of person I've been hoping to meet 💫",
]

const SHORT_REPLY = [
  "Haha! 😄 Tell me more though, I want to hear everything",
  "Really? 😊 I want to know more about that — go on!",
  "Okay now you've got me curious 👀 Don't leave me hanging!",
  "That's interesting! What made you think of that? 😊",
  "I love that! 💕 What else is on your mind?",
]

const QUESTION_ABOUT_FAKE = [
  "I'm an open book! What do you want to know? 😊",
  "Haha ask away! I love getting to know people through questions 😄",
  "Ooh questions! I love this game — ask me anything 😊",
  "Sure! But fair warning, I might ask some right back 😉",
]

const GOOD_NIGHT = [
  "Goodnight! 😊 Sweet dreams — hope I'm in them 😄",
  "Night! Get some rest 💕 Talk tomorrow?",
  "Goodnight you! Don't stay up too late 😄",
  "Sleep well! And yes, I'll be here when you wake up 😊",
]

const GOOD_MORNING = [
  "Good morning! ☀️ How did you sleep?",
  "Morning! 😊 Starting my day right seeing your message",
  "Good morning! Hope you have an amazing day 💫",
  "Morning! Already thinking about you and the day just started 😄",
]

const FALLBACKS = [
  "Haha that's really interesting! Tell me more 😊",
  "I love how you think 💕 What else is on your mind?",
  "You're making me smile over here 😄 Keep going",
  "That's honestly so [true/funny/sweet] 😊 I feel like we just get each other",
  "You always know how to keep the conversation interesting 💫",
  "I was literally just thinking about something like that! 😊",
  "I love that about you — you're so [genuine/funny/thoughtful] 😄",
  "Okay you're officially my favorite person to talk to 💕",
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr: string[], count = 3, realName = "", fakeName = ""): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length)).map(s =>
    s.replace(/{real}/g, realName).replace(/{fake}/g, fakeName).replace(/{city}/g, "Nairobi")
  )
}

function contains(text: string, ...terms: string[]): boolean {
  const lower = text.toLowerCase()
  return terms.some(t => lower.includes(t))
}

function looksLikeGreeting(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  return /^(hi|hey|hello|heyy|heyyy|hii|hiii|sup|what'?s up|yo)\b/.test(trimmed)
}

function isShort(text: string): boolean {
  return text.trim().split(/\s+/).length <= 4
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateReplySuggestions(ctx: SuggestionContext): string[] {
  const raw = ctx.lastRealMessage.trim()
  const lower = raw.toLowerCase()
  const { realName, fakeName } = ctx

  // Greeting
  if (looksLikeGreeting(raw)) return pick(GREETINGS, 3, realName, fakeName)

  // Good morning / night
  if (contains(lower, "good morning", "gm", "morning")) return pick(GOOD_MORNING, 3, realName, fakeName)
  if (contains(lower, "good night", "goodnight", "gn", "sleep well", "sweet dreams")) return pick(GOOD_NIGHT, 3, realName, fakeName)

  // How are you
  if (contains(lower, "how are you", "how r u", "how are u", "hows life", "how's life", "you good", "u good", "how've you been", "how have you been")) {
    return pick(HOW_ARE_YOU, 3, realName, fakeName)
  }

  // Miss you / been thinking about you
  if (contains(lower, "miss you", "miss u", "been thinking", "thought about you", "can't stop thinking")) {
    return pick(MISS_YOU, 3, realName, fakeName)
  }

  // Compliment received (directed at fake)
  if (contains(lower, "you're beautiful", "you're gorgeous", "you're hot", "you're cute", "you're pretty", "you're stunning", "you look amazing", "you're so pretty", "you're amazing", "you're perfect")) {
    return pick(COMPLIMENT_RECEIVED, 3, realName, fakeName)
  }

  // Giving compliment back
  if (contains(lower, "i like you", "i love you", "you mean", "you're special", "you're different", "something about you")) {
    return pick(INTERESTED_IN_YOU, 3, realName, fakeName)
  }

  // What are you doing
  if (contains(lower, "what are you doing", "what you doing", "what u doing", "what r u doing", "watchu doing", "wyd", "what's up", "whats up")) {
    return pick(WHAT_ARE_YOU_DOING, 3, realName, fakeName)
  }

  // Where are you / location
  if (contains(lower, "where are you", "where r u", "where u at", "where do you live", "what city", "which city", "your location")) {
    return pick(WHERE_ARE_YOU, 3, realName, fakeName)
  }

  // Meeting up
  if (contains(lower, "meet up", "meet you", "hang out", "hangout", "go out", "date", "coffee", "dinner", "come over", "link up")) {
    return pick(MEETING_UP, 3, realName, fakeName)
  }

  // What do you look like
  if (contains(lower, "what do you look like", "how do you look", "send photo", "send pic", "more photos", "more pictures", "see you", "your picture")) {
    return pick(WHAT_DO_YOU_LOOK_LIKE, 3, realName, fakeName)
  }

  // What do you do / job / work
  if (contains(lower, "what do you do", "your job", "your work", "do you work", "occupation", "career")) {
    return pick(WHAT_DO_YOU_DO, 3, realName, fakeName)
  }

  // Age
  if (contains(lower, "how old", "your age", "age?", "age is")) {
    return pick(AGE_QUESTION, 3, realName, fakeName)
  }

  // Relationship status
  if (contains(lower, "single", "boyfriend", "girlfriend", "relationship", "married", "taken", "dating anyone")) {
    return pick(RELATIONSHIP_STATUS, 3, realName, fakeName)
  }

  // Love / romance
  if (contains(lower, "love", "romance", "relationship goals", "soulmate", "partner", "forever", "feelings")) {
    return pick(LOVE_ROMANCE, 3, realName, fakeName)
  }

  // Funny / jokes
  if (contains(lower, "lol", "haha", "😂", "🤣", "funny", "joke", "laughing", "lmao")) {
    return pick(FUNNY_JOKE, 3, realName, fakeName)
  }

  // Questions directed at fake user
  if (raw.includes("?") && contains(lower, "you", "your", "yours")) {
    return pick(QUESTION_ABOUT_FAKE, 3, realName, fakeName)
  }

  // Short / one-word reply — keep conversation going
  if (isShort(raw)) return pick(SHORT_REPLY, 3, realName, fakeName)

  // Fallback — generic engaging responses
  return pick(FALLBACKS, 3, realName, fakeName)
}
