'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  booking_notifications: boolean;
  payment_notifications: boolean;
  event_notifications: boolean;
  message_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_enabled: true,
  push_enabled: true,
  booking_notifications: true,
  payment_notifications: true,
  event_notifications: true,
  message_notifications: true,
  review_notifications: true,
  system_notifications: true,
  marketing_notifications: false,
};

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences');
      if (res.ok) {
        const data = await res.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        toast({
          title: 'Saved',
          description: 'Your notification preferences have been updated',
        });
        setHasChanges(false);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Notification Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="space-y-6">
        {/* Delivery Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Channels</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <Label className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <Label className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={(checked) => handleToggle('push_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Categories</CardTitle>
            <CardDescription>
              Choose which types of notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Booking requests, confirmations, and updates
                </p>
              </div>
              <Switch
                checked={preferences.booking_notifications}
                onCheckedChange={(checked) => handleToggle('booking_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Payment confirmations, refunds, and payouts
                </p>
              </div>
              <Switch
                checked={preferences.payment_notifications}
                onCheckedChange={(checked) => handleToggle('payment_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Events</Label>
                <p className="text-sm text-muted-foreground">
                  Event reminders, updates, and cancellations
                </p>
              </div>
              <Switch
                checked={preferences.event_notifications}
                onCheckedChange={(checked) => handleToggle('event_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Messages</Label>
                <p className="text-sm text-muted-foreground">
                  New messages from artists and clients
                </p>
              </div>
              <Switch
                checked={preferences.message_notifications}
                onCheckedChange={(checked) => handleToggle('message_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Reviews</Label>
                <p className="text-sm text-muted-foreground">
                  New reviews and review requests
                </p>
              </div>
              <Switch
                checked={preferences.review_notifications}
                onCheckedChange={(checked) => handleToggle('review_notifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">System</Label>
                <p className="text-sm text-muted-foreground">
                  Important account and security updates
                </p>
              </div>
              <Switch
                checked={preferences.system_notifications}
                onCheckedChange={(checked) => handleToggle('system_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Marketing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marketing & Promotions</CardTitle>
            <CardDescription>
              Updates about new features and special offers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Promotional content, tips, and platform updates
                </p>
              </div>
              <Switch
                checked={preferences.marketing_notifications}
                onCheckedChange={(checked) => handleToggle('marketing_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={savePreferences} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
