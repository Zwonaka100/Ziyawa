import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin-auth'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { emailWrapper } from '@/lib/email-templates'

// Email configuration for @ziyawa.com addresses
const EMAIL_CONFIG = {
  support: {
    from: 'Ziyawa Support <support@ziyawa.com>',
    replyTo: 'support@ziyawa.com',
  },
  info: {
    from: 'Ziyawa <info@ziyawa.com>',
    replyTo: 'info@ziyawa.com',
  },
  accounts: {
    from: 'Ziyawa Accounts <accounts@ziyawa.com>',
    replyTo: 'accounts@ziyawa.com',
  },
  noreply: {
    from: 'Ziyawa <noreply@ziyawa.com>',
    replyTo: 'support@ziyawa.com',
  },
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const gate = await requireAdminApi()
    if ('response' in gate) return gate.response
    const { admin } = gate
    const user = { id: admin.userId }

    // Only super_admin and admin can send bulk emails
    if (!['super_admin', 'admin'].includes(admin.adminRole || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Test mode sends the preview to the admin's own inbox, so there has to be
    // one. Better to say so than to hand a null address to the mail provider.
    if (!admin.email) {
      return NextResponse.json(
        { error: 'Your admin account has no email address on file' },
        { status: 400 }
      )
    }

    const { subject, body, fromEmail = 'info', testMode, recipients } = await request.json()

    // Get email config
    const emailConfig = EMAIL_CONFIG[fromEmail as keyof typeof EMAIL_CONFIG] || EMAIL_CONFIG.info

    // If test mode, only send to the admin
    if (testMode) {
      const emailResult = await sendEmail({
        from: emailConfig.from,
        replyTo: emailConfig.replyTo,
        to: admin.email,
        subject: `[TEST] ${subject}`,
        html: emailWrapper(`
          <h1>Test email preview</h1>
          <p>This is a test preview of your bulk communication before sending to recipients.</p>
          <div class="note-box">
            <p style="margin: 0;"><strong>TEST MODE:</strong> This was only sent to your admin inbox.</p>
          </div>
          <div class="message-box">
            ${body.replace(/\{\{name\}\}/g, 'Test User').replace(/\n/g, '<br>')}
          </div>
          <p style="font-size: 14px; color: #6b7280;">Replies go to ${emailConfig.replyTo}.</p>
        `),
        tags: [{ name: 'category', value: 'admin-bulk-test' }],
      })

      if (!emailResult.success) throw new Error(emailResult.error || 'Failed to send test email')

      return NextResponse.json({ success: true, count: 1 })
    }

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
    }

    // Send emails in batches (Resend has rate limits)
    const BATCH_SIZE = 50
    let sentCount = 0
    const failedEmails: string[] = []

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      
      for (const recipient of batch) {
        const firstName = recipient.name?.split(' ')[0] || 'there'
        const personalizedBody = body.replace(/\{\{name\}\}/g, firstName)

        try {
          const emailResult = await sendEmail({
            from: emailConfig.from,
            replyTo: emailConfig.replyTo,
            to: recipient.email,
            subject,
            html: emailWrapper(`
              <h1>${subject}</h1>
              <div class="message-box">
                ${personalizedBody.replace(/\n/g, '<br>')}
              </div>
              <p style="font-size: 14px; color: #6b7280;">This email was sent from Ziyawa. Replies go to ${emailConfig.replyTo}.</p>
            `),
            tags: [{ name: 'category', value: 'admin-bulk' }],
          })

          if (emailResult.success) {
            sentCount++
          } else {
            failedEmails.push(recipient.email)
            console.error(`Failed to send to ${recipient.email}:`, emailResult.error)
          }
        } catch (e) {
          failedEmails.push(recipient.email)
          console.error(`Failed to send to ${recipient.email}:`, e)
        }
      }

      // Small delay between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Log the bulk email
    await supabase.from('email_logs').insert({
      sender_id: user.id,
      recipient_ids: recipients.map((r: { id: string }) => r.id),
      recipient_emails: recipients.map((r: { email: string }) => r.email),
      subject,
      body,
      email_type: 'bulk',
      status: 'sent',
    })

    // Log admin action
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: `Sent bulk email to ${sentCount} users`,
      action_type: 'bulk_email_send',
      details: { subject, from: fromEmail, total: recipients.length, sent: sentCount, failed: failedEmails.length },
    })

    return NextResponse.json({ success: true, count: sentCount, failed: failedEmails.length })
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}
