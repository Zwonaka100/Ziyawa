import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

const SUPPORT_FROM_EMAIL = process.env.SUPPORT_FROM_EMAIL || 'Ziyawa Support <support@zande.io>'
const SUPPORT_REPLY_TO = process.env.SUPPORT_EMAIL || 'support@zande.io'

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
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { to, toUserId, subject, body } = await request.json()

    // Get recipient name for personalization
    let recipientName = 'there'
    if (toUserId) {
      const { data: recipient } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', toUserId)
        .single()
      
      if (recipient?.full_name) {
        recipientName = recipient.full_name.split(' ')[0]
      }
    }

    // Replace variables in body
    const personalizedBody = body.replace(/\{\{name\}\}/g, recipientName)

    // Send email
    const emailResult = await sendEmail({
      from: SUPPORT_FROM_EMAIL,
      replyTo: SUPPORT_REPLY_TO,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px; background-color: #f5f5f5;">
            <h1 style="color: #333; margin: 0;">Ziyawa Support</h1>
          </div>
          <div style="padding: 20px;">
            ${personalizedBody.replace(/\n/g, '<br>')}
          </div>
          <div style="padding: 20px; background-color: #f5f5f5; font-size: 12px; color: #666;">
            <p>This email was sent from Ziyawa support. Replies will go to ${SUPPORT_REPLY_TO}.</p>
          </div>
        </div>
      `,
      tags: [{ name: 'category', value: 'admin-support' }],
    })

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email')
    }

    // Log the email
    await supabase.from('email_logs').insert({
      sender_id: user.id,
      recipient_ids: toUserId ? [toUserId] : null,
      recipient_emails: [to],
      subject,
      body: personalizedBody,
      email_type: 'individual',
      status: 'sent',
    })

    // Log admin action
    await supabase.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: `Sent email to ${to}`,
      action_type: 'email_send',
      target_type: 'user',
      target_id: toUserId,
      details: { subject },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
