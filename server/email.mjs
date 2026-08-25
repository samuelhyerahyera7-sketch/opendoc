import { Resend } from 'resend'

// Without RESEND_API_KEY set, emails are logged instead of sent — local dev
// and any deployment that hasn't configured email yet still work, but
// callers get back { sent: false } so the UI never claims to have emailed
// someone when it didn't.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM || 'OpenDoc <onboarding@resend.dev>'

// Always the real domain, regardless of which environment sent the email —
// a recipient's mail client fetches this image from the public internet,
// so it must never resolve to a dev-only APP_URL like localhost.
const LOGO_URL = 'https://opendoc.co.za/logo-email.png'

function wrapEmail(bodyHtml) {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="padding: 24px 0 16px;">
        <img src="${LOGO_URL}" alt="OpenDoc" height="32" style="height: 32px; width: auto; display: block;" />
      </div>
      <div style="color: #232733; font-size: 15px; line-height: 1.6;">
        ${bodyHtml}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eceef1; color: #8692a6; font-size: 12px;">
        OpenDoc &middot; Find doctors who take your medical aid
      </div>
    </div>
  `
}

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
    html: wrapEmail(`
      <p>Hi ${patientFirstName},</p>
      <p>Your appointment with <strong>${doctorName}</strong> is confirmed for <strong>${day} at ${time}</strong>.</p>
      <p>${address || ''}</p>
    `),
  }
}

export function newBookingAlertEmail({ doctorFirstName, patientName, day, time, reason }) {
  return {
    subject: `New booking: ${patientName} — ${day} at ${time}`,
    html: wrapEmail(`
      <p>Hi Dr. ${doctorFirstName},</p>
      <p><strong>${patientName}</strong> just booked an appointment with you for <strong>${day} at ${time}</strong>.</p>
      ${reason ? `<p>Reason given: ${reason}</p>` : ''}
      <p>See it in your OpenDoc dashboard.</p>
    `),
  }
}

export function verifyEmailMessage({ name, verifyUrl }) {
  return {
    subject: 'Verify your OpenDoc email',
    html: wrapEmail(`
      <p>Hi ${name},</p>
      <p>Please confirm your email address to finish setting up your OpenDoc account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `),
  }
}

export function resetPasswordEmail({ name, resetUrl }) {
  return {
    subject: 'Reset your OpenDoc password',
    html: wrapEmail(`
      <p>Hi ${name},</p>
      <p>We received a request to reset your OpenDoc password. If this was you, click below — this link expires in 1 hour:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `),
  }
}

export function appointmentCancelledEmail({ recipientName, doctorName, patientName, day, time, cancelledByDoctor }) {
  return {
    subject: `Appointment cancelled — ${day} at ${time}`,
    html: wrapEmail(`
      <p>Hi ${recipientName},</p>
      <p>
        ${cancelledByDoctor
          ? `<strong>${doctorName}</strong> has cancelled the appointment with ${patientName} scheduled for`
          : `The appointment with <strong>${doctorName}</strong> scheduled for`}
        <strong> ${day} at ${time}</strong> has been cancelled.
      </p>
    `),
  }
}

export function appointmentRescheduledEmail({ recipientName, doctorName, patientName, oldDay, oldTime, newDay, newTime, rescheduledByDoctor }) {
  return {
    subject: `Appointment rescheduled — now ${newDay} at ${newTime}`,
    html: wrapEmail(`
      <p>Hi ${recipientName},</p>
      <p>
        ${rescheduledByDoctor ? `<strong>${doctorName}</strong> has moved` : 'The appointment with'}
        ${rescheduledByDoctor ? ` the appointment with ${patientName}` : ` <strong>${doctorName}</strong> has been moved`}
        from <strong>${oldDay} at ${oldTime}</strong> to <strong>${newDay} at ${newTime}</strong>.
      </p>
    `),
  }
}
