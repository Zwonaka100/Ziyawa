-- =====================================================
-- ZIYAWA ADMIN SYSTEM - Complete Database Setup
-- =====================================================

-- 1. Add admin role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_role TEXT CHECK (admin_role IN ('super_admin', 'admin', 'moderator', 'support'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;

-- Set initial admins
UPDATE profiles SET is_admin = true, admin_role = 'super_admin' 
WHERE email IN ('mgmakgotho@gmail.com', 'zmabege@zande.io');

-- 2. Reports/Complaints Table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_type TEXT NOT NULL CHECK (reported_type IN ('user', 'organizer', 'artist', 'vendor', 'event', 'review')),
  reported_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'fraud', 'harassment', 'inappropriate', 'scam', 'no_show', 'poor_service', 'fake', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- Array of image/file URLs
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES profiles(id),
  admin_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Warnings Table
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'severe')),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'payment', 'event', 'technical', 'report', 'refund', 'account', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- 5. Ticket Replies Table
CREATE TABLE IF NOT EXISTS ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  attachments TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[], -- e.g., ['{{name}}', '{{event_name}}']
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'marketing', 'support', 'notification', 'warning')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  recipient_ids UUID[],
  recipient_emails TEXT[],
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  email_type TEXT DEFAULT 'individual' CHECK (email_type IN ('individual', 'bulk', 'automated')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

-- 8. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_view', 'user_edit', 'user_suspend', 'user_ban', 'user_delete', 'user_warn',
    'event_view', 'event_edit', 'event_approve', 'event_reject', 'event_delete', 'event_feature',
    'report_view', 'report_assign', 'report_resolve', 'report_dismiss',
    'ticket_view', 'ticket_assign', 'ticket_reply', 'ticket_close',
    'payout_approve', 'payout_reject', 'refund_process',
    'email_send', 'bulk_email_send',
    'settings_change', 'admin_login'
  )),
  target_type TEXT, -- 'user', 'event', 'report', 'ticket', etc.
  target_id UUID,
  details JSONB, -- Additional context
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Platform Settings Table
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default platform settings
INSERT INTO platform_settings (key, value, description) VALUES
  ('platform_name', 'Ziyawa', 'Platform display name'),
  ('commission_rate', '10', 'Platform commission percentage'),
  ('minimum_payout', '100', 'Minimum payout amount in ZAR'),
  ('auto_approve_events', 'true', 'Automatically approve new events'),
  ('require_organizer_verification', 'false', 'Require organizers to be verified'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('support_email', 'support@ziyawa.co.za', 'Support email address')
ON CONFLICT (key) DO NOTHING;

-- 10. Featured Events Table
CREATE TABLE IF NOT EXISTS featured_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  featured_by UUID REFERENCES profiles(id),
  position INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_type ON reports(reported_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON profiles(is_suspended);
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Reports RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (reporter_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can update reports"
  ON reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Support Tickets RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Users and admins can update tickets"
  ON support_tickets FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

-- Ticket Replies RLS
ALTER TABLE ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create replies on own tickets"
  ON ticket_replies FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    )
  );

CREATE POLICY "Users can view replies on own tickets"
  ON ticket_replies FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admin Audit Logs RLS (only admins can view)
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can create audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Email Templates RLS (only admins)
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Email Logs RLS (only admins)
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email logs"
  ON email_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Platform Settings RLS (only super admins can update)
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Super admins can update settings"
  ON platform_settings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role = 'super_admin'));

-- User Warnings RLS
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own warnings"
  ON user_warnings FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Admins can create warnings"
  ON user_warnings FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Featured Events RLS
ALTER TABLE featured_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view featured events"
  ON featured_events FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage featured events"
  ON featured_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
