'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
}

const notificationTypeLabels: Record<string, string> = {
  booking_request: 'Booking Request',
  booking_confirmed: 'Booking Confirmed',
  booking_declined: 'Booking Declined',
  booking_cancelled: 'Booking Cancelled',
  booking_completed: 'Booking Completed',
  payment_received: 'Payment Received',
  payment_failed: 'Payment Failed',
  payout_requested: 'Payout Requested',
  payout_processed: 'Payout Processed',
  ticket_purchased: 'Ticket Purchased',
  ticket_transferred: 'Ticket Transferred',
  event_reminder: 'Event Reminder',
  event_cancelled: 'Event Cancelled',
  event_updated: 'Event Updated',
  review_received: 'Review Received',
  review_requested: 'Review Requested',
  message_received: 'Message Received',
  profile_verified: 'Profile Verified',
  system: 'System',
  welcome: 'Welcome',
  promotional: 'Promotional',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [offset, setOffset] = useState(0);

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const unreadParam = filter === 'unread' ? '&unread=true' : '';
      const res = await fetch(`/api/notifications?limit=20&offset=${currentOffset}${unreadParam}`);
      
      if (res.ok) {
        const data: NotificationsResponse = await res.json();
        
        if (reset) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        
        setTotal(data.total);
        setUnreadCount(data.unreadCount);
        setHasMore(data.hasMore);
        setOffset(currentOffset + data.notifications.length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, offset]);

  useEffect(() => {
    setOffset(0);
    fetchNotifications(true);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      });

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => prev - 1);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const getNotificationStyles = (type: string) => {
    const styles: Record<string, { bg: string; border: string; icon: string }> = {
      booking_request: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
      booking_confirmed: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
      booking_declined: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
      booking_cancelled: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
      payment_received: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
      payment_failed: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
      payout_processed: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
      ticket_purchased: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
      event_reminder: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600' },
      review_received: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600' },
      message_received: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600' },
    };
    return styles[type] || { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600' };
  };

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'You\'re all caught up!'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filter}
            onValueChange={(value: 'all' | 'unread') => setFilter(value)}
          >
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
            </SelectContent>
          </Select>
          
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No notifications</h3>
            <p className="text-muted-foreground">
              {filter === 'unread' 
                ? 'You have no unread notifications'
                : 'You don\'t have any notifications yet'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                {formatDateHeader(date)}
              </h2>
              <Card>
                <CardContent className="p-0">
                  {dateNotifications.map((notification, index) => {
                    const styles = getNotificationStyles(notification.type);
                    return (
                      <div key={notification.id}>
                        <div
                          className={cn(
                            'flex gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                            !notification.read && 'bg-primary/5'
                          )}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Icon */}
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                              styles.bg,
                              styles.border,
                              styles.icon
                            )}
                          >
                            <Bell className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">
                                  {notificationTypeLabels[notification.type] || notification.type}
                                </span>
                                <h4
                                  className={cn(
                                    'font-medium mt-0.5',
                                    !notification.read && 'font-semibold'
                                  )}
                                >
                                  {notification.title}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-2">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex shrink-0 items-start gap-1">
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                title="Mark as read"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {index < dateNotifications.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fetchNotifications(false)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
