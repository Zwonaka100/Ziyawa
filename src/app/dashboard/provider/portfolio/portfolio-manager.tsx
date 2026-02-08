'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { 
  uploadUserFile, 
  deleteFile, 
  getPathFromUrl,
  type UploadResult 
} from '@/lib/storage';
import { 
  Plus, 
  Trash2, 
  Calendar,
  MapPin,
  Upload,
  Briefcase,
  Image as ImageIcon,
  ExternalLink,
  Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProviderPortfolio, ProviderPortfolioMedia } from '@/types/database';

interface PortfolioWithMedia extends ProviderPortfolio {
  media?: ProviderPortfolioMedia[];
}

interface ProviderPortfolioManagerProps {
  providerId: string;
  userId: string;
  initialPortfolio: PortfolioWithMedia[];
}

export function ProviderPortfolioManager({ providerId, userId, initialPortfolio }: ProviderPortfolioManagerProps) {
  const [portfolio, setPortfolio] = useState<PortfolioWithMedia[]>(initialPortfolio);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newEntry, setNewEntry] = useState({
    event_name: '',
    client_name: '',
    description: '',
    date: '',
    venue: '',
    location: '',
    services_provided: '',
    is_featured: false,
    cover_image_url: '',
  });
  const supabase = createClient();

  // Handle cover image upload using storage utilities
  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const result: UploadResult = await uploadUserFile(file, 'providers', userId, 'portfolio');
      
      if (!result.success || !result.url) {
        alert(result.error || 'Failed to upload image');
        return;
      }

      setNewEntry(prev => ({ ...prev, cover_image_url: result.url! }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Add portfolio entry
  const handleAddEntry = async () => {
    if (!newEntry.event_name) return;

    const { data, error } = await supabase
      .from('provider_portfolio')
      .insert({
        provider_id: providerId,
        event_name: newEntry.event_name,
        client_name: newEntry.client_name || null,
        description: newEntry.description || null,
        date: newEntry.date || null,
        venue: newEntry.venue || null,
        location: newEntry.location || null,
        services_provided: newEntry.services_provided ? newEntry.services_provided.split(',').map(s => s.trim()) : null,
        is_featured: newEntry.is_featured,
        cover_image_url: newEntry.cover_image_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding portfolio entry:', error);
      alert('Failed to add portfolio entry');
      return;
    }

    setPortfolio(prev => [{ ...data, media: [] }, ...prev]);
    setNewEntry({
      event_name: '',
      client_name: '',
      description: '',
      date: '',
      venue: '',
      location: '',
      services_provided: '',
      is_featured: false,
      cover_image_url: '',
    });
    setIsAddingEntry(false);
  };

  // Delete portfolio entry
  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portfolio entry?')) return;

    // Find the entry to get its cover image URL
    const entry = portfolio.find(p => p.id === id);

    const { error } = await supabase
      .from('provider_portfolio')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting portfolio entry:', error);
      return;
    }

    // Also delete cover image from storage if it exists
    if (entry?.cover_image_url) {
      const path = getPathFromUrl(entry.cover_image_url);
      if (path) {
        await deleteFile(path);
      }
    }

    setPortfolio(prev => prev.filter(p => p.id !== id));
  };

  // Toggle featured
  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    const { error } = await supabase
      .from('provider_portfolio')
      .update({ is_featured: isFeatured })
      .eq('id', id);

    if (error) {
      console.error('Error updating portfolio entry:', error);
      return;
    }

    setPortfolio(prev => prev.map(p => p.id === id ? { ...p, is_featured: isFeatured } : p));
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Entry Button */}
      <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Portfolio Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex gap-4">
                <div className="w-32 h-24 rounded-lg bg-neutral-100 overflow-hidden flex items-center justify-center">
                  {newEntry.cover_image_url ? (
                    <Image
                      src={newEntry.cover_image_url}
                      alt="Cover"
                      width={128}
                      height={96}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-neutral-300" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleCoverUpload(file);
                    }}
                    className="hidden"
                    id="cover-upload"
                  />
                  <label htmlFor="cover-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        {uploading ? (
                          <span className="animate-pulse">Uploading...</span>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Event Name */}
            <div className="space-y-2">
              <Label>Event/Project Name *</Label>
              <Input
                placeholder="e.g., Afropunk Johannesburg 2024"
                value={newEntry.event_name}
                onChange={(e) => setNewEntry(prev => ({ ...prev, event_name: e.target.value }))}
              />
            </div>

            {/* Client Name */}
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Input
                placeholder="e.g., Afropunk LLC"
                value={newEntry.client_name}
                onChange={(e) => setNewEntry(prev => ({ ...prev, client_name: e.target.value }))}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Venue */}
            <div className="space-y-2">
              <Label>Venue</Label>
              <Input
                placeholder="e.g., Constitution Hill"
                value={newEntry.venue}
                onChange={(e) => setNewEntry(prev => ({ ...prev, venue: e.target.value }))}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g., Johannesburg, Gauteng"
                value={newEntry.location}
                onChange={(e) => setNewEntry(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

            {/* Services Provided */}
            <div className="space-y-2">
              <Label>Services Provided</Label>
              <Input
                placeholder="e.g., Sound, Lighting, Stage Design"
                value={newEntry.services_provided}
                onChange={(e) => setNewEntry(prev => ({ ...prev, services_provided: e.target.value }))}
              />
              <p className="text-xs text-neutral-500">Separate with commas</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the project, your role, and any highlights..."
                value={newEntry.description}
                onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            {/* Featured */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="featured">Featured Project</Label>
                <p className="text-xs text-neutral-500">Show at the top of your portfolio</p>
              </div>
              <Switch
                id="featured"
                checked={newEntry.is_featured}
                onCheckedChange={(v) => setNewEntry(prev => ({ ...prev, is_featured: v }))}
              />
            </div>

            <Button 
              onClick={handleAddEntry} 
              className="w-full"
              disabled={!newEntry.event_name || uploading}
            >
              Add Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portfolio Grid */}
      {portfolio.length > 0 ? (
        <div className="space-y-4">
          {portfolio.map((entry) => (
            <div 
              key={entry.id} 
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden group"
            >
              <div className="flex flex-col md:flex-row">
                {/* Cover Image */}
                <div className="w-full md:w-48 h-48 md:h-auto relative bg-neutral-100 flex-shrink-0">
                  {entry.cover_image_url ? (
                    <Image
                      src={entry.cover_image_url}
                      alt={entry.event_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Briefcase className="h-12 w-12 text-neutral-300" />
                    </div>
                  )}
                  {entry.is_featured && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">
                      Featured
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900">{entry.event_name}</h3>
                      {entry.client_name && (
                        <p className="text-sm text-neutral-500">for {entry.client_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleFeatured(entry.id, !entry.is_featured)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          entry.is_featured 
                            ? 'border-yellow-500 bg-yellow-500 text-white' 
                            : 'border-neutral-300 text-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        {entry.is_featured ? 'Featured' : 'Feature'}
                      </button>
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-neutral-500">
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

                  {/* Services */}
                  {entry.services_provided && entry.services_provided.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {entry.services_provided.map((service, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {entry.description && (
                    <p className="text-sm text-neutral-600 mt-3 line-clamp-2">
                      {entry.description}
                    </p>
                  )}

                  {/* Media count */}
                  {entry.media && entry.media.length > 0 && (
                    <p className="text-xs text-neutral-400 mt-2">
                      {entry.media.length} photo{entry.media.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">No portfolio entries yet</h3>
          <p className="text-neutral-500 mb-4">Showcase your past projects to build trust with clients</p>
          <Button onClick={() => setIsAddingEntry(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Project
          </Button>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-neutral-100 rounded-xl">
        <h4 className="font-medium text-neutral-900 mb-2">💡 Pro Tips</h4>
        <ul className="text-sm text-neutral-600 space-y-1">
          <li>• Add high-quality photos from your best projects</li>
          <li>• Feature 2-3 projects that show your range</li>
          <li>• Include well-known clients to build credibility</li>
          <li>• Be specific about services provided</li>
        </ul>
      </div>
    </div>
  );
}
