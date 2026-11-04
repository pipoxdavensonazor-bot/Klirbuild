-- Rotate short Prisma cuid() share links to 32-byte hex tokens.
-- New rows are generated in application code (generateOpaqueToken).
-- Safe when Meeting / LiveSession are not present yet (fresh migrate).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public."Meeting"') IS NOT NULL THEN
    UPDATE "Meeting"
    SET "shareToken" = encode(gen_random_bytes(32), 'hex')
    WHERE char_length("shareToken") < 64;
  END IF;

  IF to_regclass('public."LiveSession"') IS NOT NULL THEN
    UPDATE "LiveSession"
    SET "shareToken" = encode(gen_random_bytes(32), 'hex')
    WHERE char_length("shareToken") < 64;
  END IF;
END $$;
