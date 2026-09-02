import { notFound } from 'next/navigation'
import { loadReportDetail } from '@/lib/admin/reports'
import { AdminReportDetail } from './report-detail'

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { report, reportedContent, otherReports } = await loadReportDetail(id)

  if (!report) notFound()

  return (
    <AdminReportDetail
      reportId={id}
      initialReport={report as never}
      initialReportedContent={reportedContent as never}
      initialOtherReports={otherReports as never}
    />
  )
}
