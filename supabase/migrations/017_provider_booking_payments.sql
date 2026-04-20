-- Provider Booking Payments
-- Adds provider_booking_id FK to transactions so crew payments are tracked properly

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS provider_booking_id UUID REFERENCES provider_bookings(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_provider_booking ON transactions(provider_booking_id);
