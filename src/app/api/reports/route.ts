import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createNotification } from '@/lib/notifications'
import { sendEmail } from '@/lib/email'
import { emailWrapper } from '@/lib/email-templates'
import { SITE_URL } from '@/lib/constants'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALLOWED_TYPES = new Set(['user', 'organizer', 'artist', 'vendor', 'event', 'review'])
const ALLOWED_REASONS = new Set([
  'harassment',
  'spam',
  'impersonation',
  'inappropriate',
  'fraud',
  'scam',
  'no_show',
  'misleading',
  'unprofessional',
  'refund',
  'poor_service',
  'overcharging',
  'safety',
  'cancelled',
  'fake',
  'irrelevant',
  'other',
])

const TYPE_LABELS: Record<string, string> = {
  user: 'user',
  organizer: 'organizer',
  artist: 'artist',
  vendor: 'service provider',
  event: 'event',
  review: 'review',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const reportedType = String(body.reported_type || '')
    const reportedId = String(body.reported_id || '')
    const reason = String(body.reason || '')
    const description = String(body.description || '').trim()

    if (!ALLOWED_TYPES.has(reportedType)) {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    if (!reportedId) {
      return NextResponse.json({ error: 'Missing reported item' }, { status: 400 })
    }

    if (!ALLOWED_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Invalid report reason' }, { status: 400 })
    }

    if (!description) {
      return NextResponse.json({ error: 'Please provide details about your report' }, { status: 400 })
    }

    const { data: reporterProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', user.id)
      .single()

    const { data: report, error: insertError } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: user.id,
        reported_type: reportedType,
        reported_id: reportedId,
        reason,
        description,
        status: 'pending',
        priority: 'medium',
      })
      .select('id, created_at')
      .single()

    if (insertError || !report) {
      console.error('Report insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
    }

    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_admin', true)

    const reporterName = reporterProfile?.full_name || 'there'
    const typeLabel = TYPE_LABELS[reportedType] || 'item'
    const adminLink = `/admin/reports/${report.id}`
    const reviewUrl = `${SITE_URL}${adminLink}`

    await Promise.all(
      (admins || []).map(async (admin) => {
        await createNotification({
          userId: admin.id,
          type: 'message_received',
          title: `New ${typeLabel} report`,
          message: `${reporterProfile?.full_name || reporterProfile?.email || 'A user'} reported a ${typeLabel} for ${reason.replace(/_/g, ' ')}.`,
          link: adminLink,
          metadata: {
            reportId: report.id,
            reportedType,
            reportedId,
            reason,
          },
          sendEmail: false,
        })

        if (admin.email) {
          await sendEmail({
            to: admin.email,
            subject: `New ${typeLabel} report on Ziyawa`,
            html: emailWrapper(`
              <h1>New report submitted</h1>
              <p>${reporterProfile?.full_name || reporterProfile?.email || 'A user'} submitted a report for a ${typeLabel}.</p>
              <div class="highlight-box">
                <p><strong>Reason:</strong> ${reason.replace(/_/g, ' ')}</p>
                <p><strong>Details:</strong> ${description}</p>
              </div>
              <p><a href="${reviewUrl}" class="button">Review report</a></p>
            `),
            tags: [{ name: 'category', value: 'moderation-report' }],
          })
        }
      })
    )

    if (reporterProfile?.id) {
      await createNotification({
        userId: reporterProfile.id,
        type: 'message_received',
        title: 'Report received',
        message: `Your ${typeLabel} report has been submitted and will be reviewed by our team.`,
        link: '/dashboard/notifications',
        metadata: { reportId: report.id, reportedType, reportedId, reason },
        sendEmail: false,
      })
    }

    if (reporterProfile?.email) {
      await sendEmail({
        to: reporterProfile.email,
        subject: 'We received your report',
        html: emailWrapper(`
          <h1>Report submitted</h1>
          <p>Hi ${reporterName},</p>
          <p>We received your report about this ${typeLabel}. Our moderation team will review it shortly.</p>
          <div class="highlight-box">
            <p><strong>Reason:</strong> ${reason.replace(/_/g, ' ')}</p>
            <p><strong>Submitted:</strong> ${new Date(report.created_at).toLocaleString()}</p>
          </div>
          <p>Thanks for helping keep Ziyawa safe.</p>
        `),
        tags: [{ name: 'category', value: 'report-confirmation' }],
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted. Our team will review it shortly.',
      reportId: report.id,
    })
  } catch (error) {
    console.error('Report submission error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}