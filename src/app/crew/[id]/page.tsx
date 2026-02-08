'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  MapPin, 
  Star, 
  Briefcase,
  Loader2,
  Phone,
  Mail,
  Globe,
  Clock,
  CheckCircle,
  Calendar,
  Image as ImageIcon,
  Video,
  FolderKanban,
  MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { SocialLinksRow } from '@/components/shared'
import { MediaGallery } from '@/components/shared/media-gallery'
import { TrackRecordCard } from '@/components/shared/trust-badges'
import { ReviewsList } from '@/components/shared/reviews'
import { toast } from 'sonner'
import { 
  type Provider, 
  type ProviderService, 
  type ServiceCategory, 
  type SaProvince,
  type ProviderSocialLink,
  type ProviderMedia,
  type ProviderPortfolio,
  type Review,
  SERVICE_CATEGORY_LABELS,
  PRICE_TYPE_LABELS
} from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/helpers'

// Province labels
const PROVINCE_LABELS: Record<SaProvince, string> = {
  gauteng: 'Gauteng',
  western_cape: 'Western Cape',
  kwazulu_natal: 'KwaZulu-Natal',
  eastern_cape: 'Eastern Cape',
  free_state: 'Free State',
  mpumalanga: 'Mpumalanga',
  limpopo: 'Limpopo',
  north_west: 'North West',
  northern_cape: 'Northern Cape',
}

// Category colors
const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  sound_lighting: 'bg-yellow-100 text-yellow-700',
  staging_av: 'bg-blue-100 text-blue-700',
  event_staff: 'bg-green-100 text-green-700',
  venue_hire: 'bg-purple-100 text-purple-700',
  catering: 'bg-red-100 text-red-700',
  music_licensing: 'bg-indigo-100 text-indigo-700',
  photography_video: 'bg-pink-100 text-pink-700',
  decor_design: 'bg-orange-100 text-orange-700',
  transport: 'bg-cyan-100 text-cyan-700',
  mc_hosts: 'bg-emerald-100 text-emerald-700',
  equipment_rental: 'bg-slate-100 text-slate-700',
  marketing: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700',
}

interface ProviderWithProfile extends Provider {
  profile?: {
    full_name: string | null
    email: string
  }
}

interface PortfolioWithMedia extends ProviderPortfolio {
  media?: ProviderMedia[]
}

interface ReviewWithReviewer extends Review {
  reviewer?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export default function ProviderProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const providerId = params.id as string

  const [provider, setProvider] = useState<ProviderWithProfile | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [socialLinks, setSocialLinks] = useState<ProviderSocialLink[]>([])
  const [media, setMedia] = useState<ProviderMedia[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioWithMedia[]>([])
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')
  const [startingChat, setStartingChat] = useState(false)

  // Start conversation handler
  const handleStartConversation = async () => {
    if (!profile) {
      toast.error('Please sign in to send messages');
      router.push('/auth/signin');
      return;
    }

    if (!provider?.profile_id) {
      toast.error('Cannot message this provider');
      return;
    }

    setStartingChat(true);
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: provider.profile_id,
          contextType: 'general',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start conversation');
      }

      router.push(`/messages?chat=${data.conversationId}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    if (providerId) {
      fetchProvider()
    }
  }, [providerId])

  const fetchProvider = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch provider with profile
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .eq('id', providerId)
        .single()

      if (providerError) {
        console.error('Error fetching provider:', providerError)
        router.push('/crew')
        return
      }

      setProvider(providerData)

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .order('base_price', { ascending: true })

      setServices(servicesData || [])

      // Fetch social links
      const { data: socialLinksData } = await supabase
        .from('provider_social_links')
        .select('*')
        .eq('provider_id', providerId)
        .order('display_order', { ascending: true })

      setSocialLinks(socialLinksData || [])

      // Fetch media
      const { data: mediaData } = await supabase
        .from('provider_media')
        .select('*')
        .eq('provider_id', providerId)
        .order('display_order', { ascending: true })

      setMedia(mediaData || [])

      // Fetch portfolio
      const { data: portfolioData } = await supabase
        .from('provider_portfolio')
        .select(`
          *,
          media:provider_portfolio_media(*)
        `)
        .eq('provider_id', providerId)
        .order('date', { ascending: false })

      setPortfolio(portfolioData || [])

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('reviewee_id', providerId)
        .eq('reviewee_type', 'provider')
        .order('created_at', { ascending: false })
        .limit(10)

      setReviews(reviewsData || [])
    } catch (error) {
      console.error('Error:', error)
      router.push('/crew')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!provider) {
    return null
  }

  const isOwnProfile = profile?.id === provider.profile_id
  const canBook = profile?.is_organizer && !isOwnProfile

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link href="/crew" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Crew
      </Link>

      {/* Provider Header */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={provider.profile_image || undefined} />
              <AvatarFallback className="text-3xl bg-orange-100 text-orange-600">
                {provider.business_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{provider.business_name}</h1>
                  <Badge 
                    variant="outline" 
                    className={CATEGORY_COLORS[provider.primary_category]}
                  >
                    {SERVICE_CATEGORY_LABELS[provider.primary_category]}
                  </Badge>
                </div>
                
                {provider.is_available ? (
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Available</Badge>
                )}
              </div>

              {provider.description && (
                <p className="text-muted-foreground mt-4">{provider.description}</p>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {PROVINCE_LABELS[provider.location]}
                </span>
                
                {provider.average_rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {provider.average_rating.toFixed(1)} rating
                  </span>
                )}
                
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  {provider.completed_bookings} job{provider.completed_bookings !== 1 ? 's' : ''} completed
                </span>

                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {provider.advance_notice_days} days notice required
                </span>
              </div>
            </div>
          </div>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <>
              <Separator className="my-6" />
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Connect:</span>
                <SocialLinksRow 
                  links={socialLinks.map(l => ({ platform: l.platform, url: l.url, username: l.username }))} 
                  size="sm" 
                />
              </div>
            </>
          )}

          {/* Contact Info */}
          <Separator className="my-6" />
          
          <div className="flex flex-wrap gap-4">
            {provider.business_phone && (
              <a 
                href={`tel:${provider.business_phone}`}
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                {provider.business_phone}
              </a>
            )}
            
            {provider.business_email && (
              <a 
                href={`mailto:${provider.business_email}`}
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                {provider.business_email}
              </a>
            )}
            
            {provider.website && (
              <a 
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm hover:text-primary"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start bg-white border border-neutral-200 p-1 mb-4">
              <TabsTrigger value="services">
                Services ({services.length})
              </TabsTrigger>
              <TabsTrigger value="gallery" className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Gallery ({media.length})
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="flex items-center gap-1">
                <FolderKanban className="h-4 w-4" />
                Portfolio ({portfolio.length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                Reviews ({reviews.length})
              </TabsTrigger>
            </TabsList>

            {/* Services Tab */}
            <TabsContent value="services">
              {services.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No services listed yet
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <Card key={service.id} className="hover:border-primary/50 transition-colors overflow-hidden">
                      {/* Service Image */}
                      {service.image_url && (
                        <div className="aspect-video w-full relative bg-neutral-100">
                          <Image
                            src={service.image_url}
                            alt={service.service_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{service.service_name}</CardTitle>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 text-xs ${CATEGORY_COLORS[service.category]}`}
                            >
                              {SERVICE_CATEGORY_LABELS[service.category]}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {formatCurrency(service.base_price)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {PRICE_TYPE_LABELS[service.price_type]}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      {service.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground">{service.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery">
              {media.length > 0 ? (
                <MediaGallery media={media.map(m => ({ id: m.id, media_type: m.media_type, url: m.url, thumbnail_url: m.thumbnail_url, embed_id: m.embed_id, title: m.title }))} />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ImageIcon className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">No photos or videos yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Portfolio Tab */}
            <TabsContent value="portfolio">
              {portfolio.length > 0 ? (
                <div className="space-y-4">
                  {portfolio.map((entry) => (
                    <Card key={entry.id} className="overflow-hidden">
                      <div className="flex flex-col md:flex-row">
                        {entry.cover_image_url && (
                          <div className="w-full md:w-48 h-48 md:h-auto relative bg-neutral-100 flex-shrink-0">
                            <Image
                              src={entry.cover_image_url}
                              alt={entry.event_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <CardContent className="flex-1 p-4">
                          <h3 className="font-semibold text-lg">{entry.event_name}</h3>
                          {entry.client_name && (
                            <p className="text-sm text-muted-foreground">for {entry.client_name}</p>
                          )}
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                            {entry.date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(entry.date)}
                              </span>
                            )}
                            {(entry.venue || entry.location) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {[entry.venue, entry.location].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </div>
                          {entry.services_provided && entry.services_provided.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {entry.services_provided.map((service, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {service}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                              {entry.description}
                            </p>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FolderKanban className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">No portfolio entries yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              {reviews.length > 0 ? (
                <ReviewsList 
                  reviews={reviews}
                  averageRating={provider.average_rating}
                  totalReviews={reviews.length}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                    <p className="text-muted-foreground">No reviews yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Track Record Card */}
          <TrackRecordCard
            type="provider"
            totalBookings={provider.completed_bookings + (provider.cancelled_bookings || 0)}
            completedBookings={provider.completed_bookings}
            cancelledBookings={provider.cancelled_bookings || 0}
            rating={provider.average_rating}
            totalReviews={reviews.length}
            memberSince={provider.created_at}
            isVerified={!!provider.verified_at}
          />

          {/* Book CTA */}
          {canBook && services.length > 0 && (
            <Card className="border-neutral-200">
              <CardContent className="py-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold mb-2">Need this crew?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send a booking request to {provider.business_name}
                  </p>
                  <Link href={`/dashboard/organizer/book-crew/${provider.id}`}>
                    <Button className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book This Provider
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleStartConversation}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    {startingChat ? 'Opening...' : 'Send Message'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message only (for organizers who see no services) */}
          {canBook && services.length === 0 && (
            <Card className="border-neutral-200">
              <CardContent className="py-6">
                <div className="text-center space-y-3">
                  <h3 className="font-semibold mb-2">Contact {provider.business_name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask about their services
                  </p>
                  <Button 
                    className="w-full"
                    onClick={handleStartConversation}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    {startingChat ? 'Opening...' : 'Send Message'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!profile && (
            <Card className="border-neutral-200">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-4 text-sm">
                  Sign in as an organiser to book this provider
                </p>
                <Link href="/auth/signin">
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {isOwnProfile && (
            <Card className="border-muted">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-4 text-sm">
                  This is your provider profile
                </p>
                <Link href="/dashboard/provider">
                  <Button variant="outline" className="w-full">Go to Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
