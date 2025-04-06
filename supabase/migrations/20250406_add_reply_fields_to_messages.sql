-- Válasz mezők hozzáadása a messages táblához
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reply_to_content TEXT;

-- Komment hozzáadása az új mezőkhöz
COMMENT ON COLUMN messages.reply_to_id IS 'Az üzenet azonosítója, amelyre ez az üzenet válaszol';
COMMENT ON COLUMN messages.reply_to_content IS 'Az eredeti üzenet tartalma, amelyre ez az üzenet válaszol';

-- Frissítjük a realtime publikációt, hogy tartalmazza az új mezőket
BEGIN;
  -- Ellenőrizzük, hogy a messages tábla már benne van-e a publikációban
  DO $$
  BEGIN
    -- Ha a messages tábla már benne van a publikációban, akkor eltávolítjuk
    IF EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE messages;
    END IF;
  END
  $$;
  
  -- Majd újra hozzáadjuk az összes mezővel együtt
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
COMMIT;
