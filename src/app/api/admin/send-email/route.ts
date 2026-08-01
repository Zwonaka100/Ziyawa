import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { emailWrapper } from '@/lib/email-templates'

// Email configuration for @zande.io addresses
const EMAIL_CONFIG = {
  support: {
    from: 'Ziyawa Support <support@zande.io>',
    replyTo: 'support@zande.io',
  },
  info: {
    from: 'Ziyawa <info@zande.io>',
    replyTo: 'info@zande.io',
  },
  accounts: {
    from: 'Ziyawa Accounts <accounts@zande.io>',
    replyTo: 'accounts@zande.io',
  },
  noreply: {
    from: 'Ziyawa <noreply@zande.io>',
    replyTo: 'support@zande.io',
  },
}

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

    const { to, toUserId, toName, subject, body, fromEmail = 'support' } = await request.json()

    // Get email config
    const emailConfig = EMAIL_CONFIG[fromEmail as keyof typeof EMAIL_CONFIG] || EMAIL_CONFIG.support

    // Get recipient name for personalization
    let recipientName = 'there'
    if (toName) {
      recipientName = toName.split(' ')[0]
    } else if (toUserId) {
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
      from: emailConfig.from,
      replyTo: emailConfig.replyTo,
      to,
      subject,
      html: emailWrapper(`
        <h1>${subject}</h1>
        <div class="message-box">
          ${personalizedBody.replace(/\n/g, '<br>')}
        </div>
        <p style="font-size: 14px; color: #6b7280;">This email was sent from Ziyawa. Replies go to ${emailConfig.replyTo}.</p>
      `),
      tags: [{ name: 'category', value: 'admin-send' }],
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
      details: { subject, from: fromEmail },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
