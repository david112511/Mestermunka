# Realtime funkcionalitás beállítása a Supabase-ben

A FitConnect alkalmazás realtime funkcionalitásának beállításához a következő lépéseket kell végrehajtani a Supabase adminfelületén:

## 1. Realtime funkció engedélyezése a Supabase projektben

1. Jelentkezz be a [Supabase Dashboard](https://app.supabase.io)-ra
2. Válaszd ki a FitConnect projektet
3. Navigálj a **Database > Replication > Realtime** menüponthoz
4. Ellenőrizd, hogy a Realtime funkció be van-e kapcsolva

## 2. Táblák engedélyezése a realtime publikációhoz

A következő táblákhoz kell engedélyezni a realtime funkcionalitást:

- messages
- conversations
- conversation_participants
- message_reactions

Ezt kétféleképpen teheted meg:

### A. SQL Editor használatával (ajánlott)

1. Navigálj a **SQL Editor** menüponthoz
2. Másold be és futtasd le az `enable_realtime.sql` fájl tartalmát

### B. Manuálisan a felületen keresztül

1. Navigálj a **Database > Replication > Realtime** menüponthoz
2. Kattints a **Tables** fülre
3. Keresd meg a fenti táblákat és kapcsold be őket egyenként

## 3. Ellenőrzés

A beállítások ellenőrzéséhez futtasd le a következő SQL lekérdezést a SQL Editor-ban:

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

A lekérdezés eredményének tartalmaznia kell a fent felsorolt táblákat.

## 4. Supabase Realtime beállítások

A Supabase Realtime funkció alapértelmezetten csak 1000 változást követ 5 percenként. Ha ennél több változás történik, akkor a további változások nem lesznek követve. Ezért érdemes növelni ezt a limitet:

1. Navigálj a **Project Settings > API** menüponthoz
2. Keresd meg a **Realtime** szekciót
3. Állítsd be a **Max Changes** értéket magasabbra (pl. 10000)
4. Állítsd be a **Max Interval** értéket hosszabbra (pl. 10 perc)

## Hibaelhárítás

Ha a realtime funkció nem működik megfelelően:

1. Ellenőrizd a böngésző konzolját, hogy vannak-e hibaüzenetek
2. Ellenőrizd, hogy a message_reactions tábla létezik-e az adatbázisban
3. Ellenőrizd, hogy a message_reactions tábla hozzá van-e adva a realtime publikációhoz
4. Próbáld újraindítani az alkalmazást (frissítsd az oldalt)
5. Ellenőrizd, hogy a Supabase kliens megfelelően van-e konfigurálva a realtime paraméterekkel

### Gyakori hibák és megoldásaik

1. **"Table does not exist" hiba**: Ellenőrizd, hogy a message_reactions tábla létezik-e az adatbázisban. Ha nem, akkor futtasd le a `create_message_reactions_table.sql` fájlt.

2. **Nem érkeznek realtime események**: Ellenőrizd, hogy a message_reactions tábla hozzá van-e adva a realtime publikációhoz. Ha nem, akkor futtasd le az `enable_realtime.sql` fájlt.

3. **"Too many changes" hiba**: Növeld a Supabase Realtime beállításokban a Max Changes és Max Interval értékeket.

4. **"Channel already exists" hiba**: Ez általában akkor fordul elő, ha többször próbálsz feliratkozni ugyanarra a csatornára. Ellenőrizd, hogy csak egyszer iratkozol fel minden csatornára.

5. **"Connection timeout" hiba**: Ellenőrizd az internetkapcsolatot, vagy próbáld meg újraindítani az alkalmazást.

## További információk

További információkért látogasd meg a [Supabase Realtime dokumentációját](https://supabase.com/docs/guides/realtime).
