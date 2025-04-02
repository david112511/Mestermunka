-- Engedélyezzük a realtime funkcionalitást a message_reactions táblához
BEGIN;
  -- Ellenőrizzük, hogy létezik-e a realtime publikáció
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication
      WHERE pubname = 'supabase_realtime'
    ) THEN
      -- Ha nem létezik, létrehozzuk
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END
  $$;

  -- Hozzáadjuk a message_reactions táblát a publikációhoz
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  
  -- Ellenőrizzük, hogy mely táblák vannak már a publikációban
  -- és hozzáadjuk a többi szükséges táblát is, ha még nincsenek benne
  DO $$
  DECLARE
    tables_to_add text[] := ARRAY['messages', 'conversations', 'conversation_participants', 'message_reactions'];
    table_name text;
  BEGIN
    FOREACH table_name IN ARRAY tables_to_add
    LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
        RAISE NOTICE 'Added table % to supabase_realtime publication', table_name;
      ELSE
        RAISE NOTICE 'Table % is already in supabase_realtime publication', table_name;
      END IF;
    END LOOP;
  END
  $$;

  -- Ellenőrizzük, hogy a realtime funkció engedélyezve van-e a táblákhoz
  SELECT 
    schemaname, 
    tablename 
  FROM 
    pg_publication_tables 
  WHERE 
    pubname = 'supabase_realtime' 
  ORDER BY 
    tablename;
COMMIT;
