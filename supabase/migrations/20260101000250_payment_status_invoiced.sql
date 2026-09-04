-- Adds the INVOICED payment status used by campaigns the club is invoiced for.
--
-- Kept in its own migration on purpose: PostgreSQL will not let a new enum
-- value be used in the same transaction that adds it, so this must be applied
-- before 20260101000300.
alter type payment_status add value if not exists 'INVOICED';
