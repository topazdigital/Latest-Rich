import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.SMTP_USER) {
    console.log(`[Email skipped - no SMTP] To: ${to}, Subject: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({
      from: `"Rich Dating Network" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
  } catch (err) {
    console.error('Email error:', err)
  }
}

export function verifyEmailTemplate(name: string, link: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
  <div style="background:white;border-radius:12px;padding:40px;text-align:center">
    <h1 style="color:#FF192C;margin-bottom:8px">Rich Dating Network</h1>
    <h2 style="color:#333">Verify Your Email</h2>
    <p style="color:#666">Hi ${name}, please click below to verify your email address.</p>
    <a href="${link}" style="display:inline-block;background:#FF192C;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">Verify Email</a>
    <p style="color:#999;font-size:12px">This link expires in 24 hours.</p>
  </div>
</body>
</html>`
}

export function welcomeEmailTemplate(name: string, siteUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
  <div style="background:white;border-radius:12px;padding:40px;text-align:center">
    <h1 style="color:#FF192C">Welcome to Rich Dating Network!</h1>
    <p style="color:#666">Hi ${name}, your account is ready. Start meeting amazing people today!</p>
    <a href="${siteUrl}" style="display:inline-block;background:#FF192C;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">Start Dating</a>
  </div>
</body>
</html>`
}

export function newMessageTemplate(fromName: string, preview: string, chatLink: string) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;padding:20px">
  <div style="background:white;border-radius:12px;padding:40px;text-align:center">
    <h1 style="color:#FF192C">New Message!</h1>
    <p style="color:#666"><strong>${fromName}</strong> sent you a message: "${preview}"</p>
    <a href="${chatLink}" style="display:inline-block;background:#FF192C;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0">Reply Now</a>
  </div>
</body>
</html>`
}
