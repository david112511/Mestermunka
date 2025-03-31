import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants: {
    id: string;
    conversation_id: string;
    user_id: string;
    user: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      is_trainer: boolean;
    };
  }[];
  last_message?: Message;
  unread_count: number;
}

export const useMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Beszélgetések lekérdezése
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setConversationsLoading(true);
      
      // Közvetlenül a conversations táblából kérdezzük le a beszélgetéseket
      // és a hozzájuk tartozó résztvevőket külön lekérdezésekkel
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          updated_at
        `);

      if (conversationsError) throw conversationsError;

      if (!conversations || conversations.length === 0) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }

      // Szűrjük a beszélgetéseket, hogy csak azokat tartsuk meg, amelyekben a felhasználó részt vesz
      const { data: userParticipations, error: userParticipationsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (userParticipationsError) throw userParticipationsError;

      if (!userParticipations || userParticipations.length === 0) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }

      const userConversationIds = userParticipations.map(p => p.conversation_id);
      const filteredConversations = conversations.filter(c => 
        userConversationIds.includes(c.id)
      );

      // Résztvevők lekérdezése
      const { data: allParticipants, error: participantsError } = await supabase
        .from('conversation_participants')
        .select(`
          id,
          conversation_id,
          user_id
        `)
        .in('conversation_id', userConversationIds);

      if (participantsError) throw participantsError;

      // Felhasználók azonosítóinak kigyűjtése
      const userIds = [...new Set(allParticipants.map(p => p.user_id))];
      
      // Felhasználók adatainak lekérdezése
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_trainer')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Felhasználók térképének létrehozása
      const usersMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      // Utolsó üzenetek lekérdezése minden beszélgetéshez
      const { data: lastMessages, error: lastMessagesError } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at
        `)
        .in('conversation_id', userConversationIds)
        .order('created_at', { ascending: false });

      if (lastMessagesError) throw lastMessagesError;

      // Küldők lekérdezése
      const senderIds = lastMessages.map(m => m.sender_id);
      const { data: senders, error: sendersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', senderIds);

      if (sendersError) throw sendersError;

      // Senderek hozzárendelése a megfelelő üzenetekhez
      const sendersMap = senders.reduce((acc, sender) => {
        acc[sender.id] = sender;
        return acc;
      }, {});

      // Olvasatlan üzenetek számának lekérdezése
      const { data: unreadCounts, error: unreadCountsError } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', userConversationIds)
        .not('sender_id', 'eq', user.id)
        .eq('is_read', false);

      if (unreadCountsError) throw unreadCountsError;

      // Olvasatlan üzenetek számának kiszámítása JavaScript-ben
      const unreadCountsMap: Record<string, number> = {};
      unreadCounts?.forEach(item => {
        const convId = item.conversation_id;
        if (!unreadCountsMap[convId]) {
          unreadCountsMap[convId] = 0;
        }
        unreadCountsMap[convId]++;
      });

      // Beszélgetések összeállítása
      const formattedConversations: Conversation[] = filteredConversations.map(c => {
        // Résztvevők adatainak átalakítása a megfelelő formátumra
        const participants = allParticipants
          .filter(ap => ap.conversation_id === c.id)
          .map(p => ({
            id: p.id,
            conversation_id: c.id,
            user_id: p.user_id,
            user: usersMap[p.user_id] ? {
              id: usersMap[p.user_id].id || '',
              first_name: usersMap[p.user_id].first_name || '',
              last_name: usersMap[p.user_id].last_name || '',
              avatar_url: usersMap[p.user_id].avatar_url || '',
              is_trainer: usersMap[p.user_id].is_trainer || false
            } : {
              id: p.user_id || '',
              first_name: '',
              last_name: '',
              avatar_url: '',
              is_trainer: false
            }
          }));

        // Utolsó üzenet keresése
        const conversationMessages = lastMessages.filter(m => m.conversation_id === c.id);
        const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : null;
        
        const formattedLastMessage = lastMessage ? {
          id: lastMessage.id,
          conversation_id: lastMessage.conversation_id,
          sender_id: lastMessage.sender_id,
          content: lastMessage.content,
          is_read: lastMessage.is_read,
          created_at: lastMessage.created_at,
          sender: sendersMap[lastMessage.sender_id] ? {
            id: sendersMap[lastMessage.sender_id].id || '',
            first_name: sendersMap[lastMessage.sender_id].first_name || '',
            last_name: sendersMap[lastMessage.sender_id].last_name || '',
            avatar_url: sendersMap[lastMessage.sender_id].avatar_url || ''
          } : {
            id: lastMessage.sender_id || '',
            first_name: '',
            last_name: '',
            avatar_url: ''
          }
        } : null;

        // Olvasatlan üzenetek száma
        const unreadCount = unreadCountsMap[c.id] || 0;

        return {
          id: c.id,
          created_at: c.created_at,
          updated_at: c.updated_at,
          participants,
          last_message: formattedLastMessage,
          unread_count: unreadCount
        };
      });

      // Rendezés a legutolsó üzenet alapján
      formattedConversations.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA;
      });

      setConversations(formattedConversations);
    } catch (err: any) {
      console.error('Hiba a beszélgetések lekérdezése során:', err);
      setError(err.message);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült betölteni a beszélgetéseket.',
        variant: 'destructive',
      });
    } finally {
      setConversationsLoading(false);
    }
  }, [user, toast]);

  // Üzenetek lekérdezése egy adott beszélgetéshez
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Küldők lekérdezése
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: senders, error: sendersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', senderIds);

      if (sendersError) throw sendersError;

      // Senderek hozzárendelése a megfelelő üzenetekhez
      const sendersMap = senders.reduce((acc, sender) => {
        acc[sender.id] = sender;
        return acc;
      }, {});

      // Üzenetek formázása a küldőkkel
      const formattedMessages = data.map(message => ({
        ...message,
        sender: sendersMap[message.sender_id] ? {
          id: sendersMap[message.sender_id].id || '',
          first_name: sendersMap[message.sender_id].first_name || '',
          last_name: sendersMap[message.sender_id].last_name || '',
          avatar_url: sendersMap[message.sender_id].avatar_url || ''
        } : {
          id: message.sender_id || '',
          first_name: '',
          last_name: '',
          avatar_url: ''
        }
      }));

      setMessages(formattedMessages || []);
      setCurrentConversation(conversationId);

      // Olvasottnak jelöljük a nem saját üzeneteket
      await markMessagesAsRead(conversationId);
    } catch (err: any) {
      console.error('Hiba az üzenetek lekérdezése során:', err);
      setError(err.message);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült betölteni az üzeneteket.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Új üzenet küldése
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user || !conversationId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim()
        })
        .select();

      if (error) throw error;

      // Frissítjük a helyi üzenetlistát
      setRefreshTrigger(prev => prev + 1);
      
      return data[0];
    } catch (err: any) {
      console.error('Hiba az üzenet küldése során:', err);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült elküldeni az üzenetet.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Üzenetek olvasottnak jelölése
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Frissítjük a beszélgetéseket, hogy az olvasatlan üzenetek száma frissüljön
      setRefreshTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error('Hiba az üzenetek olvasottnak jelölése során:', err);
    }
  }, [user]);

  // Új beszélgetés létrehozása
  const createConversation = useCallback(async (otherUserId: string) => {
    if (!user || !otherUserId) return null;

    try {
      // Ellenőrizzük, hogy létezik-e már beszélgetés a két felhasználó között
      const { data: existingConversation, error: checkError } = await supabase
        .rpc('create_conversation', {
          user1_id: user.id,
          user2_id: otherUserId
        });

      if (checkError) throw checkError;

      // Frissítjük a beszélgetéseket
      setRefreshTrigger(prev => prev + 1);
      
      return existingConversation;
    } catch (err: any) {
      console.error('Hiba a beszélgetés létrehozása során:', err);
      toast({
        title: 'Hiba történt',
        description: 'Nem sikerült létrehozni a beszélgetést.',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  // Beszélgetések frissítése a refreshTrigger változásakor
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshTrigger]);

  // Üzenetek frissítése a currentConversation vagy refreshTrigger változásakor
  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation);
    }
  }, [currentConversation, fetchMessages, refreshTrigger]);

  // Valós idejű frissítések beállítása
  useEffect(() => {
    if (!user) return;

    // Feliratkozás az új üzenetekre
    const messagesSubscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=in.(${conversations.map(c => c.id).join(',')})`,
      }, (payload) => {
        setRefreshTrigger(prev => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [user, conversations]);

  return {
    conversations,
    messages,
    currentConversation,
    loading,
    conversationsLoading,
    error,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markMessagesAsRead,
    createConversation,
    setCurrentConversation
  };
};
