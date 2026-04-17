'use client'

import { Plus, Ticket, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { EventTicketTierFormItem } from '@/lib/ticketing'

interface TicketTierEditorProps {
  tiers: EventTicketTierFormItem[]
  onChange: (tiers: EventTicketTierFormItem[]) => void
}

const QUICK_TIER_NAMES = [
  'General Admission',
  'VIP',
  'VVIP',
  'Early Bird',
  'At The Gate',
]

export function TicketTierEditor({ tiers, onChange }: TicketTierEditorProps) {
  const updateTier = (index: number, field: keyof EventTicketTierFormItem, value: string | boolean) => {
    onChange(
      tiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, [field]: value } : tier
      )
    )
  }

  const addTier = () => {
    const nextName = QUICK_TIER_NAMES[tiers.length] || `Tier ${tiers.length + 1}`
    onChange([
      ...tiers,
      {
        name: nextName,
        description: '',
        price: '',
        quantity: '50',
        sales_start: '',
        sales_end: '',
        is_active: true,
        is_public: true,
      },
    ])
  }

  const removeTier = (index: number) => {
    if (tiers.length <= 1) return
    onChange(tiers.filter((_, tierIndex) => tierIndex !== index))
  }

  const totalCapacity = tiers.reduce((sum, tier) => sum + Number(tier.quantity || 0), 0)

  return (
    <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-neutral-900">
            <Ticket className="h-4 w-4" />
            Ticket Tiers
          </h3>
          <p className="text-sm text-muted-foreground">
            Set up General, VIP, VVIP, Early Bird, or gate pricing for this event.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addTier}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tier
        </Button>
      </div>

      <div className="rounded-md bg-background/80 px-3 py-2 text-sm text-muted-foreground">
        Total launch capacity: <span className="font-semibold text-foreground">{totalCapacity}</span>
      </div>

      <div className="space-y-4">
        {tiers.map((tier, index) => (
          <div key={tier.id || `${tier.name}-${index}`} className="rounded-lg border bg-background p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">Tier {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTier(index)}
                disabled={tiers.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Tier Name *</Label>
                <Input
                  value={tier.name}
                  onChange={(e) => updateTier(index, 'name', e.target.value)}
                  placeholder="e.g. VIP"
                />
              </div>
              <div>
                <Label>Price (ZAR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tier.price}
                  onChange={(e) => updateTier(index, 'price', e.target.value)}
                  placeholder="e.g. 250"
                />
              </div>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={tier.quantity}
                  onChange={(e) => updateTier(index, 'quantity', e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div>
                <Label>Sales Start</Label>
                <Input
                  type="datetime-local"
                  value={tier.sales_start}
                  onChange={(e) => updateTier(index, 'sales_start', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Sales End</Label>
              <Input
                type="datetime-local"
                value={tier.sales_end}
                onChange={(e) => updateTier(index, 'sales_end', e.target.value)}
              />
            </div>

            <div>
              <Label>Perks / Notes</Label>
              <Textarea
                rows={2}
                value={tier.description}
                onChange={(e) => updateTier(index, 'description', e.target.value)}
                placeholder="e.g. fast-lane entry, private lounge, complimentary drink"
              />
            </div>

            <div className="flex flex-col gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tier.is_active}
                  onChange={(e) => updateTier(index, 'is_active', e.target.checked)}
                />
                <span>Tier is on sale</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tier.is_public}
                  onChange={(e) => updateTier(index, 'is_public', e.target.checked)}
                />
                <span>Show publicly</span>
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
