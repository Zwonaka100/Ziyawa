'use client'

/**
 * ADMIN EMAIL TEMPLATES PAGE
 * /admin/communications/templates
 * 
 * Create and manage reusable email templates
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  FileText,
  Loader2,
  Eye,
  Code,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface EmailTemplate {
  id: string
  name: string
  slug: string
  subject: string
  body: string
  category: string
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { value: 'transactional', label: 'Transactional' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'notification', label: 'Notification' },
  { value: 'support', label: 'Support' },
  { value: 'system', label: 'System' },
]

const VARIABLE_PRESETS = [
  '{{user_name}}',
  '{{user_email}}',
  '{{event_title}}',
  '{{event_date}}',
  '{{event_venue}}',
  '{{ticket_count}}',
  '{{total_amount}}',
  '{{booking_reference}}',
  '{{support_link}}',
  '{{unsubscribe_link}}',
]

export default function EmailTemplatesPage() {
  const supabase = createClient()
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Editor dialog
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    subject: '',
    body: '',
    category: 'transactional',
    is_active: true,
  })

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null)

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter])

  const fetchTemplates = async () => {
    setLoading(true)

    let query = supabase
      .from('email_templates')
      .select('*')
      .order('name')

    if (categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
      toast.error('Failed to load templates')
    } else {
      setTemplates(data || [])
    }

    setLoading(false)
  }

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setFormData({
        name: template.name,
        slug: template.slug,
        subject: template.subject,
        body: template.body,
        category: template.category,
        is_active: template.is_active,
      })
    } else {
      setEditingTemplate(null)
      setFormData({
        name: '',
        slug: '',
        subject: '',
        body: '',
        category: 'transactional',
        is_active: true,
      })
    }
    setEditorOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)

    try {
      // Extract variables from body
      const variableRegex = /\{\{([^}]+)\}\}/g
      const variables: string[] = []
      let match
      while ((match = variableRegex.exec(formData.body)) !== null) {
        if (!variables.includes(match[0])) {
          variables.push(match[0])
        }
      }

      const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      const templateData = {
        name: formData.name,
        slug,
        subject: formData.subject,
        body: formData.body,
        category: formData.category,
        variables,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }

      if (editingTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)
        if (error) throw error
        toast.success('Template updated')
      } else {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            ...templateData,
            created_at: new Date().toISOString(),
          })
        if (error) throw error
        toast.success('Template created')
      }

      setEditorOpen(false)
      fetchTemplates()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: `${template.name} (Copy)`,
          slug: `${template.slug}-copy`,
          subject: template.subject,
          body: template.body,
          category: template.category,
          variables: template.variables,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      if (error) throw error
      toast.success('Template duplicated')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to duplicate template')
    }
  }

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Delete template "${template.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', template.id)
      if (error) throw error
      toast.success('Template deleted')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !template.is_active })
        .eq('id', template.id)
      if (error) throw error
      toast.success(template.is_active ? 'Template deactivated' : 'Template activated')
      fetchTemplates()
    } catch (error) {
      toast.error('Failed to update template')
    }
  }

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      body: prev.body + variable,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/communications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold">Email Templates</h2>
            <p className="text-muted-foreground">Create and manage reusable email templates</p>
          </div>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No templates found. Create your first template!
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.subject}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.variables?.length > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={template.is_active ? 'default' : 'secondary'}
                        className={template.is_active ? 'bg-green-100 text-green-700' : ''}
                      >
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(template.updated_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setPreviewTemplate(template); setPreviewOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditor(template)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                            <FileText className="h-4 w-4 mr-2" />
                            {template.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(template)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'New Template'}
            </DialogTitle>
            <DialogDescription>
              Create reusable email templates with dynamic variables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g. Welcome to Ziyawa, {{user_name}}!"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Email Body *</Label>
                <div className="flex items-center gap-1">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Insert variable:</span>
                  <Select onValueChange={insertVariable}>
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Select variable" />
                    </SelectTrigger>
                    <SelectContent>
                      {VARIABLE_PRESETS.map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Write your email content here. Use {{variable_name}} for dynamic content."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {"{{user_name}}"} that will be replaced with actual values when sending.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (available for use)
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingTemplate ? 'Save Changes' : 'Create Template'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-neutral-50">
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{previewTemplate.subject}</p>
              </div>
              <div className="p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-2">Body</p>
                <div className="whitespace-pre-wrap font-mono text-sm bg-white p-4 rounded border">
                  {previewTemplate.body}
                </div>
              </div>
              {previewTemplate.variables?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Variables Used</p>
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.variables.map((v, i) => (
                      <Badge key={i} variant="secondary" className="font-mono">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
