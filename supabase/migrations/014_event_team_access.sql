-- Event Team Access
-- Temporary event-specific staff access for check-in and guest-list operations

CREATE TABLE IF NOT EXISTS event_team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('door_staff', 'guest_list_staff', 'event_ops')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  invite_token TEXT NOT NULL UNIQUE,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_id UUID REFERENCES event_team_invites(id) ON DELETE SET NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('door_staff', 'guest_list_staff', 'event_ops')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_team_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES event_team_members(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shift_title TEXT NOT NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  hours_worked NUMERIC(8,2) NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'worked' CHECK (status IN ('scheduled', 'worked', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_team_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES event_team_members(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_team_invites_event_id ON event_team_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_invites_email ON event_team_invites(email);
CREATE INDEX IF NOT EXISTS idx_event_team_members_event_id ON event_team_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_members_user_id ON event_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_team_shifts_event_id ON event_team_shifts(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_shifts_member_id ON event_team_shifts(member_id);
CREATE INDEX IF NOT EXISTS idx_event_team_payments_event_id ON event_team_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_payments_member_id ON event_team_payments(member_id);

ALTER TABLE event_team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_team_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can manage own event team invites"
  ON event_team_invites FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

CREATE POLICY "Organizers can manage own event team members"
  ON event_team_members FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

CREATE POLICY "Team members can view their own assignments"
  ON event_team_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Organizers can manage own event team shifts"
  ON event_team_shifts FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

CREATE POLICY "Organizers can manage own event team payments"
  ON event_team_payments FOR ALL
  USING (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM events WHERE organizer_id = auth.uid()));

CREATE POLICY "Team members can view their own work logs"
  ON event_team_shifts FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM event_team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view their own payment records"
  ON event_team_payments FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM event_team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can view their own invites"
  ON event_team_invites FOR SELECT
  USING (
    LOWER(email) = LOWER(COALESCE((SELECT email FROM profiles WHERE id = auth.uid()), ''))
  );

CREATE POLICY "Event team members can view assigned events"
  ON events FOR SELECT
  USING (
    id IN (
      SELECT event_id
      FROM event_team_members
      WHERE user_id = auth.uid() AND status IN ('active', 'completed')
    )
  );
