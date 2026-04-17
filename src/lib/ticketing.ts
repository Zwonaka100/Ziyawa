export interface EventTicketTier {
  id: string;
  event_id?: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  sold_count: number;
  sales_start?: string | null;
  sales_end?: string | null;
  sort_order: number;
  is_active: boolean;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EventTicketTierFormItem {
  id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  sales_start: string;
  sales_end: string;
  is_active: boolean;
  is_public: boolean;
}

export function createEmptyTier(overrides?: Partial<EventTicketTierFormItem>): EventTicketTierFormItem {
  return {
    name: 'General Admission',
    description: '',
    price: '',
    quantity: '100',
    sales_start: '',
    sales_end: '',
    is_active: true,
    is_public: true,
    ...overrides,
  };
}

export function buildFallbackTier(event: { id: string; ticket_price: number; capacity: number; tickets_sold?: number }): EventTicketTier {
  return {
    id: `legacy-${event.id}`,
    event_id: event.id,
    name: 'General Admission',
    description: 'Standard event access',
    price: Number(event.ticket_price || 0),
    quantity: Number(event.capacity || 0),
    sold_count: Number(event.tickets_sold || 0),
    sort_order: 0,
    is_active: true,
    is_public: true,
  };
}

export function normalizeTierPayload(tiers: EventTicketTierFormItem[]) {
  return tiers
    .map((tier, index) => ({
      id: tier.id,
      name: tier.name.trim(),
      description: tier.description.trim() || null,
      price: Number(tier.price || 0),
      quantity: Number(tier.quantity || 0),
      sales_start: tier.sales_start || null,
      sales_end: tier.sales_end || null,
      sort_order: index,
      is_active: tier.is_active,
      is_public: tier.is_public,
    }))
    .filter((tier) => tier.name && tier.quantity > 0 && tier.price >= 0);
}

export function getEventCapacityFromTiers(tiers: EventTicketTierFormItem[]): number {
  return normalizeTierPayload(tiers).reduce((sum, tier) => sum + tier.quantity, 0);
}

export function getStartingPriceFromTiers(tiers: EventTicketTierFormItem[]): number {
  const normalized = normalizeTierPayload(tiers);
  if (normalized.length === 0) return 0;
  return Math.min(...normalized.map((tier) => tier.price));
}

export function isTierOnSale(tier: Pick<EventTicketTier, 'is_active' | 'sales_start' | 'sales_end' | 'quantity' | 'sold_count'>): boolean {
  if (!tier.is_active) return false;
  if (tier.sold_count >= tier.quantity) return false;

  const now = new Date();
  if (tier.sales_start && new Date(tier.sales_start) > now) return false;
  if (tier.sales_end && new Date(tier.sales_end) < now) return false;

  return true;
}
