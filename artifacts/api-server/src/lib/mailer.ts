import { db } from "@workspace/db"
import { siteConfigTable } from "@workspace/db/schema"
import { eq } from "drizzle-orm"

async function getConfig(key: string): Promise<string> {
  try {
    const rows = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).limit(1)
    return rows[0]?.value || ""
  } catch { return "" }
}

export interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(opts: MailOptions): Promise<boolean> {
  try {
    const smtpHost = process.env.SMTP_HOST || await getConfig("smtp_host")
    const smtpPort = parseInt(process.env.SMTP_PORT || await getConfig("smtp_port") || "587")
    const smtpUser = process.env.SMTP_USER || await getConfig("smtp_user")
    const smtpPass = process.env.SMTP_PASS || await getConfig("smtp_pass")
    const smtpFrom = process.env.SMTP_FROM || await getConfig("smtp_from") || "noreply@richdatingnetwork.com"
    const smtpFromName = process.env.SMTP_FROM_NAME || await getConfig("smtp_from_name") || await getConfig("site_name") || "Rich Dating Network"
    const smtpSecure = (process.env.SMTP_SECURE || await getConfig("smtp_secure")) === "1"

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("[Mailer] SMTP not configured — skipping email to:", opts.to)
      return false
    }

    const nodemailer = await import("nodemailer")
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${smtpFromName}" <${smtpFrom}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
    })

    return true
  } catch (err) {
    console.error("[Mailer] Failed to send email:", err)
    return false
  }
}

export async function sendPasswordResetEmail(to: string, name: string, token: string, siteUrl: string): Promise<boolean> {
  const siteName = await getConfig("site_name") || "Rich Dating Network"
  const resetUrl = `${siteUrl}/reset-password?token=${token}`
  return sendEmail({
    to,
    subject: `Reset your password — ${siteName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:40px 40px 30px;text-align:center">
<div style="font-size:36px">🔐</div>
<h1 style="color:#ffffff;font-size:24px;margin:12px 0 4px;font-weight:800">Reset Your Password</h1>
<p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0">${siteName}</p>
</td></tr>
<tr><td style="padding:40px">
<p style="color:#333;font-size:16px;margin:0 0 8px">Hi <strong>${name}</strong>,</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">We received a request to reset your password. Click the button below to create a new one. This link is valid for <strong>1 hour</strong>.</p>
<div style="text-align:center;margin:32px 0">
<a href="${resetUrl}" style="background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;display:inline-block">Reset My Password</a>
</div>
<p style="color:#888;font-size:13px;line-height:1.6">If the button doesn't work, copy and paste this link:<br><a href="${resetUrl}" style="color:#FF192C;word-break:break-all">${resetUrl}</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
<p style="color:#aaa;font-size:12px;line-height:1.6;margin:0">If you didn't request this, you can safely ignore this email. Your password will not change.<br><br>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  })
}

export async function sendVerificationEmail(to: string, name: string, token: string, siteUrl: string): Promise<boolean> {
  const siteName = await getConfig("site_name") || "Rich Dating Network"
  const verifyUrl = `${siteUrl}/verify-email?token=${token}`
  return sendEmail({
    to,
    subject: `Verify your email — ${siteName}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:40px 40px 30px;text-align:center">
<div style="font-size:36px">✉️</div>
<h1 style="color:#ffffff;font-size:24px;margin:12px 0 4px;font-weight:800">Verify Your Email</h1>
<p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0">${siteName}</p>
</td></tr>
<tr><td style="padding:40px">
<p style="color:#333;font-size:16px;margin:0 0 8px">Welcome, <strong>${name}</strong>! 🎉</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">You're just one step away from finding your perfect match. Please verify your email address to activate your account.</p>
<div style="text-align:center;margin:32px 0">
<a href="${verifyUrl}" style="background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:50px;font-size:16px;font-weight:700;display:inline-block">Verify My Email</a>
</div>
<p style="color:#888;font-size:13px;line-height:1.6">If the button doesn't work, copy and paste this link:<br><a href="${verifyUrl}" style="color:#FF192C;word-break:break-all">${verifyUrl}</a></p>
<hr style="border:none;border-top:1px solid #eee;margin:32px 0">
<p style="color:#aaa;font-size:12px;line-height:1.6;margin:0">This link expires in 24 hours. If you didn't sign up, please ignore this email.<br><br>© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  })
}

export async function sendNewMessageEmail(to: string, recipientName: string, senderName: string, preview: string, siteUrl: string): Promise<boolean> {
  const siteName = await getConfig("site_name") || "Rich Dating Network"
  return sendEmail({
    to,
    subject: `💬 ${senderName} sent you a message — ${siteName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:30px 40px;text-align:center">
<h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800">💬 New Message</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="color:#333;font-size:15px;margin:0 0 16px">Hi <strong>${recipientName}</strong>,</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px"><strong>${senderName}</strong> sent you a message on ${siteName}:</p>
<div style="background:#f8f8f8;border-left:4px solid #FF192C;border-radius:8px;padding:16px 20px;margin:0 0 24px">
<p style="color:#333;font-size:14px;font-style:italic;margin:0">"${preview.slice(0, 200)}${preview.length > 200 ? '...' : ''}"</p>
</div>
<div style="text-align:center">
<a href="${siteUrl}/chat" style="background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;display:inline-block">Reply Now</a>
</div>
<hr style="border:none;border-top:1px solid #eee;margin:28px 0">
<p style="color:#aaa;font-size:12px;text-align:center;margin:0">© ${new Date().getFullYear()} ${siteName}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  })
}

export async function sendLikeEmail(to: string, recipientName: string, likerName: string, isSuperlike: boolean, siteUrl: string): Promise<boolean> {
  const siteName = await getConfig("site_name") || "Rich Dating Network"
  const emoji = isSuperlike ? "⭐" : "❤️"
  const action = isSuperlike ? "super liked" : "liked"
  return sendEmail({
    to,
    subject: `${emoji} ${likerName} ${action} your profile — ${siteName}`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:30px 40px;text-align:center">
<div style="font-size:48px;margin-bottom:8px">${emoji}</div>
<h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800">Someone ${action} you!</h1>
</td></tr>
<tr><td style="padding:32px 40px;text-align:center">
<p style="color:#333;font-size:16px;margin:0 0 8px">Hi <strong>${recipientName}</strong>,</p>
<p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 28px"><strong>${likerName}</strong> ${action} your profile on ${siteName}. Don't keep them waiting!</p>
<a href="${siteUrl}/likes" style="background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:50px;font-size:15px;font-weight:700;display:inline-block">View Profile</a>
<hr style="border:none;border-top:1px solid #eee;margin:28px 0">
<p style="color:#aaa;font-size:12px;margin:0">© ${new Date().getFullYear()} ${siteName}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  })
}
