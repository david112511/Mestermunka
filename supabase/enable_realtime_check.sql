-- Ellenőrizzük, hogy mely táblák vannak engedélyezve a realtime publikációban
SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime' 
ORDER BY 
  tablename;
