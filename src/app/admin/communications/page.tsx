import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, Users, FileText, History, Send } from 'lucide-react'

export const metadata = {
  title: 'Communications | Admin | Ziyawa',
}

export default function AdminCommunicationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Communications</h2>
        <p className="text-muted-foreground">Send emails and manage communication templates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Send Email */}
        <Link href="/admin/communications/send">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Send Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Send an email to a specific user or compose a new message.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Bulk Email */}
        <Link href="/admin/communications/bulk">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Bulk Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Send emails to multiple users at once - all users, organizers, or artists.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Email Templates */}
        <Link href="/admin/communications/templates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">Email Templates</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create and manage reusable email templates for common communications.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Email History */}
        <Link href="/admin/communications/history">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-100">
                  <History className="h-6 w-6 text-neutral-600" />
                </div>
                <CardTitle className="text-lg">Email History</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View all sent emails, their status, and delivery information.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
