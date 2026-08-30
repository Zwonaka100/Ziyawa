-- =====================================================
-- PAYOUT ACCOUNTS
-- Verified bank details used to pay organizers, artists and crew.
--
-- These deliberately do NOT live on `profiles`. That table's only SELECT
-- policy is USING (true), so every column is readable by anyone holding the
-- anon key, including logged-out visitors. `profiles` still carries unused
-- bank_name / bank_account_number / bank_account_holder columns from an
-- earlier design — populating those would publish every user's bank details.
-- Everything here is owner-or-admin only, never public.
-- =====================================================

CREATE TABLE IF NOT EXISTS payout_accounts (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Bank selection as submitted by the user.
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,

  -- Account holder as declared by the user and checked by an admin against
  -- their ID document. It is NOT machine-verified: Paystack's account-resolve
  -- endpoint supports only NGN/USD/GHS/KES, not ZAR, and createTransferRecipient
  -- accepts any well-formed account number without validating it.
  account_holder TEXT NOT NULL,

  -- Set once the Paystack Transfer Recipient exists. Null means the details
  -- are stored but no recipient was created yet (e.g. Paystack was down at
  -- approval time), so payouts must not be attempted until it is retried.
  paystack_recipient_code TEXT,
  recipient_error TEXT,

  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_accounts_recipient
  ON payout_accounts(paystack_recipient_code);

DROP TRIGGER IF EXISTS update_payout_accounts_updated_at ON payout_accounts;
CREATE TRIGGER update_payout_accounts_updated_at
  BEFORE UPDATE ON payout_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- RLS — owner or admin only. No public read, ever.
-- =====================================================

ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payout account" ON payout_accounts;
CREATE POLICY "Users can view own payout account"
  ON payout_accounts FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own payout account" ON payout_accounts;
CREATE POLICY "Users can insert own payout account"
  ON payout_accounts FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own payout account" ON payout_accounts;
CREATE POLICY "Users can update own payout account"
  ON payout_accounts FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all payout accounts" ON payout_accounts;
CREATE POLICY "Admins can view all payout accounts"
  ON payout_accounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- =====================================================
-- Bank details captured alongside a verification request, so an admin
-- reviews identity and payability together, and a rejected submission keeps
-- what was entered.
-- =====================================================

ALTER TABLE verification_requests
  ADD COLUMN IF NOT EXISTS bank_code TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS account_number TEXT,
  ADD COLUMN IF NOT EXISTS account_holder TEXT;

COMMENT ON COLUMN verification_requests.account_holder IS
  'Self-declared account holder name. Not machine-verifiable in South Africa; an admin compares it against the ID document at review time.';
