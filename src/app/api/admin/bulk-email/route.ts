import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const INFO_FROM_EMAIL = process.env.INFO_FROM_EMAIL || 'Ziyawa <info@zande.io>'
const INFO_REPLY_TO = process.env.INFO_EMAIL || process.env.SUPPORT_EMAIL || 'support@zande.io'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, admin_role, email')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only super_admin and admin can send bulk emails
    if (!['super_admin', 'admin'].includes(profile.admin_role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { subject, body, audience, testMode } = await request.json()

    // If test mode, only send to the admin
    if (testMode) {
      const emailResult = await sendEmail({
        from: INFO_FROM_EMAIL,
        replyTo: INFO_REPLY_TO,
        to: profile.email,
        subject: `[TEST] ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="padding: 10px; background-color: #fef3c7; border: 1px solid #f59e0b; margin-bottom: 20px;">
              <strong>TEST EMAIL</strong> - This is how the email will look to recipients.
            </div>
            <div style="padding: 20px; background-color: #f5f5f5;">
              <h1 style="color: #333; margin: 0;">Ziyawa</h1>
            </div>
            <div style="padding: 20px;">
              ${body.replace(/\{\{name\}\}/g, 'Test User').replace(/\n/g, '<br>')}
            </div>
            <div style="padding: 20px; background-color: #f5f5f5; font-size: 12px; color: #666;">
              <p>This test email was sent from Ziyawa communications. Replies go to ${INFO_REPLY_TO}.</p>
            </div>
          </div>
        `,
        tags: [{ name: 'category', value: 'admin-bulk-test' }],
      })

      if (!emailResult.success) throw new Error(emailResult.error || 'Failed to send test email')

      return NextResponse.json({ success: true, count: 1 })
    }

    // Get recipients based on audience
    let query = supabase.from('profiles').select('id, email, full_name')
    
    if (audience === 'organizers') {
      query = query.eq('is_organizer', true)
    }
    // Add more audience filters as needed

    const { data: recipients } = await query

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    // Send emails in batches (Resend has rate limits)
    const BATCH_SIZE = 50
    let sentCount = 0

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE)
      
      for (const recipient of batch) {
        const firstName = recipient.full_name?.split(' ')[0] || 'there'
        const personalizedBody = body.replace(/\{\{name\}\}/g, firstName)

        try {
          const emailResult = await sendEmail({
            from: INFO_FROM_EMAIL,
            replyTo: INFO_REPLY_TO,
            to: recipient.email,
            subject,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="padding: 20px; background-color: #f5f5f5;">
                  <h1 style="color: #333; margin: 0;">Ziyawa</h1>
                </div>
                <div style="padding: 20px;">
                  ${personalizedBody.replace(/\n/g, '<br>')}
                </div>
                <div style="padding: 20px; background-color: #f5f5f5; font-size: 12px; color: #666;">
                  <p>This email was sent from Ziyawa communications. Replies go to ${INFO_REPLY_TO}.</p>
                </div>
              </div>
            `,
            tags: [{ name: 'category', value: 'admin-bulk' }],
          })

          if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send bulk email')
          }
          sentCount++
        } catch (e) {
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
      recipient_ids: recipients.map(r => r.id),
      recipient_emails: recipients.map(r => r.email),
      subject,
      body,
      email_type: 'bulk',
      status: 'sent',
    })

    // Log admin action
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: `Sent bulk email to ${sentCount} ${audience} users`,
      action_type: 'bulk_email_send',
      details: { subject, audience, count: sentCount },
    })

    return NextResponse.json({ success: true, count: sentCount })
  } catch (error) {
    console.error('Error sending bulk email:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}
