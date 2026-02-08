'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  Plus, 
  ArrowLeft,
  Trash2,
  Edit,
  Upload,
  ImageIcon,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { 
  type Provider,
  type ProviderService,
  type ServiceCategory, 
  type PriceType,
  SERVICE_CATEGORY_LABELS,
  PRICE_TYPE_LABELS
} from '@/types/database'
import { formatCurrency } from '@/lib/helpers'
import { toast } from 'sonner'

export default function ProviderServicesPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [services, setServices] = useState<ProviderService[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<ProviderService | null>(null)
  
  // Form state
  const [serviceName, setServiceName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ServiceCategory>('sound_lighting')
  const [basePrice, setBasePrice] = useState('')
  const [priceType, setPriceType] = useState<PriceType>('fixed')
  const [isAvailable, setIsAvailable] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) {
      router.push('/auth/signin')
      return
    }

    if (!profile.is_provider) {
      router.push('/profile')
      return
    }

    fetchData()
  }, [profile, router])

  const fetchData = async () => {
    if (!profile) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch provider
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (providerError || !providerData) {
        router.push('/dashboard/provider/setup')
        return
      }

      setProvider(providerData)

      // Fetch services
      const { data: servicesData } = await supabase
        .from('provider_services')
        .select('*')
        .eq('provider_id', providerData.id)
        .order('created_at', { ascending: false })

      setServices(servicesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setServiceName('')
    setDescription('')
    setCategory('sound_lighting')
    setBasePrice('')
    setPriceType('fixed')
    setIsAvailable(true)
    setImageUrl(null)
    setEditingService(null)
    setShowForm(false)
  }

  const handleEdit = (service: ProviderService) => {
    setEditingService(service)
    setServiceName(service.service_name)
    setDescription(service.description || '')
    setCategory(service.category)
    setBasePrice(service.base_price.toString())
    setPriceType(service.price_type)
    setIsAvailable(service.is_available)
    setImageUrl(service.image_url || null)
    setShowForm(true)
  }

  const handleImageUpload = async (file: File) => {
    if (!profile || !provider) return
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `providers/${profile.id}/services/${fileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
      toast.success('Image uploaded!')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = () => {
    setImageUrl(null)
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('provider_services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Service deleted')
      fetchData()
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Failed to delete service')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!serviceName.trim()) {
      toast.error('Service name is required')
      return
    }

    if (!basePrice || parseFloat(basePrice) < 0) {
      toast.error('Please enter a valid price')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      
      const serviceData = {
        provider_id: provider!.id,
        service_name: serviceName.trim(),
        description: description.trim() || null,
        category,
        base_price: parseFloat(basePrice),
        price_type: priceType,
        is_available: isAvailable,
        image_url: imageUrl,
      }

      if (editingService) {
        const { error } = await supabase
          .from('provider_services')
          .update(serviceData)
          .eq('id', editingService.id)

        if (error) throw error
        toast.success('Service updated!')
      } else {
        const { error } = await supabase
          .from('provider_services')
          .insert(serviceData)

        if (error) throw error
        toast.success('Service added!')
      }

      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error('Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/provider" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Services</h1>
            <p className="text-muted-foreground">Add and edit the services you offer</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-8 border-orange-200">
          <CardHeader>
            <CardTitle>{editingService ? 'Edit Service' : 'Add New Service'}</CardTitle>
            <CardDescription>
              Describe the service you offer and set your pricing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service Image */}
              <div>
                <Label>Service Image</Label>
                <div className="mt-2">
                  {imageUrl ? (
                    <div className="relative w-full max-w-xs">
                      <div className="aspect-video rounded-lg overflow-hidden bg-neutral-100">
                        <Image
                          src={imageUrl}
                          alt="Service"
                          width={320}
                          height={180}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full max-w-xs aspect-video border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                      <div className="flex flex-col items-center justify-center py-4">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        ) : (
                          <>
                            <ImageIcon className="h-8 w-8 text-neutral-400 mb-2" />
                            <p className="text-sm text-neutral-500">Click to upload image</p>
                            <p className="text-xs text-neutral-400 mt-1">PNG, JPG up to 5MB</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file)
                        }}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input
                    id="serviceName"
                    placeholder="e.g., Full Sound System Setup"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ServiceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What's included in this service? Any requirements?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Base Price (R) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="priceType">Price Type *</Label>
                  <Select value={priceType} onValueChange={(v) => setPriceType(v as PriceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRICE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="available"
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
                <Label htmlFor="available">Service is available for booking</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingService ? 'Save Changes' : 'Add Service'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Services List */}
      {services.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="font-semibold text-lg mb-2">No services yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first service to start receiving booking requests
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Service Image */}
                  {service.image_url && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <Image
                        src={service.image_url}
                        alt={service.service_name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{service.service_name}</h3>
                      <Badge variant="outline">
                        {SERVICE_CATEGORY_LABELS[service.category]}
                      </Badge>
                      <Badge variant={service.is_available ? 'default' : 'secondary'}>
                        {service.is_available ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    )}
                    <p className="font-bold text-orange-600">
                      {formatCurrency(service.base_price)} 
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        ({PRICE_TYPE_LABELS[service.price_type]})
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(service.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
