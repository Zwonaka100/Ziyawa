'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Save,
  RefreshCw,
  Percent,
  Mail,
  Shield,
  Globe,
  Bell,
  CreditCard,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

type PlatformSettings = {
  // General
  platform_name: string
  platform_description: string
  contact_email: string
  support_email: string
  
  // Finance
  platform_fee_percentage: number
  minimum_payout_amount: number
  payout_processing_days: number
  currency: string
  
  // Features
  allow_free_events: boolean
  require_organizer_verification: boolean
  require_event_approval: boolean
  auto_publish_events: boolean
  
  // Email
  email_notifications_enabled: boolean
  marketing_emails_enabled: boolean
  
  // Security
  max_login_attempts: number
  session_timeout_hours: number
  
  // Limits
  max_events_per_organizer: number
  max_tickets_per_order: number
  max_images_per_event: number
}

const defaultSettings: PlatformSettings = {
  platform_name: 'Ziyawa',
  platform_description: 'South African Events Marketplace',
  contact_email: 'hello@ziyawa.co.za',
  support_email: 'support@ziyawa.co.za',
  platform_fee_percentage: 10,
  minimum_payout_amount: 100,
  payout_processing_days: 7,
  currency: 'ZAR',
  allow_free_events: true,
  require_organizer_verification: false,
  require_event_approval: false,
  auto_publish_events: true,
  email_notifications_enabled: true,
  marketing_emails_enabled: true,
  max_login_attempts: 5,
  session_timeout_hours: 24,
  max_events_per_organizer: 100,
  max_tickets_per_order: 10,
  max_images_per_event: 10,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value')

    if (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } else if (data) {
      const loadedSettings = { ...defaultSettings }
      data.forEach(setting => {
        if (setting.key in loadedSettings) {
          const key = setting.key as keyof PlatformSettings
          // Parse the value based on the type of the default value
          if (typeof defaultSettings[key] === 'boolean') {
            (loadedSettings as any)[key] = setting.value === 'true'
          } else if (typeof defaultSettings[key] === 'number') {
            (loadedSettings as any)[key] = Number(setting.value)
          } else {
            (loadedSettings as any)[key] = setting.value
          }
        }
      })
      setSettings(loadedSettings)
    }
    setLoading(false)
  }

  const handleChange = (key: keyof PlatformSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    setSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upsert each setting
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: String(value),
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }))

      for (const setting of settingsArray) {
        const { error } = await supabase
          .from('platform_settings')
          .upsert(setting, { onConflict: 'key' })
        
        if (error) throw error
      }

      // Log the action
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: 'update_settings',
        entity_type: 'setting',
        entity_id: 'platform',
        details: { changed_keys: Object.keys(settings) }
      })

      toast.success('Settings saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    }
    
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Platform Settings</h2>
          <p className="text-muted-foreground">Configure platform-wide settings</p>
        </div>
        <Button onClick={saveSettings} disabled={!hasChanges || saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <p className="text-sm text-yellow-800">You have unsaved changes</p>
        </div>
      )}

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name}
                  onChange={(e) => handleChange('platform_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="platform_description">Platform Description</Label>
                <Textarea
                  id="platform_description"
                  value={settings.platform_description}
                  onChange={(e) => handleChange('platform_description', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={settings.contact_email}
                    onChange={(e) => handleChange('contact_email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="support_email">Support Email</Label>
                  <Input
                    id="support_email"
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Settings */}
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Finance Settings
              </CardTitle>
              <CardDescription>Payment and payout configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platform_fee">Platform Fee (%)</Label>
                  <div className="relative">
                    <Input
                      id="platform_fee"
                      type="number"
                      min="0"
                      max="100"
                      value={settings.platform_fee_percentage}
                      onChange={(e) => handleChange('platform_fee_percentage', Number(e.target.value))}
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fee charged on each ticket sale
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => handleChange('currency', e.target.value)}
                    disabled
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_payout">Minimum Payout Amount (R)</Label>
                  <Input
                    id="min_payout"
                    type="number"
                    min="0"
                    value={settings.minimum_payout_amount}
                    onChange={(e) => handleChange('minimum_payout_amount', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payout_days">Payout Processing Days</Label>
                  <Input
                    id="payout_days"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.payout_processing_days}
                    onChange={(e) => handleChange('payout_processing_days', Number(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Feature Settings
              </CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Free Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow organizers to create free events
                  </p>
                </div>
                <Switch
                  checked={settings.allow_free_events}
                  onCheckedChange={(checked) => handleChange('allow_free_events', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Organizer Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Organizers must be verified before creating events
                  </p>
                </div>
                <Switch
                  checked={settings.require_organizer_verification}
                  onCheckedChange={(checked) => handleChange('require_organizer_verification', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Event Approval</Label>
                  <p className="text-sm text-muted-foreground">
                    Events must be approved by admin before publishing
                  </p>
                </div>
                <Switch
                  checked={settings.require_event_approval}
                  onCheckedChange={(checked) => handleChange('require_event_approval', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Publish Events</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically publish events when organizer submits
                  </p>
                </div>
                <Switch
                  checked={settings.auto_publish_events}
                  onCheckedChange={(checked) => handleChange('auto_publish_events', checked)}
                />
              </div>

              <div className="border-t pt-6 space-y-4">
                <h4 className="font-medium">Limits</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="max_events">Max Events per Organizer</Label>
                    <Input
                      id="max_events"
                      type="number"
                      min="1"
                      value={settings.max_events_per_organizer}
                      onChange={(e) => handleChange('max_events_per_organizer', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_tickets">Max Tickets per Order</Label>
                    <Input
                      id="max_tickets"
                      type="number"
                      min="1"
                      value={settings.max_tickets_per_order}
                      onChange={(e) => handleChange('max_tickets_per_order', Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_images">Max Images per Event</Label>
                    <Input
                      id="max_images"
                      type="number"
                      min="1"
                      value={settings.max_images_per_event}
                      onChange={(e) => handleChange('max_images_per_event', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Settings
              </CardTitle>
              <CardDescription>Configure email notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send transactional emails (order confirmations, etc.)
                  </p>
                </div>
                <Switch
                  checked={settings.email_notifications_enabled}
                  onCheckedChange={(checked) => handleChange('email_notifications_enabled', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow marketing and promotional emails
                  </p>
                </div>
                <Switch
                  checked={settings.marketing_emails_enabled}
                  onCheckedChange={(checked) => handleChange('marketing_emails_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Security and access configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max_login">Max Login Attempts</Label>
                  <Input
                    id="max_login"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_login_attempts}
                    onChange={(e) => handleChange('max_login_attempts', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lock account after this many failed attempts
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_timeout">Session Timeout (hours)</Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.session_timeout_hours}
                    onChange={(e) => handleChange('session_timeout_hours', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically log out after this time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
