import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { from, fromPassword, to, cc, bcc, subject, html } = await req.json()

    if (!from || !fromPassword || !to || !subject) {
      return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '109.199.104.22',
      port: 465,
      secure: true,
      auth: { user: from, pass: fromPassword },
      tls: { rejectUnauthorized: false }
    })

    const info = await transporter.sendMail({
      from, to, cc, bcc, subject,
      html: html || '',
    })

    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
