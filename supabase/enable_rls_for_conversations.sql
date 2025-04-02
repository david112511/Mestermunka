-- Először kikapcsoljuk az RLS-t, hogy újra tudjuk konfigurálni
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Töröljük a meglévő szabályokat
DROP POLICY IF EXISTS "Users can see conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can see only their own conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can see their own conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can see participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can see conversation participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert their own conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can delete their own conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can see conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can see messages in conversations they participate in" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in conversations they participate in" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- Újra engedélyezzük az RLS-t
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Létrehozzuk a conversations szabályokat
CREATE POLICY "Users can see conversations they participate in" 
ON conversations
FOR SELECT 
USING (
  id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert conversations" 
ON conversations
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update conversations they participate in" 
ON conversations
FOR UPDATE 
USING (
  id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Létrehozzuk a messages szabályokat
CREATE POLICY "Users can see messages in conversations they participate in" 
ON messages
FOR SELECT 
USING (
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in conversations they participate in" 
ON messages
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  conversation_id IN (
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own messages" 
ON messages
FOR UPDATE 
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own messages" 
ON messages
FOR DELETE 
USING (auth.uid() = sender_id);

-- Conversation participants szabályok - egyszerűsített verzió
-- Csak a saját résztvevői bejegyzéseket láthatja a felhasználó
CREATE POLICY "Users can see their own conversation participants" 
ON conversation_participants
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversation participants" 
ON conversation_participants
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation participants" 
ON conversation_participants
FOR DELETE 
USING (auth.uid() = user_id);
