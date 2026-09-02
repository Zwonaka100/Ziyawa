/**
 * Report detail for admin, shared by the API route and the server page.
 *
 * The page loaded this in three sequential steps from the browser: the report,
 * then the reported content, then other reports on the same content. The last
 * two both depend only on the first, so they run together here — two waves
 * instead of three round trips, resolved during render rather than after it.
 *
 * The reported-user branch used `select('*')` on profiles. Narrowed to the
 * fields the panel renders.
 */

import { createAdminServiceClient } from '@/lib/admin-auth'

export interface ReportDetail {
  report: Record<string, unknown> | null
  reportedContent: { type: string; data: Record<string, unknown> | null }
  otherReports: Record<string, unknown>[]
}

async function loadReportedContent(
  type: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const supabaseAdmin = createAdminServiceClient()

  switch (type) {
    case 'user':
    case 'organizer':
    case 'artist':
    case 'vendor': {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, avatar_url, is_organizer, is_artist, is_provider, is_suspended, is_banned, created_at')
        .eq('id', id)
        .maybeSingle()
      return data as Record<string, unknown> | null
    }
    case 'event': {
      const { data } = await supabaseAdmin
        .from('events')
        .select('id, title, description, status, event_date, venue, location, organizer_id, organizer:profiles!events_organizer_id_fkey(full_name, email)')
        .eq('id', id)
        .maybeSingle()
      return data as Record<string, unknown> | null
    }
    case 'review': {
      const { data } = await supabaseAdmin
        .from('reviews')
        .select('id, content, rating, created_at, user:profiles!reviews_user_id_fkey(full_name, email)')
        .eq('id', id)
        .maybeSingle()
      return data as Record<string, unknown> | null
    }
    default:
      return null
  }
}

export async function loadReportDetail(reportId: string): Promise<ReportDetail> {
  const supabaseAdmin = createAdminServiceClient()

  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, full_name, email, avatar_url),
      resolver:profiles!reports_resolved_by_fkey(full_name, email)
    `)
    .eq('id', reportId)
    .maybeSingle()

  if (error) throw new Error('Failed to load report')
  if (!report) return { report: null, reportedContent: { type: '', data: null }, otherReports: [] }

  // Both of these need only the report row, so they run together.
  const [reportedData, otherReportsResult] = await Promise.all([
    loadReportedContent(report.reported_type, report.reported_id),
    supabaseAdmin
      .from('reports')
      .select('id, reason, status, created_at')
      .eq('reported_type', report.reported_type)
      .eq('reported_id', report.reported_id)
      .neq('id', reportId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return {
    report: report as Record<string, unknown>,
    reportedContent: { type: report.reported_type, data: reportedData },
    otherReports: (otherReportsResult.data || []) as Record<string, unknown>[],
  }
}
