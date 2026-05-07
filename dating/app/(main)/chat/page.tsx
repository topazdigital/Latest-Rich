import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ChatList from '@/components/chat/ChatList'

export default async function ChatPage() {
  const session = await getServerSession(authOptions)
  const userId = parseInt((session?.user as any)?.id)

  const conversations = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT
      CASE WHEN uc.u1 = ${userId} THEN uc.u2 ELSE uc.u1 END as otherId,
      uc.lastMessage,
      (SELECT message FROM chat WHERE (u1=${userId} AND u2=otherId) OR (u1=otherId AND u2=${userId}) ORDER BY time DESC LIMIT 1) as lastMsg,
      (SELECT time FROM chat WHERE (u1=${userId} AND u2=otherId) OR (u1=otherId AND u2=${userId}) ORDER BY time DESC LIMIT 1) as lastTime,
      (SELECT COUNT(*) FROM chat WHERE u2=${userId} AND u1=otherId AND read=0) as unread,
      u.name, u.photo, u.photoThumb, u.verified, u.premium, u.lastAccess
    FROM users_chat uc
    JOIN users u ON u.id = CASE WHEN uc.u1=${userId} THEN uc.u2 ELSE uc.u1 END
    WHERE uc.u1=${userId} OR uc.u2=${userId}
    ORDER BY lastTime DESC
    LIMIT 50
  `.catch(() => [])

  return <ChatList userId={userId} conversations={conversations} />
}
