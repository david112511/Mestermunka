-- Tárolt eljárás létrehozása a beszélgetés résztvevőinek lekérdezéséhez
CREATE OR REPLACE FUNCTION get_conversation_participants_for_user(user_id_param UUID, conversation_id_param UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ellenőrizzük, hogy a felhasználó résztvevője-e a beszélgetésnek
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = user_id_param
  ) THEN
    RETURN;
  END IF;

  -- Lekérdezzük a beszélgetés összes résztvevőjét
  RETURN QUERY
  SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url
  FROM 
    profiles p
  JOIN
    conversation_participants cp ON p.id = cp.user_id
  WHERE
    cp.conversation_id = conversation_id_param;
END;
$$;
