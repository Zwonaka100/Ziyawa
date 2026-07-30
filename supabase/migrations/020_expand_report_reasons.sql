ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_check;

ALTER TABLE reports
ADD CONSTRAINT reports_reason_check CHECK (
  reason IN (
    'harassment',
    'spam',
    'impersonation',
    'inappropriate',
    'fraud',
    'scam',
    'no_show',
    'misleading',
    'unprofessional',
    'refund',
    'poor_service',
    'overcharging',
    'safety',
    'cancelled',
    'fake',
    'irrelevant',
    'other'
  )
);