import { Resend } from 'resend'

// Without RESEND_API_KEY set, emails are logged instead of sent — local dev
// and any deployment that hasn't configured email yet still work, but
// callers get back { sent: false } so the UI never claims to have emailed
// someone when it didn't.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'OpenDoc <onboarding@resend.dev>'

export async function sendEmail({ to, subject, html }) {
  if (!resend) {
    console.log(`[email:unconfigured] Would send "${subject}" to ${to}. Set RESEND_API_KEY to actually send email.`)
    return { sent: false }
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
    return { sent: true }
  } catch (err) {
    console.error('Email send failed:', err)
    return { sent: false }
  }
}

export function appointmentConfirmationEmail({ patientFirstName, doctorName, day, time, address }) {
  return {
    subject: `Your appointment with ${doctorName} is confirmed`,
    html: `
      <p>Hi ${patientFirstName},</p>
      <p>Your appointment with <strong>${doctorName}</strong> is confirmed for <strong>${day} at ${time}</strong>.</p>
      <p>${address || ''}</p>
      <p>— OpenDoc</p>
    `,
  }
}

export function newBookingAlertEmail({ doctorFirstName, patientName, day, time, reason }) {
  return {
    subject: `New booking: ${patientName} — ${day} at ${time}`,
    html: `
      <p>Hi Dr. ${doctorFirstName},</p>
      <p><strong>${patientName}</strong> just booked an appointment with you for <strong>${day} at ${time}</strong>.</p>
      ${reason ? `<p>Reason given: ${reason}</p>` : ''}
      <p>See it in your OpenDoc dashboard.</p>
    `,
  }
}

export function verifyEmailMessage({ name, verifyUrl }) {
  return {
    subject: 'Verify your OpenDoc provider email',
    html: `
      <p>Hi ${name},</p>
      <p>Please confirm your email address to finish setting up your OpenDoc provider account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  }
}

export function resetPasswordEmail({ name, resetUrl }) {
  return {
    subject: 'Reset your OpenDoc password',
    html: `
      <p>Hi ${name},</p>
      <p>We received a request to reset your OpenDoc provider password. If this was you, click below — this link expires in 1 hour:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  }
}
