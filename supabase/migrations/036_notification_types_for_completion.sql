-- ── Two notification types the code already uses but the database rejects ───
--
-- notifications.type is an enum. Two values the application writes are not in
-- it, so every insert carrying them is refused:
--
--   review_requested  — written by the post-event follow-up in
--                       src/app/api/cron/event-lifecycle/route.ts and by
--                       src/app/api/events/[id]/attendees/route.ts. The
--                       follow-up email goes out, then the notification insert
--                       fails. There are zero review_requested rows in the
--                       table, against 6 event_reminder rows written by the
--                       same code path with a valid type.
--
--   event_completed   — new, for the notification an organiser gets when they
--                       mark their event complete. Nothing existed: completion
--                       told the organiser nothing and told admin nothing,
--                       which is a large part of why it felt like it never
--                       happened.
--
-- ADD VALUE cannot be used in the same transaction that adds it, which is why
-- this migration only widens the enum; the code that writes the new value ships
-- separately.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'event_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'review_requested';
