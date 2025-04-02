# Realtime funkció hibakeresése

Ha a realtime funkció nem működik megfelelően a FitConnect alkalmazásban, kövesd az alábbi lépéseket a probléma azonosításához és megoldásához:

## 1. Ellenőrizd a konzol üzeneteket

Nyisd meg a böngésző fejlesztői eszközeit (F12 vagy jobb klikk > Vizsgálat), és nézd meg a konzol üzeneteket. A következő üzeneteket keresd:

- "Feliratkozás a message_reactions:X csatornára..."
- "Feliratkozás állapota a message_reactions:X csatornára: SUBSCRIBED"
- "Reakció esemény: {...}"
- "Frissített reakciók a(z) X üzenethez: [...]"

Ha nem látod ezeket az üzeneteket, vagy hibaüzeneteket látsz, az segíthet azonosítani a problémát.

## 2. Ellenőrizd a Supabase Realtime beállításokat

1. Jelentkezz be a Supabase adminfelületére
2. Navigálj a **Database > Replication > Realtime** menüponthoz
3. Ellenőrizd, hogy a **message_reactions** tábla engedélyezve van-e a realtime publikációban

Futtasd le a következő SQL lekérdezést a SQL Editor-ban:

```sql
SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime' 
ORDER BY 
  tablename;
```

Ellenőrizd, hogy a **message_reactions** tábla szerepel-e az eredmények között.

## 3. Ellenőrizd a message_reactions tábla létezését

Futtasd le a következő SQL lekérdezést:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'message_reactions'
);
```

Ha az eredmény `false`, akkor a tábla nem létezik, és létre kell hoznod a `create_message_reactions_table.sql` fájl futtatásával.

## 4. Teszteld a realtime funkcionalitást

1. Nyiss meg két böngészőablakot, és jelentkezz be két különböző felhasználóval
2. Mindkét ablakban nyisd meg ugyanazt a beszélgetést
3. Az egyik ablakban adj hozzá egy reakciót egy üzenethez
4. Figyeld a konzolt mindkét ablakban, hogy lásd a realtime eseményeket
5. Ellenőrizd, hogy a reakció megjelenik-e a másik ablakban is

## 5. Ellenőrizd a Supabase kliens konfigurációját

Nézd meg a `src/integrations/supabase/client.ts` fájlt, és ellenőrizd, hogy a realtime paraméterek megfelelően vannak-e beállítva:

```typescript
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);
```

## 6. Próbáld ki a következő megoldásokat

1. **Frissítsd az oldalt**: Néha egy egyszerű frissítés megoldhatja a problémát.

2. **Töröld a böngésző gyorsítótárát**: A böngésző gyorsítótára okozhat problémákat a realtime funkcionalitással.

3. **Futtasd újra az enable_realtime.sql szkriptet**: Ez biztosítja, hogy a message_reactions tábla engedélyezve van a realtime publikációban.

4. **Ellenőrizd a Supabase API limiteket**: Ha túl sok kérést küldesz, a Supabase korlátozhatja a kéréseidet.

5. **Ellenőrizd a hálózati kapcsolatot**: A gyenge vagy instabil internetkapcsolat problémákat okozhat a realtime funkcionalitással.

Ha a fenti lépések után sem működik a realtime funkció, kérj segítséget a Supabase közösségtől vagy a fejlesztőktől.
