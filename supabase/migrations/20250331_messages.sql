-- Üzenetek és beszélgetések táblák létrehozása

-- Beszélgetések (conversations) tábla
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beszélgetés résztvevők (conversation_participants) tábla
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Üzenetek (messages) tábla
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexek létrehozása a gyorsabb lekérdezéshez
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Row Level Security (RLS) beállítása
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS policy: Felhasználók csak azokat a beszélgetéseket láthatják, amelyekben részt vesznek
CREATE POLICY "Users can view conversations they participate in"
  ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS policy: Felhasználók csak azokat a résztvevőket láthatják, akik ugyanabban a beszélgetésben vannak
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;

CREATE POLICY "Users can view their own participation"
  ON conversation_participants
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view other participants in their conversations"
  ON conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- RLS policy: Felhasználók csak azokat az üzeneteket láthatják, amelyek olyan beszélgetéshez tartoznak, amiben részt vesznek
CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS policy: Felhasználók csak a saját üzeneteiket küldhetik
CREATE POLICY "Users can insert their own messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS policy: Felhasználók csak a saját üzeneteiket frissíthetik (pl. olvasottnak jelölés)
CREATE POLICY "Users can update their own messages"
  ON messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- Trigger a beszélgetések updated_at mezőjének frissítésére új üzenet esetén
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Funkció új beszélgetés létrehozására két felhasználó között
CREATE OR REPLACE FUNCTION create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  existing_conversation_id UUID;
BEGIN
  -- Ellenőrizzük, hogy létezik-e már beszélgetés a két felhasználó között
  SELECT cp1.conversation_id INTO existing_conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user1_id AND cp2.user_id = user2_id;
  
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;
  
  -- Ha nem létezik, létrehozunk egy új beszélgetést
  INSERT INTO conversations DEFAULT VALUES
  RETURNING id INTO conversation_id;
  
  -- Hozzáadjuk a résztvevőket
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (conversation_id, user1_id), (conversation_id, user2_id);
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;
