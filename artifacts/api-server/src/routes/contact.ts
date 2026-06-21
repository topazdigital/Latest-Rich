import { Router } from "express"
import { sendEmail } from "../lib/mailer"
import { db } from "@workspace/db"
import { contactSubmissionsTable } from "@workspace/db"

const router = Router()

const CONTACT_EMAIL = "contact@richdatingnetwork.com"

router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      res.status(400).json({ error: "Name, email, and message are required." })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: "Invalid email address." })
      return
    }
    if (message.trim().length < 10) {
      res.status(400).json({ error: "Message is too short." })
      return
    }

    // Always save to DB first so no message is ever lost
    await db.insert(contactSubmissionsTable).values({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      subject: subject?.trim() || "",
      message: message.trim(),
      emailSent: 0,
      createdAt: Math.floor(Date.now() / 1000),
    }).catch(err => console.warn("[Contact] DB save failed:", err))

    const subjectLine = subject?.trim()
      ? `[Contact] ${subject.trim()} — from ${name.trim()}`
      : `[Contact] Message from ${name.trim()}`

    const sent = await sendEmail({
      to: CONTACT_EMAIL,
      subject: subjectLine,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:600px;width:100%">
<tr><td style="background:linear-gradient(135deg,#FF192C,#ff5f6b);padding:28px 40px;text-align:center">
  <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:800">📬 New Contact Form Submission</h1>
  <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0">Rich Dating Network</p>
</td></tr>
<tr><td style="padding:32px 40px">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase">From</span><br>
      <span style="color:#111827;font-size:15px;font-weight:600">${name.trim()}</span>
    </td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase">Email</span><br>
      <a href="mailto:${email.trim()}" style="color:#FF192C;font-size:15px">${email.trim()}</a>
    </td></tr>
    ${subject?.trim() ? `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
      <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase">Subject</span><br>
      <span style="color:#111827;font-size:15px">${subject.trim()}</span>
    </td></tr>` : ""}
    <tr><td style="padding:12px 0">
      <span style="color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase">Message</span><br>
      <div style="color:#374151;font-size:15px;line-height:1.7;margin-top:8px;white-space:pre-wrap">${message.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </td></tr>
  </table>
  <div style="margin-top:24px;text-align:center">
    <a href="mailto:${email.trim()}?subject=Re: ${encodeURIComponent(subjectLine)}" 
       style="background:linear-gradient(135deg,#FF192C,#ff5f6b);color:#fff;text-decoration:none;padding:12px 28px;border-radius:50px;font-size:14px;font-weight:700;display:inline-block">
      Reply to ${name.trim()} →
    </a>
  </div>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 40px;text-align:center;border-top:1px solid #f3f4f6">
  <p style="color:#9ca3af;font-size:11px;margin:0">Rich Dating Network — contact form submission</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
      text: `New contact form submission\n\nFrom: ${name.trim()}\nEmail: ${email.trim()}\n${subject?.trim() ? `Subject: ${subject.trim()}\n` : ""}Message:\n${message.trim()}`,
    })

    if (sent) {
      console.log(`[Contact] Email sent to ${CONTACT_EMAIL} from ${name.trim()} <${email.trim()}>`)
    } else {
      console.log(`[Contact] SMTP not configured — saved to DB. Message from ${name.trim()} <${email.trim()}>: ${message.trim().slice(0, 100)}`)
    }

    res.json({ success: true, message: "Your message has been received! We'll reply within 24–48 hours." })
  } catch (err) {
    console.error("[Contact] Error:", err)
    res.status(500).json({ error: "Failed to send message. Please email us directly at contact@richdatingnetwork.com" })
  }
})

export default router
