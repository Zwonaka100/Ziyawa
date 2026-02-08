'use client'

/**
 * ADMIN REVIEWS MODERATION PAGE
 * /admin/reviews
 * 
 * Moderate user reviews across the platform:
 * - View all reviews
 * - Filter by rating, status
 * - Hide/show reviews
 * - Delete inappropriate reviews
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  User,
  MoreHorizontal,
  Eye,
  EyeOff,
  Trash2,
  Flag,
  ExternalLink,
  Loader2,
  Calendar,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Review {
  id: string
  user_id: string
  event_id: string
  rating: number
  title: string
  content: string
  is_visible: boolean
  is_verified_purchase: boolean
  helpful_count: number
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url: string
  }
  event?: {
    id: string
    title: string
  }
}

const ITEMS_PER_PAGE = 20

export default function AdminReviewsPage() {
  const supabase = createClient()
  
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stats
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    hiddenReviews: 0,
    reportedReviews: 0,
  })

  // Action dialog
  const [actionOpen, setActionOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [actionType, setActionType] = useState<'hide' | 'show' | 'delete'>('hide')
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchReviews()
    fetchStats()
  }, [page, ratingFilter, visibilityFilter, search])

  const fetchStats = async () => {
    const [all, hidden, reported] = await Promise.all([
      supabase.from('reviews').select('rating'),
      supabase.from('reviews').select('id').eq('is_visible', false),
      supabase.from('reports').select('id').eq('reported_type', 'review').eq('status', 'pending'),
    ])

    const ratings = all.data || []
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
      : 0

    setStats({
      totalReviews: ratings.length,
      averageRating: Math.round(avgRating * 10) / 10,
      hiddenReviews: hidden.data?.length || 0,
      reportedReviews: reported.data?.length || 0,
    })
  }

  const fetchReviews = async () => {
    setLoading(true)

    let query = supabase
      .from('reviews')
      .select(`
        *,
        user:profiles!reviews_user_id_fkey(id, full_name, email, avatar_url),
        event:events!reviews_event_id_fkey(id, title)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (ratingFilter !== 'all') {
      query = query.eq('rating', parseInt(ratingFilter))
    }

    if (visibilityFilter === 'visible') {
      query = query.eq('is_visible', true)
    } else if (visibilityFilter === 'hidden') {
      query = query.eq('is_visible', false)
    }

    if (search) {
      query = query.or(`content.ilike.%${search}%,title.ilike.%${search}%`)
    }

    const from = (page - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      toast.error('Failed to fetch reviews')
      console.error(error)
    } else {
      setReviews(data || [])
      setTotalCount(count || 0)
    }

    setLoading(false)
  }

  const openAction = (review: Review, type: 'hide' | 'show' | 'delete') => {
    setSelectedReview(review)
    setActionType(type)
    setAdminNotes('')
    setActionOpen(true)
  }

  const handleAction = async () => {
    if (!selectedReview) return

    setProcessing(true)

    try {
      const { data: { user: admin } } = await supabase.auth.getUser()

      if (actionType === 'delete') {
        const { error } = await supabase
          .from('reviews')
          .delete()
          .eq('id', selectedReview.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reviews')
          .update({ is_visible: actionType === 'show' })
          .eq('id', selectedReview.id)
        if (error) throw error
      }

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        admin_id: admin?.id,
        action: `review_${actionType}`,
        entity_type: 'review',
        entity_id: selectedReview.id,
        details: {
          review_content: selectedReview.content?.slice(0, 100),
          user_email: selectedReview.user?.email,
          event_title: selectedReview.event?.title,
          notes: adminNotes,
        },
      })

      // Notify user if review was hidden or deleted
      if (actionType !== 'show') {
        await supabase.from('notifications').insert({
          user_id: selectedReview.user_id,
          type: 'review_moderated',
          title: actionType === 'delete' ? 'Review Removed' : 'Review Hidden',
          message: adminNotes || `Your review has been ${actionType === 'delete' ? 'removed' : 'hidden'} by our moderation team.`,
        })
      }

      toast.success(
        actionType === 'delete' 
          ? 'Review deleted' 
          : actionType === 'hide' 
            ? 'Review hidden' 
            : 'Review restored'
      )
      setActionOpen(false)
      fetchReviews()
      fetchStats()
    } catch (error) {
      console.error('Action error:', error)
      toast.error('Failed to process action')
    } finally {
      setProcessing(false)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Review Moderation</h2>
        <p className="text-muted-foreground">Moderate user reviews across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{stats.averageRating}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <EyeOff className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hidden</p>
                <p className="text-2xl font-bold">{stats.hiddenReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.reportedReviews > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.reportedReviews > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <Flag className={`h-5 w-5 ${stats.reportedReviews > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className={`text-sm ${stats.reportedReviews > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                  Reported
                </p>
                <p className={`text-2xl font-bold ${stats.reportedReviews > 0 ? 'text-red-700' : ''}`}>
                  {stats.reportedReviews}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reviews..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={(v) => { setVisibilityFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Review</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : reviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reviews found
                  </TableCell>
                </TableRow>
              ) : (
                reviews.map((review) => (
                  <TableRow key={review.id} className={!review.is_visible ? 'bg-neutral-50 opacity-75' : ''}>
                    <TableCell className="max-w-xs">
                      {review.title && (
                        <p className="font-medium line-clamp-1">{review.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {review.content || 'No content'}
                      </p>
                    </TableCell>
                    <TableCell>
                      {review.event ? (
                        <Link 
                          href={`/admin/events/${review.event.id}`}
                          className="text-sm hover:underline flex items-center gap-1"
                        >
                          <Calendar className="h-3 w-3" />
                          {review.event.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center">
                          {review.user?.avatar_url ? (
                            <img src={review.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/users/${review.user?.id}`} className="text-sm font-medium hover:underline">
                            {review.user?.full_name || 'Unknown'}
                          </Link>
                          {review.is_verified_purchase && (
                            <Badge variant="outline" className="ml-2 text-xs">Verified</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        {review.helpful_count > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />
                            {review.helpful_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.is_visible ? (
                        <Badge variant="outline" className="text-green-700">
                          <Eye className="h-3 w-3 mr-1" />
                          Visible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at))} ago
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {review.event && (
                            <DropdownMenuItem asChild>
                              <Link href={`/events/${review.event.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Event
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {review.is_visible ? (
                            <DropdownMenuItem onClick={() => openAction(review, 'hide')}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Hide Review
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => openAction(review, 'show')}>
                              <Eye className="h-4 w-4 mr-2" />
                              Show Review
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => openAction(review, 'delete')}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Review
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'hide' && 'Hide Review'}
              {actionType === 'show' && 'Show Review'}
              {actionType === 'delete' && 'Delete Review'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'hide' && 'Hide this review from public view. The user will be notified.'}
              {actionType === 'show' && 'Make this review visible again.'}
              {actionType === 'delete' && 'Permanently delete this review. This cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4 mt-4">
              {/* Review Preview */}
              <div className="p-4 rounded-lg bg-neutral-50">
                <div className="flex items-center gap-2 mb-2">
                  {renderStars(selectedReview.rating)}
                  <span className="text-sm text-muted-foreground">
                    by {selectedReview.user?.full_name}
                  </span>
                </div>
                {selectedReview.title && (
                  <p className="font-medium">{selectedReview.title}</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedReview.content}
                </p>
              </div>

              {actionType === 'delete' && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">This action cannot be undone</span>
                  </div>
                </div>
              )}

              {actionType !== 'show' && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Reason (sent to user)</Label>
                  <Textarea
                    id="notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Explain why this review was moderated..."
                    rows={2}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setActionOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAction}
                  disabled={processing}
                  variant={actionType === 'delete' ? 'destructive' : 'default'}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === 'hide' && <EyeOff className="h-4 w-4 mr-2" />}
                      {actionType === 'show' && <Eye className="h-4 w-4 mr-2" />}
                      {actionType === 'delete' && <Trash2 className="h-4 w-4 mr-2" />}
                      {actionType === 'hide' && 'Hide Review'}
                      {actionType === 'show' && 'Show Review'}
                      {actionType === 'delete' && 'Delete Review'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
